/**
 * Start the reminder scheduler
 * Checks every 6 hours for events needing reminders
 */
export declare function startReminderScheduler(): void;
/**
 * Stop the reminder scheduler
 */
export declare function stopReminderScheduler(): void;
/**
 * Manually trigger reminder check (for testing/admin)
 */
export declare function triggerReminderCheck(): Promise<{
    sent: number;
    events: string[];
}>;
