import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
const DEFAULT_ATTENDANCE_TOKEN_EXPIRES_IN = (process.env.ATTENDANCE_TOKEN_EXPIRES_IN || '90d');
let runtimeAttendanceJwtSecret = null;
let ephemeralAttendanceJwtSecret = null;
const runtimePreviousAttendanceSecrets = new Set();
let warnedAboutTemporarySecret = false;
function getConfiguredAttendanceJwtSecret() {
    return runtimeAttendanceJwtSecret ?? undefined;
}
export function getAttendanceJwtSecret() {
    const secret = getConfiguredAttendanceJwtSecret();
    if (secret) {
        return secret;
    }
    if (!warnedAboutTemporarySecret) {
        warnedAboutTemporarySecret = true;
        logger.warn('Attendance secret is missing. Using an ephemeral in-memory fallback until a super admin sets attendanceJwtSecret in settings.');
    }
    if (!ephemeralAttendanceJwtSecret) {
        ephemeralAttendanceJwtSecret = randomBytes(32).toString('hex');
    }
    return ephemeralAttendanceJwtSecret;
}
export function setRuntimeAttendanceJwtSecret(secret) {
    const normalized = secret?.trim() || null;
    if (runtimeAttendanceJwtSecret && normalized && runtimeAttendanceJwtSecret !== normalized) {
        runtimePreviousAttendanceSecrets.add(runtimeAttendanceJwtSecret);
    }
    runtimeAttendanceJwtSecret = normalized;
    if (normalized) {
        runtimePreviousAttendanceSecrets.delete(normalized);
    }
    warnedAboutTemporarySecret = false;
}
export function hasRuntimeAttendanceJwtSecret() {
    return Boolean(runtimeAttendanceJwtSecret);
}
function getAttendanceVerificationSecrets() {
    const attendanceSecret = getAttendanceJwtSecret();
    const runtimePreviousSecrets = Array.from(runtimePreviousAttendanceSecrets)
        .filter((secret) => secret !== attendanceSecret);
    return Array.from(new Set([attendanceSecret, ...runtimePreviousSecrets]));
}
function verifyAttendancePayload(token, secret) {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (decoded.purpose !== 'attendance') {
        throw new Error('Invalid token purpose');
    }
    return decoded;
}
export function generateAttendanceToken(userId, eventId, registrationId) {
    return jwt.sign({ userId, eventId, registrationId, purpose: 'attendance' }, getAttendanceJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: DEFAULT_ATTENDANCE_TOKEN_EXPIRES_IN,
    });
}
export function verifyAttendanceToken(token) {
    let lastError;
    for (const secret of getAttendanceVerificationSecrets()) {
        try {
            return verifyAttendancePayload(token, secret);
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }
    throw lastError || new Error('Invalid attendance token');
}
