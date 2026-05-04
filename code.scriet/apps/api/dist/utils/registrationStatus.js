export const getRegistrationStatus = (event, registrationsCount, now = new Date()) => {
    if (event.registrationStartDate && now < event.registrationStartDate) {
        return 'not_started';
    }
    const eventEndBoundary = event.endDate ?? event.startDate;
    const registrationCloseBoundary = event.registrationEndDate
        ?? (event.allowLateRegistration ? eventEndBoundary : event.startDate);
    if (now > registrationCloseBoundary) {
        return 'closed';
    }
    if (event.capacity && registrationsCount >= event.capacity) {
        return 'full';
    }
    return 'open';
};
