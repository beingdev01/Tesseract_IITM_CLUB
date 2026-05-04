/**
 * Updates the status of events based on their start and end dates.
 * - UPCOMING -> ONGOING (if startDate <= now)
 * - ONGOING -> PAST (if endDate < now)
 * - UPCOMING -> PAST (if endDate < now - e.g. missed update)
 */
export declare function updateEventStatuses(): Promise<{
    toOngoing: number;
    toPastFromOngoing: number;
    toPastFromUpcoming: number;
}>;
