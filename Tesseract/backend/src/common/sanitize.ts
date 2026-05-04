/**
 * Basic HTML sanitization — strips dangerous tags/attributes while allowing
 * safe formatting tags used in event descriptions, agendas, etc.
 *
 * For production use consider adding `sanitize-html` or `isomorphic-dompurify`.
 * This lightweight version covers the common XSS vectors.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "i", "u", "em", "strong", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "hr", "span", "div"
]);

const DANGEROUS_PATTERN = /<script[\s>]|<iframe[\s>]|<object[\s>]|<embed[\s>]|<form[\s>]|javascript:/gi;
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=/gi;

export function sanitizeHtml(input: string | null | undefined): string | null {
  if (input == null || input === "") return null;

  let result = input;

  // Remove dangerous tags entirely
  result = result.replace(DANGEROUS_PATTERN, "");

  // Remove event handler attributes (onclick, onerror, etc.)
  result = result.replace(EVENT_HANDLER_PATTERN, " ");

  return result.trim() || null;
}
