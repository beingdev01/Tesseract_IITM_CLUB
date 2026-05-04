/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param content - Raw HTML/Markdown content to sanitize
 * @returns Sanitized HTML string
 */
export declare function sanitizeHtml(content: string | null | undefined): string;
/**
 * Sanitizes content specifically for Markdown rendering
 * Allows a subset of HTML that's commonly embedded in Markdown
 * @param content - Raw Markdown content that may contain HTML
 * @returns Sanitized content
 */
export declare function sanitizeMarkdown(content: string | null | undefined): string;
/**
 * Sanitizes a plain text field (no HTML allowed)
 * Strips all HTML tags but keeps text content
 * @param content - Raw text content
 * @returns Plain text without HTML
 */
export declare function sanitizeText(content: string | null | undefined): string;
/**
 * Escapes HTML-reserved characters so a value can be safely embedded
 * inside HTML text nodes OR attribute values (double-quoted).
 * Use this for every interpolation into email templates and any other
 * server-generated HTML — DOMPurify strips tags but does not escape entities.
 * @param value - Raw string to escape
 * @returns Escaped string safe for HTML/attribute context
 */
export declare function escapeHtml(value: string | null | undefined): string;
/**
 * Sanitizes a URL to ensure it's safe
 * @param url - Raw URL string
 * @returns Sanitized URL or empty string if invalid
 */
export declare function sanitizeUrl(url: string | null | undefined): string;
/**
 * Sanitizes an object's string fields recursively
 * Useful for sanitizing entire request bodies
 * @param obj - Object to sanitize
 * @param richFields - Field names that should allow HTML (use sanitizeHtml)
 * @returns New object with sanitized strings
 */
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T, richFields?: string[]): T;
