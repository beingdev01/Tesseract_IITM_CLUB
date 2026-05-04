import type { Event, EventInvitation as PrismaEventInvitation, NetworkProfile, User } from '@prisma/client';
export type EmailCategory = 'welcome' | 'event_creation' | 'registration' | 'announcement' | 'certificate' | 'reminder' | 'invitation' | 'admin_mail' | 'other';
export declare function invalidateNotificationSettingsCache(): void;
export declare function invalidateEmailTemplateConfigCache(): void;
interface EmailAttachment {
    content: string;
    name: string;
}
interface EmailOptions {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
    inlineImages?: Record<string, string>;
    category?: EmailCategory;
}
interface EmailTemplate {
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
    inlineImages?: Record<string, string>;
}
interface EventRegistrationContext {
    teamName?: string;
    teamRole?: 'LEADER' | 'MEMBER' | string;
}
declare function markdownToEmailHtml(markdown: string): string;
export declare const emailTemplateTestUtils: {
    markdownToEmailHtml: typeof markdownToEmailHtml;
};
type EventInvitationEmailContext = PrismaEventInvitation & {
    event: Pick<Event, 'title' | 'description' | 'shortDescription' | 'startDate' | 'endDate' | 'venue' | 'location' | 'imageUrl' | 'eventType'>;
    inviteeUser?: (Pick<User, 'email' | 'name'> & {
        networkProfile?: Pick<NetworkProfile, 'fullName' | 'designation' | 'company'> | null;
    }) | null;
};
export declare const EmailTemplates: {
    welcome: (name: string, clubName: string, customBody?: string, customFooter?: string) => EmailTemplate;
    eventRegistration: (name: string, eventTitle: string, eventDate: Date, eventSlug: string, location?: string, imageUrl?: string, attendanceToken?: string, context?: EventRegistrationContext) => Promise<EmailTemplate>;
    newAnnouncement: (title: string, body: string, priority: string, slug: string, shortDescription?: string, imageUrl?: string, tags?: string[], customIntro?: string, customFooter?: string) => EmailTemplate;
    newPoll: (question: string, slug: string, description?: string, deadline?: Date | null, allowMultipleChoices?: boolean, customIntro?: string, customFooter?: string) => EmailTemplate;
    newEvent: (title: string, description: string, startDate: Date, slug: string, shortDescription?: string, location?: string, imageUrl?: string, tags?: string[], eventType?: string, customIntro?: string, customFooter?: string) => EmailTemplate;
    passwordReset: (name: string, resetLink: string) => EmailTemplate;
    eventReminder: (name: string, eventTitle: string, eventDate: Date, eventSlug: string) => EmailTemplate;
    registrationOpens: (eventTitle: string, startDate: Date, slug: string, shortDescription?: string, imageUrl?: string) => EmailTemplate;
    hiringApplication: (name: string, email: string, applyingRole: string) => EmailTemplate;
    hiringSelected: (name: string, applyingRole: string) => EmailTemplate;
    hiringRejected: (name: string, applyingRole: string) => EmailTemplate;
    adminMail: (subject: string, body: string, bodyType?: "markdown" | "html") => EmailTemplate;
};
declare class EmailService {
    private configured;
    private apiKey;
    private fromEmail;
    private fromName;
    private replyToEmail;
    constructor();
    send(options: EmailOptions): Promise<boolean>;
    sendBulk(emails: string[], subject: string, html: string, text?: string, category?: EmailCategory): Promise<boolean>;
    private sendBatchMessageVersions;
    sendWelcome(email: string, name: string, clubName?: string): Promise<boolean>;
    sendEventRegistration(email: string, name: string, eventTitle: string, eventDate: Date, eventSlug: string, location?: string, imageUrl?: string, attendanceToken?: string, context?: EventRegistrationContext): Promise<boolean>;
    sendAnnouncementToAll(emails: string[], title: string, body: string, priority: string, slug: string, shortDescription?: string, imageUrl?: string, tags?: string[]): Promise<boolean>;
    sendPollToAll(emails: string[], question: string, slug: string, description?: string, deadline?: Date | null, allowMultipleChoices?: boolean): Promise<boolean>;
    sendNewEventToAll(emails: string[], title: string, description: string, startDate: Date, slug: string, shortDescription?: string, location?: string, imageUrl?: string, tags?: string[], eventType?: string): Promise<boolean>;
    sendEventInvitation(invitation: EventInvitationEmailContext): Promise<boolean>;
    sendEventInvitationWithdrawn(invitation: EventInvitationEmailContext): Promise<boolean>;
    sendPasswordReset(email: string, name: string, resetLink: string): Promise<boolean>;
    sendEventReminder(email: string, name: string, eventTitle: string, eventDate: Date, eventSlug: string): Promise<boolean>;
    sendRegistrationOpens(emails: string[], eventTitle: string, startDate: Date, slug: string, shortDescription?: string, imageUrl?: string): Promise<boolean>;
    sendHiringApplication(email: string, name: string, applyingRole: string): Promise<boolean>;
    sendHiringSelected(email: string, name: string, applyingRole: string): Promise<boolean>;
    sendHiringRejected(email: string, name: string, applyingRole: string): Promise<boolean>;
    sendNetworkWelcome(email: string, name: string, designation: string, company: string, connectionType: string): Promise<boolean>;
    sendNetworkVerified(email: string, name: string, designation: string, company: string, profileId: string): Promise<boolean>;
    sendNetworkRejected(email: string, name: string, reason?: string): Promise<boolean>;
    sendAlumniWelcome(email: string, name: string, designation: string, company: string, isVerified?: boolean, passoutYear?: number, branch?: string): Promise<boolean>;
    sendCertificateIssued(email: string, name: string, eventName: string, certId: string, downloadUrl: string): Promise<boolean>;
    isConfigured(): boolean;
}
export declare const emailService: EmailService;
export {};
