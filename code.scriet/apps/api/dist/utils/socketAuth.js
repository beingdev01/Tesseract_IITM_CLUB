import { prisma } from '../lib/prisma.js';
import { verifyToken } from './jwt.js';
function extractSocketToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.trim();
    }
    const authorizationHeader = socket.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
        return authorizationHeader.slice(7).trim();
    }
    return null;
}
export async function authenticateSocketConnection(socket, options = {}) {
    const token = extractSocketToken(socket);
    if (!token) {
        throw new Error('AUTH_REQUIRED');
    }
    let decodedUserId;
    try {
        decodedUserId = verifyToken(token).userId;
    }
    catch {
        throw new Error('AUTH_INVALID');
    }
    const authUser = await prisma.user.findUnique({
        where: { id: decodedUserId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });
    if (!authUser) {
        throw new Error('AUTH_INVALID');
    }
    if (options.requireAdmin && !['ADMIN', 'PRESIDENT'].includes(authUser.role)) {
        throw new Error('FORBIDDEN');
    }
    socket.data.authUser = authUser;
    return authUser;
}
