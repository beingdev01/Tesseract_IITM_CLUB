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
export declare function getRegistrationStatus(event: RegistrationStatusInput): RegistrationStatus;
export {};
