import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Generate a JWT-based attendance token for QR code scanning.
 * Token encodes the userId, eventId, and registrationId with a
 * `purpose: "attendance"` claim to prevent misuse as an auth token.
 */
export function generateAttendanceToken(userId: string, eventId: string, registrationId: string): string {
  return jwt.sign(
    {
      sub: userId,
      eventId,
      registrationId,
      purpose: "attendance"
    },
    env.jwtSecret,
    { expiresIn: "90d" }
  );
}

export interface AttendanceTokenPayload {
  sub: string;
  eventId: string;
  registrationId: string;
  purpose: "attendance";
}

/**
 * Verify and decode an attendance token.
 * Returns null if the token is invalid or not an attendance token.
 */
export function verifyAttendanceToken(token: string): AttendanceTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as Record<string, unknown>;
    if (payload.purpose !== "attendance") return null;
    return payload as unknown as AttendanceTokenPayload;
  } catch {
    return null;
  }
}
