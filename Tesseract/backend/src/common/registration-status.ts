export type RegistrationStatus = "open" | "not_started" | "closed" | "full";

interface RegistrationStatusInput {
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  registeredCount: number;
  allowLateRegistration: boolean;
}

/**
 * Calculate the registration status for an event based on dates, capacity, and config.
 * Mirrors code.scriet's getRegistrationStatus utility.
 */
export function getRegistrationStatus(event: RegistrationStatusInput): RegistrationStatus {
  const now = new Date();

  // Event already ended
  if (now > event.endsAt) return "closed";

  // Event started and late registration is not allowed
  if (now >= event.startsAt && !event.allowLateRegistration) return "closed";

  // Registration hasn't started yet
  if (event.registrationStartDate && now < event.registrationStartDate) return "not_started";

  // Registration period has ended
  if (event.registrationEndDate && now > event.registrationEndDate) return "closed";

  // Capacity is full
  if (event.capacity > 0 && event.registeredCount >= event.capacity) return "full";

  return "open";
}
