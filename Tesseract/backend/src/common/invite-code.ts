import { randomBytes } from "crypto";

/**
 * Generate an 8-character uppercase hex invite code for team registration.
 * Matches code.scriet's invite code format.
 */
export function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
