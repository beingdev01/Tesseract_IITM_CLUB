import type { Request } from "express";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminService } from "./admin.service";
import { AuditService } from "./audit.service";
export declare class AdminController {
    private readonly admin;
    private readonly features;
    private readonly prisma;
    private readonly audit;
    constructor(admin: AdminService, features: FeatureService, prisma: PrismaService, audit: AuditService);
    analytics(): Promise<{
        dau: number;
        wau: number;
        mau: number;
        events: number;
        games: number;
        liveNow: number;
        engagement: {
            label: string;
            value: number;
        }[];
        funnel: {
            stage: string;
            count: number;
        }[];
    }>;
    users(query: Record<string, unknown>, req: Request & {
        user: {
            id: string;
            role: "admin";
        };
    }): Promise<import("../common/envelope").EnvelopeResult<{
        suspension: {
            expiresAt: Date | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            reason: string;
            suspendedBy: string;
            liftedAt: Date | null;
            liftedBy: string | null;
        } | null;
        activeSessions: number;
        lastLoginAt: Date | null;
        overrideCount: number;
        membershipRequest: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.MembershipStatus;
            note: string | null;
            reviewerNote: string | null;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }[]>>;
    userFeatures(id: string): Promise<{
        resolved: Record<string, string | number | boolean>;
        defaults: Record<string, string | number | boolean>;
        overrides: Record<string, {
            value: string | number | boolean;
            setByName: string;
            setAt: Date;
            reason: string | null;
        }>;
    }>;
    setUserFeature(id: string, key: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        userId: string;
        flagKey: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        setById: string;
        setAt: Date;
        reason: string | null;
    }>;
    removeUserFeature(id: string, key: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    userDetail(id: string, req: Request & {
        user: {
            id: string;
            role: "admin";
        };
    }): Promise<{
        suspensions: {
            expiresAt: Date | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            reason: string;
            suspendedBy: string;
            liftedAt: Date | null;
            liftedBy: string | null;
        }[];
        overrides: {
            id: string;
            userId: string;
            flagKey: string;
            value: import("@prisma/client/runtime/library").JsonValue;
            setById: string;
            setAt: Date;
            reason: string | null;
        }[];
        activity: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            action: string;
            title: string;
            meta: import("@prisma/client/runtime/library").JsonValue;
            xpDelta: number;
            actorUserId: string | null;
            subjectUserId: string | null;
        }[];
        sessions: {
            expiresAt: Date;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            ipAddress: string | null;
            userAgent: string | null;
            revokedAt: Date | null;
            sessionFamilyId: string;
            tokenHash: string;
            lastUsedAt: Date | null;
            rotatedFromId: string | null;
        }[];
        suspension: {
            expiresAt: Date | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            reason: string;
            suspendedBy: string;
            liftedAt: Date | null;
            liftedBy: string | null;
        } | null;
        activeSessions: number;
        lastLoginAt: Date | null;
        overrideCount: number;
        membershipRequest: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.MembershipStatus;
            note: string | null;
            reviewerNote: string | null;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | null;
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }>;
    updateUser(id: string, body: Record<string, unknown>, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }>;
    setRole(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }>;
    suspend(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        expiresAt: Date | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        reason: string;
        suspendedBy: string;
        liftedAt: Date | null;
        liftedBy: string | null;
    }>;
    unsuspend(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    forceLogout(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    resetOtp(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    verifyEmail(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }>;
    deleteUser(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    membershipRequests(query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            rollNumber: string | null;
            avatarUrl: string | null;
            bio: string | null;
            passwordHash: string | null;
            googleSub: string | null;
            xp: number;
            level: string;
            streak: number;
            joinedAt: Date;
            verifiedAt: Date | null;
            lastSeenAt: Date | null;
            lastLoginAt: Date | null;
            deletedAt: Date | null;
            phone: string | null;
            course: string | null;
            branch: string | null;
            year: string | null;
            profileCompleted: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.MembershipStatus;
        note: string | null;
        reviewerNote: string | null;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    })[]>>;
    approveMembership(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.MembershipStatus;
        note: string | null;
        reviewerNote: string | null;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    rejectMembership(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.MembershipStatus;
        note: string | null;
        reviewerNote: string | null;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    forceAddParticipant(id: string, userId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        participantStatus: string;
    }>;
    forceRemoveParticipant(id: string, userId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    setEventStatus(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        title: string;
        slug: string | null;
        description: string;
        shortDescription: string | null;
        cover: string | null;
        category: "hackathon" | "quiz" | "meetup" | "workshop" | "tournament" | "social";
        status: "upcoming" | "live" | "completed" | "cancelled";
        startsAt: Date;
        endsAt: Date;
        location: string;
        venue: string | null;
        eventType: string | null;
        capacity: number;
        registered: number;
        participants_count: number;
        is_user_joined: boolean;
        xpReward: number;
        organizers: any[];
        tags: any[];
        featured: boolean;
        agenda: string | null;
        highlights: string | null;
        learningOutcomes: string | null;
        targetAudience: string | null;
        prerequisites: string | null;
        speakers: any[];
        resources: any[];
        faqs: any[];
        imageGallery: any[];
        videoUrl: string | null;
        allowLateRegistration: boolean;
        eventDays: number;
        dayLabels: any[];
        registrationFields: any[];
        registrationStartDate: Date | null;
        registrationEndDate: Date | null;
        teamRegistration: boolean;
        teamMinSize: number;
        teamMaxSize: number;
    }>;
    listFeatures(): Promise<{
        id: string;
        key: string;
        displayName: string;
        description: string | null;
        category: import(".prisma/client").$Enums.FlagCategory;
        valueType: import(".prisma/client").$Enums.FlagValueType;
        defaultValue: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateFeature(key: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        key: string;
        displayName: string;
        description: string | null;
        category: import(".prisma/client").$Enums.FlagCategory;
        valueType: import(".prisma/client").$Enums.FlagValueType;
        defaultValue: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    featureOverrides(key: string): Promise<{
        id: string;
        userId: string;
        flagKey: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        setById: string;
        setAt: Date;
        reason: string | null;
    }[]>;
    broadcast(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        recipientCount: number;
    }>;
    notifyUser(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        meta: import("@prisma/client/runtime/library").JsonValue;
        body: string;
        kind: import(".prisma/client").$Enums.NotificationKind;
        readAt: Date | null;
    }>;
    statsOverview(): Promise<{
        users: {
            total: number;
            byRole: {
                guest: number;
                member: number;
                core: number;
                admin: number;
            };
            suspended: number;
            deleted: number;
            active7d: number;
            active30d: number;
            signups7d: number;
            signups30d: number;
        };
        members: {
            total: number;
            pendingRequests: number;
        };
        events: {
            total: number;
            upcoming: number;
            live: number;
            past: number;
            cancelled: number;
            totalRSVPs: number;
        };
        activity: {
            last24h: number;
            last7d: number;
        };
        sessions: {
            active: number;
        };
    }>;
    signupsTimeline(daysRaw?: string): Promise<{
        date: string;
        count: number;
    }[]>;
    auditLogs(query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        createdAt: Date;
        action: string;
        note: string | null;
        targetType: string;
        targetId: string;
        before: import("@prisma/client/runtime/library").JsonValue | null;
        after: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        actorId: string;
    }[]>>;
    auditLog(id: string): Promise<{
        id: string;
        createdAt: Date;
        action: string;
        note: string | null;
        targetType: string;
        targetId: string;
        before: import("@prisma/client/runtime/library").JsonValue | null;
        after: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        actorId: string;
    }>;
}
