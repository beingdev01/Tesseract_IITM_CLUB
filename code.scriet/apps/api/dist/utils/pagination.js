export const parsePaginationNumber = (input, fallback, { min, max }) => {
    if (input === undefined) {
        return fallback;
    }
    const parsed = Number.parseInt(String(input), 10);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return null;
    }
    return parsed;
};
