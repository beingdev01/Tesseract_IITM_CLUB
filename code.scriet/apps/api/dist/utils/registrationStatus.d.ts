type RegistrationStatus = 'open' | 'not_started' | 'closed' | 'full';
export interface RegistrationStatusEventInput {
    startDate: Date;
    endDate: Date | null;
    registrationStartDate: Date | null;
    registrationEndDate: Date | null;
    allowLateRegistration: boolean;
    capacity: number | null;
}
export declare const getRegistrationStatus: (event: RegistrationStatusEventInput, registrationsCount: number, now?: Date) => RegistrationStatus;
export {};
