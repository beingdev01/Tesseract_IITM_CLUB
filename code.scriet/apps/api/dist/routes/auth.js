import { Router } from 'express';
import passport from 'passport';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { socketEvents } from '../utils/socket.js';
import { logger } from '../utils/logger.js';
import { signAccessToken, signOAuthExchangeCode, verifyOAuthExchangeCode } from '../utils/jwt.js';
import { auditLog } from '../utils/audit.js';
import { ApiResponse, ErrorCodes } from '../utils/response.js';
import { getBranchFromEmail, isIitmEmail } from '../utils/iitmDomain.js';
import { InvalidDomainError } from '../config/passport.js';
export const authRouter = Router();
const isDevLoginEnabled = () => process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_AUTH === 'true';
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_AUTH === 'true') {
    logger.warn('ENABLE_DEV_AUTH is true in production env; dev login route remains disabled by code guard.');
}
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const buildAuthCallbackUrl = (code) => {
    const callbackUrl = new URL('/auth/callback', getFrontendUrl());
    callbackUrl.searchParams.set('code', code);
    return callbackUrl.toString();
};
const getCookie = (req, name) => {
    const cookies = req.headers.cookie;
    if (!cookies)
        return undefined;
    const match = cookies.split(';').find(c => c.trim().startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=').trim()) : undefined;
};
const generateToken = (user) => signAccessToken({
    userId: user.id,
    id: user.id,
    name: user.name || undefined,
    email: user.email,
    role: user.role,
});
const cookieDomain = () => {
    const value = process.env.COOKIE_DOMAIN?.trim();
    return value ? value : undefined;
};
const setSessionCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    const domain = cookieDomain();
    res.cookie('tesseract_session', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        ...(domain ? { domain } : {}),
        path: '/',
    });
};
const clearSessionCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const domain = cookieDomain();
    res.clearCookie('tesseract_session', {
        secure: isProd,
        sameSite: 'lax',
        ...(domain ? { domain } : {}),
        path: '/',
    });
};
const normalizeNetworkType = (value) => (value === 'professional' || value === 'alumni' ? value : undefined);
const withSuperAdmin = (user) => ({
    ...user,
    isSuperAdmin: !!process.env.SUPER_ADMIN_EMAIL && user.email === process.env.SUPER_ADMIN_EMAIL,
});
const demoteOrphanNetworkUser = async (user) => {
    if (user.role !== 'NETWORK') {
        return user;
    }
    const profile = await prisma.networkProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
    });
    if (profile) {
        return user;
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'USER' },
    });
    logger.warn('Demoted NETWORK user without profile to USER', { userId: user.id });
    return { ...user, role: 'USER' };
};
const devLoginSchema = z.object({
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    name: z.string().trim().min(1).max(100).optional(),
});
const exchangeCodeSchema = z.object({
    code: z.string().trim().regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, 'Invalid authorization code'),
});
authRouter.get('/providers', (_req, res) => {
    res.json({
        google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id'),
        github: false,
        devLogin: isDevLoginEnabled(),
        emailPassword: false,
    });
});
authRouter.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id') {
        return res.redirect(`${getFrontendUrl()}/signin?error=google_not_configured`);
    }
    const intent = req.query.intent;
    const networkType = normalizeNetworkType(req.query.type);
    if (intent === 'network') {
        res.cookie('oauth_intent', 'network', {
            maxAge: 5 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
        if (networkType) {
            res.cookie('network_type', networkType, {
                maxAge: 5 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
        }
    }
    else {
        res.clearCookie('oauth_intent');
        res.clearCookie('network_type');
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
const handleGoogleCallback = async (req, res) => {
    const errorRedirect = `${getFrontendUrl()}/signin?error=google_auth_failed`;
    try {
        const passportUser = req.user;
        if (!passportUser?.id) {
            return res.redirect(errorRedirect);
        }
        let user = await prisma.user.findUnique({
            where: { id: passportUser.id },
            select: { id: true, name: true, email: true, role: true, branch: true },
        });
        if (!user) {
            return res.redirect(errorRedirect);
        }
        const intent = getCookie(req, 'oauth_intent');
        const networkType = normalizeNetworkType(getCookie(req, 'network_type'));
        res.clearCookie('oauth_intent');
        res.clearCookie('network_type');
        const isNetworkIntent = intent === 'network';
        if (!isNetworkIntent) {
            user = await demoteOrphanNetworkUser(user);
        }
        const isNetworkUpgrade = isNetworkIntent && (user.role === 'USER' || user.role === 'PUBLIC');
        if (isNetworkUpgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'NETWORK' },
            });
            user.role = 'NETWORK';
        }
        const token = generateToken(user);
        setSessionCookie(res, token);
        const code = signOAuthExchangeCode({
            userId: user.id,
            intent: isNetworkIntent ? 'network' : undefined,
            networkType: isNetworkIntent ? networkType : undefined,
        });
        await auditLog(user.id, 'LOGIN', 'auth', user.id, {
            provider: 'google',
            intent: isNetworkIntent ? 'network' : 'standard',
        });
        return res.redirect(buildAuthCallbackUrl(code));
    }
    catch (error) {
        logger.error('google callback error:', { error: error instanceof Error ? error.message : String(error) });
        return res.redirect(errorRedirect);
    }
};
// Custom passport.authenticate so we can map InvalidDomainError → 403 redirect.
authRouter.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
        if (err instanceof InvalidDomainError || (err && err.code === 'INVALID_DOMAIN')) {
            return res.redirect(`${getFrontendUrl()}/signin?error=invalid_domain`);
        }
        if (err || !user) {
            return res.redirect(`${getFrontendUrl()}/signin?error=google_auth_failed`);
        }
        req.user = user;
        return handleGoogleCallback(req, res);
    })(req, res, next);
});
authRouter.post('/dev-login', async (req, res) => {
    if (!isDevLoginEnabled()) {
        return res.status(404).json({ error: 'Not found' });
    }
    const validation = devLoginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
    }
    const { email, name } = validation.data;
    if (!isIitmEmail(email)) {
        return ApiResponse.error(res, {
            code: 'INVALID_DOMAIN',
            message: 'Only @ds.study.iitm.ac.in and @es.study.iitm.ac.in accounts are allowed',
            status: 403,
        });
    }
    try {
        const derivedBranch = getBranchFromEmail(email);
        let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            user = await prisma.user.create({
                data: {
                    name: name || email.split('@')[0],
                    email,
                    oauthProvider: 'dev',
                    oauthId: `dev_${randomUUID()}`,
                    role: 'USER',
                    branch: derivedBranch ?? undefined,
                },
            });
        }
        else if (!user.branch && derivedBranch) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { branch: derivedBranch },
            });
        }
        user = await demoteOrphanNetworkUser(user);
        // Mirror the SEED_ADMIN promotion logic from passport so dev-login behaves
        // identically to a real OAuth flow.
        const seedEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
        if (seedEmail && email === seedEmail && user.role !== 'ADMIN' && user.role !== 'PRESIDENT') {
            user = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
        }
        const token = generateToken(user);
        if (isNewUser) {
            socketEvents.userCreated(user.id);
        }
        setSessionCookie(res, token);
        return ApiResponse.success(res, {
            token,
            user: withSuperAdmin({ id: user.id, name: user.name, email: user.email, role: user.role, branch: user.branch }),
        });
    }
    catch (error) {
        logger.error('Dev login error:', { error: error instanceof Error ? error.message : String(error) });
        return ApiResponse.error(res, { code: ErrorCodes.INTERNAL_ERROR, message: 'Login failed', status: 500 });
    }
});
authRouter.get('/me', authMiddleware, (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.json({ success: true, data: null });
    }
    // Issue a fresh token so cross-origin callers (cookie-only) can pick up a JWT.
    const token = generateToken(authUser);
    res.json({ success: true, data: withSuperAdmin(authUser), token });
});
authRouter.post('/exchange-code', async (req, res) => {
    const parsed = exchangeCodeSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid authorization code' });
    }
    let payload;
    try {
        payload = verifyOAuthExchangeCode(parsed.data.code);
    }
    catch {
        return res.status(400).json({ error: 'Authorization code expired or invalid' });
    }
    try {
        const fetchedUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                phone: true,
                course: true,
                branch: true,
                year: true,
                level: true,
                profileCompleted: true,
            },
        });
        if (!fetchedUser) {
            return res.status(401).json({ error: 'User not found' });
        }
        const authUser = payload.intent === 'network'
            ? fetchedUser
            : await demoteOrphanNetworkUser(fetchedUser);
        const token = generateToken(authUser);
        setSessionCookie(res, token);
        return res.json({
            token,
            intent: payload.intent,
            network_type: payload.networkType,
        });
    }
    catch (error) {
        logger.error('OAuth code exchange error:', { error: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ error: 'Authorization code exchange failed' });
    }
});
authRouter.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully' });
});
