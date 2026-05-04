import { AppError } from "./app-error";

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

/**
 * Sanitize registration field definitions from event creator input.
 * Ensures each field has a valid structure.
 */
export function sanitizeRegistrationFields(fields: unknown): RegistrationFieldDefinition[] {
  if (!Array.isArray(fields)) return [];

  const validTypes: RegistrationFieldType[] = ["text", "number", "email", "select", "checkbox", "textarea"];

  return fields
    .filter((f): f is Record<string, unknown> => f != null && typeof f === "object")
    .slice(0, 20) // cap at 20 fields
    .map((f) => ({
      id: typeof f.id === "string" ? f.id.trim().slice(0, 64) : crypto.randomUUID(),
      label: typeof f.label === "string" ? f.label.trim().slice(0, 200) : "Untitled Field",
      type: validTypes.includes(f.type as RegistrationFieldType) ? (f.type as RegistrationFieldType) : "text",
      required: typeof f.required === "boolean" ? f.required : false,
      ...(Array.isArray(f.options) ? { options: f.options.filter((o: unknown) => typeof o === "string").slice(0, 50) } : {}),
      ...(typeof f.placeholder === "string" ? { placeholder: f.placeholder.slice(0, 200) } : {}),
      ...(typeof f.maxLength === "number" ? { maxLength: Math.min(f.maxLength, 5000) } : {})
    }));
}

/**
 * Validate field submissions against the event's registration field schema.
 * Throws AppError if required fields are missing or values are invalid.
 */
export function validateRegistrationFieldSubmissions(
  schema: RegistrationFieldDefinition[],
  submissions: unknown
): RegistrationFieldSubmission[] {
  if (!schema.length) return [];

  const submissionArray = Array.isArray(submissions) ? submissions : [];
  const submissionMap = new Map<string, unknown>();
  for (const s of submissionArray) {
    if (s && typeof s === "object" && "fieldId" in s) {
      submissionMap.set(String((s as { fieldId: unknown }).fieldId), (s as { value: unknown }).value);
    }
  }

  const validated: RegistrationFieldSubmission[] = [];
  const errors: string[] = [];

  for (const field of schema) {
    const value = submissionMap.get(field.id);

    if (field.required && (value == null || value === "")) {
      errors.push(`Field "${field.label}" is required`);
      continue;
    }

    if (value == null || value === "") continue;

    switch (field.type) {
      case "email":
        if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`Field "${field.label}" must be a valid email`);
          continue;
        }
        break;
      case "number":
        if (typeof value !== "number" && (typeof value !== "string" || isNaN(Number(value)))) {
          errors.push(`Field "${field.label}" must be a number`);
          continue;
        }
        break;
      case "select":
        if (field.options && !field.options.includes(String(value))) {
          errors.push(`Field "${field.label}" has an invalid selection`);
          continue;
        }
        break;
      case "checkbox":
        // Accept boolean values
        break;
      default:
        if (typeof value === "string" && field.maxLength && value.length > field.maxLength) {
          errors.push(`Field "${field.label}" exceeds maximum length of ${field.maxLength}`);
          continue;
        }
        break;
    }

    validated.push({ fieldId: field.id, value });
  }

  if (errors.length > 0) {
    throw new AppError("validation_error", errors.join("; "), 422, { fieldErrors: errors });
  }

  return validated;
}
