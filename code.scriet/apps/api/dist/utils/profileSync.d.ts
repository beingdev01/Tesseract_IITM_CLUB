/**
 * Syncs User profile data to the linked TeamMember record.
 *
 * Only writes to TeamMember fields that are currently null (i.e., not manually
 * overridden). TeamMember data always takes priority.
 *
 * This is fire-and-forget: errors are logged but never thrown, so the
 * caller's primary operation is never disrupted.
 */
export declare function syncUserToTeamMember(userId: string): Promise<void>;
/**
 * Syncs User profile data to the linked NetworkProfile record.
 *
 * Currently syncs `bio` only (other fields don't overlap meaningfully).
 * Same conservative approach: only writes to null NetworkProfile fields.
 */
export declare function syncUserToNetworkProfile(userId: string): Promise<void>;
