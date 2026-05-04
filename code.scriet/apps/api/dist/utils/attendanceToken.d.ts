interface AttendancePayload {
    userId: string;
    eventId: string;
    registrationId: string;
    purpose: 'attendance';
}
export declare function getAttendanceJwtSecret(): string;
export declare function setRuntimeAttendanceJwtSecret(secret: string | null | undefined): void;
export declare function hasRuntimeAttendanceJwtSecret(): boolean;
export declare function generateAttendanceToken(userId: string, eventId: string, registrationId: string): string;
export declare function verifyAttendanceToken(token: string): AttendancePayload;
export {};
