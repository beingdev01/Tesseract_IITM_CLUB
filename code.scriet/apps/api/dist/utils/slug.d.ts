/**
 * Slug Generation Utility
 * Converts event titles to URL-friendly slugs
 */
/**
 * Generate a URL-friendly slug from a string
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export declare function generateSlug(text: string): string;
/**
 * Generate a unique slug by appending a number if needed
 * @param baseSlug The base slug generated from title
 * @param existingSlugs Array of slugs already in use
 * @returns A unique slug
 */
export declare function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string;
