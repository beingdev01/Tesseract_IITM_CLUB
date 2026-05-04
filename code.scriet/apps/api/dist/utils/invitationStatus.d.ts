import type { InvitationStatus } from '@prisma/client';
export type DerivedInvitationStatus = InvitationStatus | 'EXPIRED';
export declare function getEffectiveEventEnd(event: {
    startDate: Date;
    endDate: Date | null;
}): Date;
export declare function deriveInvitationStatus(invitation: {
    status: InvitationStatus;
    event: {
        startDate: Date;
        endDate: Date | null;
    };
}): DerivedInvitationStatus;
