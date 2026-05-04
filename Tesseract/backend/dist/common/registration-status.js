"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegistrationStatus = getRegistrationStatus;
function getRegistrationStatus(event) {
    const now = new Date();
    if (now > event.endsAt)
        return "closed";
    if (now >= event.startsAt && !event.allowLateRegistration)
        return "closed";
    if (event.registrationStartDate && now < event.registrationStartDate)
        return "not_started";
    if (event.registrationEndDate && now > event.registrationEndDate)
        return "closed";
    if (event.capacity > 0 && event.registeredCount >= event.capacity)
        return "full";
    return "open";
}
//# sourceMappingURL=registration-status.js.map