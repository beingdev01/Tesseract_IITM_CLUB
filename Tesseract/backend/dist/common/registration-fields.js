"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRegistrationFields = sanitizeRegistrationFields;
exports.validateRegistrationFieldSubmissions = validateRegistrationFieldSubmissions;
const app_error_1 = require("./app-error");
function sanitizeRegistrationFields(fields) {
    if (!Array.isArray(fields))
        return [];
    const validTypes = ["text", "number", "email", "select", "checkbox", "textarea"];
    return fields
        .filter((f) => f != null && typeof f === "object")
        .slice(0, 20)
        .map((f) => ({
        id: typeof f.id === "string" ? f.id.trim().slice(0, 64) : crypto.randomUUID(),
        label: typeof f.label === "string" ? f.label.trim().slice(0, 200) : "Untitled Field",
        type: validTypes.includes(f.type) ? f.type : "text",
        required: typeof f.required === "boolean" ? f.required : false,
        ...(Array.isArray(f.options) ? { options: f.options.filter((o) => typeof o === "string").slice(0, 50) } : {}),
        ...(typeof f.placeholder === "string" ? { placeholder: f.placeholder.slice(0, 200) } : {}),
        ...(typeof f.maxLength === "number" ? { maxLength: Math.min(f.maxLength, 5000) } : {})
    }));
}
function validateRegistrationFieldSubmissions(schema, submissions) {
    if (!schema.length)
        return [];
    const submissionArray = Array.isArray(submissions) ? submissions : [];
    const submissionMap = new Map();
    for (const s of submissionArray) {
        if (s && typeof s === "object" && "fieldId" in s) {
            submissionMap.set(String(s.fieldId), s.value);
        }
    }
    const validated = [];
    const errors = [];
    for (const field of schema) {
        const value = submissionMap.get(field.id);
        if (field.required && (value == null || value === "")) {
            errors.push(`Field "${field.label}" is required`);
            continue;
        }
        if (value == null || value === "")
            continue;
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
        throw new app_error_1.AppError("validation_error", errors.join("; "), 422, { fieldErrors: errors });
    }
    return validated;
}
//# sourceMappingURL=registration-fields.js.map