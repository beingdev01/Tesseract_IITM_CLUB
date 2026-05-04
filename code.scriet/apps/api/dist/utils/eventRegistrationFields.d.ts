export declare const REGISTRATION_FIELD_TYPES: readonly ["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "URL"];
export type RegistrationFieldType = (typeof REGISTRATION_FIELD_TYPES)[number];
export interface EventRegistrationFieldDefinition {
    id: string;
    label: string;
    type: RegistrationFieldType;
    required: boolean;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
}
export interface RegistrationFieldSubmission {
    fieldId: string;
    value: string;
}
export interface RegistrationFieldResponse {
    fieldId: string;
    label: string;
    value: string;
}
export declare function sanitizeEventRegistrationFields(input: unknown): EventRegistrationFieldDefinition[];
export declare function validateRegistrationFieldSubmissions(fields: EventRegistrationFieldDefinition[], submissions: unknown): {
    errors: string[];
    responses: RegistrationFieldResponse[];
};
