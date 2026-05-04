import jwt from 'jsonwebtoken';
const INSECURE_DEFAULT_SECRETS = new Set([
    'secret',
    'your_super_secret_key_change_this_in_production',
]);
const JWT_SECRET_ENV_CANDIDATES = [
    'JWT_SECRET',
    'JWT_SECRET_KEY',
    'AUTH_JWT_SECRET',
    'AUTH_SECRET',
];
const DEV_FALLBACK_SECRET = 'dev_local_jwt_secret_change_me_before_production';
let hasWarnedAboutDevSecret = false;
const ACCESS_TOKEN_EXPIRES_IN = '7d';
const getConfiguredJwtSecret = () => {
    for (const key of JWT_SECRET_ENV_CANDIDATES) {
        const value = process.env[key]?.trim();
        if (value) {
            return value;
        }
    }
    return undefined;
};
export const getJwtSecret = () => {
    const secret = getConfiguredJwtSecret();
    const looksPlaceholder = Boolean(secret && secret.toLowerCase().includes('replace_with'));
    const isInsecure = !secret || INSECURE_DEFAULT_SECRETS.has(secret) || looksPlaceholder;
    if (!isInsecure) {
        return secret;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`JWT secret must be configured with a non-default value using one of: ${JWT_SECRET_ENV_CANDIDATES.join(', ')}`);
    }
    if (!hasWarnedAboutDevSecret) {
        hasWarnedAboutDevSecret = true;
        console.warn(`⚠️ Using development JWT fallback secret. Set one of ${JWT_SECRET_ENV_CANDIDATES.join(', ')} in your environment.`);
    }
    return DEV_FALLBACK_SECRET;
};
export const signAccessToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
};
export const signOAuthExchangeCode = (payload) => (jwt.sign({ ...payload, purpose: 'oauth_exchange' }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '30s' }));
export const signInvitationClaimToken = (payload) => (jwt.sign({ ...payload, purpose: 'invitation_claim' }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '30d' }));
export const verifyOAuthExchangeCode = (code) => {
    const decoded = jwt.verify(code, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded.purpose !== 'oauth_exchange' || typeof decoded.userId !== 'string') {
        throw new Error('Invalid authorization code');
    }
    return {
        userId: decoded.userId,
        intent: decoded.intent === 'network' ? 'network' : undefined,
        networkType: decoded.networkType === 'professional' || decoded.networkType === 'alumni'
            ? decoded.networkType
            : undefined,
    };
};
export const verifyInvitationClaimToken = (token) => {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded.purpose !== 'invitation_claim' ||
        typeof decoded.invitationId !== 'string' ||
        typeof decoded.email !== 'string') {
        throw new Error('Invalid invitation claim token');
    }
    return {
        invitationId: decoded.invitationId,
        email: decoded.email,
    };
};
export const verifyToken = (token) => {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded.purpose === 'attendance') {
        throw new Error('Attendance tokens cannot be used for authentication');
    }
    const userId = typeof decoded.userId === 'string'
        ? decoded.userId
        : typeof decoded.id === 'string'
            ? decoded.id
            : null;
    if (!userId || typeof decoded.email !== 'string' || typeof decoded.role !== 'string') {
        throw new Error('Invalid token payload');
    }
    return {
        userId,
        id: userId,
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
        email: decoded.email,
        role: decoded.role,
    };
};
