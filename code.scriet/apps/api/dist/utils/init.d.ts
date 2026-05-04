export declare function initializeDatabase(): Promise<void>;
/**
 * Generate slugs for announcements that don't have them
 * Run this during startup to handle existing data
 */
export declare function populateAnnouncementSlugs(): Promise<void>;
export declare function populateProfileSlugs(): Promise<void>;
