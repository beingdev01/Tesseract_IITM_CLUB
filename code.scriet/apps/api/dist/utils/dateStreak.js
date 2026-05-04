const normalizeDate = (value) => {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};
export const calculateConsecutiveDailyStreak = (dates, referenceDate = new Date()) => {
    if (dates.length === 0) {
        return 0;
    }
    const uniqueDescendingDates = Array.from(new Set(dates.map((date) => normalizeDate(date).getTime()))).sort((a, b) => b - a);
    const startDate = normalizeDate(referenceDate);
    let streak = 0;
    for (let i = 0; i < uniqueDescendingDates.length; i++) {
        const expectedDate = new Date(startDate);
        expectedDate.setDate(startDate.getDate() - i);
        if (uniqueDescendingDates[i] !== expectedDate.getTime()) {
            break;
        }
        streak += 1;
    }
    return streak;
};
