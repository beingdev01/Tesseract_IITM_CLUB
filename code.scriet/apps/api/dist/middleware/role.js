import { getAuthUser } from './auth.js';
// ISSUE-044: Role hierarchy documentation
// Level 0: PUBLIC (unauthenticated users)
// Level 1: USER/NETWORK (registered users, network members)
// Level 2: MEMBER (club members)
// Level 3: CORE_MEMBER (core team)
// Level 4: ADMIN/PRESIDENT (administrators)
const roleHierarchy = {
    PUBLIC: 0,
    USER: 1,
    NETWORK: 1,
    MEMBER: 2,
    CORE_MEMBER: 3,
    ADMIN: 4,
    PRESIDENT: 4,
};
export const hasPermission = (userRole, requiredRole) => {
    const knownRole = roleHierarchy[userRole];
    // ISSUE-037: Log warning when unknown role is encountered
    if (knownRole === undefined) {
        console.error(`[role.ts] Unknown role "${userRole}" treated as PUBLIC (level 0)`);
    }
    const userLevel = knownRole ?? 0;
    const requiredLevel = roleHierarchy[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
};
export const requireRole = (minRole) => {
    return ((req, res, next) => {
        const authUser = getAuthUser(req);
        if (!authUser) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!hasPermission(authUser.role, minRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    });
};
