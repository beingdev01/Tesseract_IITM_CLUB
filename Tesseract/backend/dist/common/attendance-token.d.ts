export declare function generateAttendanceToken(userId: string, eventId: string, registrationId: string): string;
export interface AttendanceTokenPayload {
    sub: string;
    eventId: string;
    registrationId: string;
    purpose: "attendance";
}
export declare function verifyAttendanceToken(token: string): AttendanceTokenPayload | null;
