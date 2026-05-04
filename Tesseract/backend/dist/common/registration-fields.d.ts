export type RegistrationFieldType = "text" | "number" | "email" | "select" | "checkbox" | "textarea";
export interface RegistrationFieldDefinition {
    id: string;
    label: string;
    type: RegistrationFieldType;
    required: boolean;
    options?: string[];
    placeholder?: string;
    maxLength?: number;
}
export interface RegistrationFieldSubmission {
    fieldId: string;
    value: unknown;
}
export declare function sanitizeRegistrationFields(fields: unknown): RegistrationFieldDefinition[];
export declare function validateRegistrationFieldSubmissions(schema: RegistrationFieldDefinition[], submissions: unknown): RegistrationFieldSubmission[];
