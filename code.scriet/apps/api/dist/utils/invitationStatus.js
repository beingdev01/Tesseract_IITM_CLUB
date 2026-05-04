export function getEffectiveEventEnd(event) {
    return event.endDate ?? event.startDate;
}
export function deriveInvitationStatus(invitation) {
    if (invitation.status === 'PENDING' && getEffectiveEventEnd(invitation.event) < new Date()) {
        return 'EXPIRED';
    }
    return invitation.status;
}
