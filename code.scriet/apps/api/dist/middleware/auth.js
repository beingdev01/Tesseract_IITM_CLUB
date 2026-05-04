import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../utils/jwt.js';
// Helper to get auth user from request
export const getAuthUser = (req) => {
    return req.authUser;
};
// Helper to get required auth user (throws if not present)
export const requireAuthUser = (req) => {
    const user = req.authUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user;
};
/** Extract token from Bearer header OR tesseract_session cookie */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    const cookies = req.headers.cookie;
    if (cookies) {
        const match = cookies.split(';').find(c => c.trim().startsWith('tesseract_session='));
        if (match) {
            return decodeURIComponent(match.split('=').slice(1).join('=').trim());
        }
    }
    return null;
}
const authMiddlewareImpl = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        const userId = typeof decoded.userId === 'string'
            ? decoded.userId
            : typeof decoded.id === 'string'
                ? decoded.id
                : null;
        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }
        // Reject attendance QR tokens — they share the signing key but must not grant auth
        if (decoded.purpose === 'attendance') {
            return res.status(401).json({ error: 'Attendance tokens cannot be used for authentication' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                profileCompleted: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Assign auth user to custom property
        req.authUser = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Cast to RequestHandler to fix Express type compatibility
export const authMiddleware = authMiddlewareImpl;
const optionalAuthMiddlewareImpl = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return next();
        }
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        const userId = typeof decoded.userId === 'string'
            ? decoded.userId
            : typeof decoded.id === 'string'
                ? decoded.id
                : null;
        if (!userId) {
            return next();
        }
        // Skip attendance QR tokens — they share the signing key but must not grant auth
        if (decoded.purpose === 'attendance') {
            return next();
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                profileCompleted: true,
            },
        });
        if (user) {
            req.authUser = user;
        }
        next();
    }
    catch (error) {
        next();
    }
};
// Cast to RequestHandler to fix Express type compatibility
export const optionalAuthMiddleware = optionalAuthMiddlewareImpl;
