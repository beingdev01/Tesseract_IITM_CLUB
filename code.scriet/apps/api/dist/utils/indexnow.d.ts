/**
 * Submit a single URL to IndexNow (fire-and-forget).
 * Logs success/failure but never throws.
 */
export declare function submitUrl(path: string): void;
/**
 * Submit multiple URLs to IndexNow in a single batch (up to 10,000).
 * Returns { submitted, status } on success, or throws on network error.
 */
export declare function submitUrls(paths: string[]): Promise<{
    submitted: number;
    status: number;
}>;
/**
 * Collect all indexable URLs from the database and submit them to IndexNow.
 */
export declare function submitAllUrls(): Promise<{
    submitted: number;
    status: number;
    urls: string[];
}>;
