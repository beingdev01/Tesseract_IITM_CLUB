import React from 'react';
export declare function initFonts(): Promise<void>;
export declare function resetFontInitializationForTests(): void;
export interface CertData {
    recipientName: string;
    teamName?: string;
    eventName: string;
    type: string;
    position?: string;
    domain?: string;
    description?: string;
    certId: string;
    issuedAt: Date;
    signatoryName: string;
    signatoryTitle?: string;
    signatoryImageUrl?: string;
    facultyName?: string;
    facultyTitle?: string;
    facultySignatoryImageUrl?: string;
    clubLogoUrl?: string;
    institutionLogoUrl?: string;
}
export declare function formatPosition(pos: string): string;
export declare function buildDescription(data: CertData, type: string, hasEventName?: boolean): React.ReactNode[];
export declare function generateCertificatePDF(data: CertData): Promise<Buffer>;
