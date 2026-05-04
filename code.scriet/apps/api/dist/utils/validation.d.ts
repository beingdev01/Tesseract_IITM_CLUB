import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
export declare const schemas: {
    id: z.ZodString;
    mongoId: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    username: z.ZodString;
    url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    title: z.ZodString;
    description: z.ZodString;
    shortText: z.ZodString;
    date: z.ZodString;
    futureDate: z.ZodEffects<z.ZodString, string, string>;
    pastDate: z.ZodEffects<z.ZodString, string, string>;
    positiveInt: z.ZodNumber;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    role: z.ZodEnum<["SUPER_ADMIN", "ADMIN", "MEMBER"]>;
    priority: z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>;
    eventType: z.ZodEnum<["WORKSHOP", "SEMINAR", "HACKATHON", "MEETUP", "COMPETITION", "OTHER"]>;
    boolean: z.ZodBoolean;
    optionalBoolean: z.ZodOptional<z.ZodBoolean>;
};
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    q: z.ZodString;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    q: string;
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const eventSchemas: {
    create: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        date: z.ZodEffects<z.ZodString, string, string>;
        location: z.ZodOptional<z.ZodString>;
        venue: z.ZodOptional<z.ZodString>;
        eventType: z.ZodOptional<z.ZodEnum<["WORKSHOP", "SEMINAR", "HACKATHON", "MEETUP", "COMPETITION", "OTHER"]>>;
        maxParticipants: z.ZodOptional<z.ZodNumber>;
        registrationStartDate: z.ZodOptional<z.ZodString>;
        registrationEndDate: z.ZodOptional<z.ZodString>;
        prerequisites: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        isPublic: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        date: string;
        registrationStartDate?: string | undefined;
        registrationEndDate?: string | undefined;
        location?: string | undefined;
        venue?: string | undefined;
        eventType?: "WORKSHOP" | "SEMINAR" | "HACKATHON" | "MEETUP" | "COMPETITION" | "OTHER" | undefined;
        prerequisites?: string | undefined;
        imageUrl?: string | undefined;
        maxParticipants?: number | undefined;
        isPublic?: boolean | undefined;
    }, {
        description: string;
        title: string;
        date: string;
        registrationStartDate?: string | undefined;
        registrationEndDate?: string | undefined;
        location?: string | undefined;
        venue?: string | undefined;
        eventType?: "WORKSHOP" | "SEMINAR" | "HACKATHON" | "MEETUP" | "COMPETITION" | "OTHER" | undefined;
        prerequisites?: string | undefined;
        imageUrl?: string | undefined;
        maxParticipants?: number | undefined;
        isPublic?: boolean | undefined;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        venue: z.ZodOptional<z.ZodString>;
        eventType: z.ZodOptional<z.ZodEnum<["WORKSHOP", "SEMINAR", "HACKATHON", "MEETUP", "COMPETITION", "OTHER"]>>;
        maxParticipants: z.ZodOptional<z.ZodNumber>;
        registrationStartDate: z.ZodOptional<z.ZodString>;
        registrationEndDate: z.ZodOptional<z.ZodString>;
        prerequisites: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        isPublic: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        title?: string | undefined;
        registrationStartDate?: string | undefined;
        registrationEndDate?: string | undefined;
        location?: string | undefined;
        venue?: string | undefined;
        eventType?: "WORKSHOP" | "SEMINAR" | "HACKATHON" | "MEETUP" | "COMPETITION" | "OTHER" | undefined;
        prerequisites?: string | undefined;
        imageUrl?: string | undefined;
        date?: string | undefined;
        maxParticipants?: number | undefined;
        isPublic?: boolean | undefined;
    }, {
        description?: string | undefined;
        title?: string | undefined;
        registrationStartDate?: string | undefined;
        registrationEndDate?: string | undefined;
        location?: string | undefined;
        venue?: string | undefined;
        eventType?: "WORKSHOP" | "SEMINAR" | "HACKATHON" | "MEETUP" | "COMPETITION" | "OTHER" | undefined;
        prerequisites?: string | undefined;
        imageUrl?: string | undefined;
        date?: string | undefined;
        maxParticipants?: number | undefined;
        isPublic?: boolean | undefined;
    }>;
};
export declare const announcementSchemas: {
    create: z.ZodObject<{
        title: z.ZodString;
        body: z.ZodString;
        priority: z.ZodDefault<z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>>;
    }, "strip", z.ZodTypeAny, {
        body: string;
        title: string;
        priority: "URGENT" | "HIGH" | "LOW" | "NORMAL";
    }, {
        body: string;
        title: string;
        priority?: "URGENT" | "HIGH" | "LOW" | "NORMAL" | undefined;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>>;
    }, "strip", z.ZodTypeAny, {
        body?: string | undefined;
        title?: string | undefined;
        priority?: "URGENT" | "HIGH" | "LOW" | "NORMAL" | undefined;
    }, {
        body?: string | undefined;
        title?: string | undefined;
        priority?: "URGENT" | "HIGH" | "LOW" | "NORMAL" | undefined;
    }>;
};
export declare const userSchemas: {
    updateProfile: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        bio: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        githubUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        linkedinUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        twitterUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        websiteUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        bio?: string | undefined;
        githubUrl?: string | undefined;
        linkedinUrl?: string | undefined;
        twitterUrl?: string | undefined;
        websiteUrl?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        name?: string | undefined;
        bio?: string | undefined;
        githubUrl?: string | undefined;
        linkedinUrl?: string | undefined;
        twitterUrl?: string | undefined;
        websiteUrl?: string | undefined;
        avatarUrl?: string | undefined;
    }>;
    changePassword: z.ZodEffects<z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        confirmPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        newPassword: string;
        currentPassword: string;
        confirmPassword: string;
    }, {
        newPassword: string;
        currentPassword: string;
        confirmPassword: string;
    }>, {
        newPassword: string;
        currentPassword: string;
        confirmPassword: string;
    }, {
        newPassword: string;
        currentPassword: string;
        confirmPassword: string;
    }>;
    register: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name: string;
        password: string;
    }, {
        email: string;
        name: string;
        password: string;
    }>;
    login: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
};
export declare const achievementSchemas: {
    create: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        date: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        date: string;
        imageUrl?: string | undefined;
        category?: string | undefined;
        participants?: string[] | undefined;
    }, {
        description: string;
        title: string;
        date: string;
        imageUrl?: string | undefined;
        category?: string | undefined;
        participants?: string[] | undefined;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        title?: string | undefined;
        imageUrl?: string | undefined;
        date?: string | undefined;
        category?: string | undefined;
        participants?: string[] | undefined;
    }, {
        description?: string | undefined;
        title?: string | undefined;
        imageUrl?: string | undefined;
        date?: string | undefined;
        category?: string | undefined;
        participants?: string[] | undefined;
    }>;
};
export declare const teamSchemas: {
    create: z.ZodObject<{
        userId: z.ZodString;
        position: z.ZodString;
        department: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        position: string;
        order?: number | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
    }, {
        userId: string;
        position: string;
        order?: number | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
    }>;
    update: z.ZodObject<{
        position: z.ZodOptional<z.ZodString>;
        department: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        order?: number | undefined;
        department?: string | undefined;
        position?: string | undefined;
        isActive?: boolean | undefined;
    }, {
        order?: number | undefined;
        department?: string | undefined;
        position?: string | undefined;
        isActive?: boolean | undefined;
    }>;
};
export declare const qotdSchemas: {
    submit: z.ZodObject<{
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        answer: string;
    }, {
        answer: string;
    }>;
    create: z.ZodObject<{
        question: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        question: string;
        date?: string | undefined;
    }, {
        question: string;
        date?: string | undefined;
    }>;
};
export declare const settingsSchema: z.ZodObject<{
    clubName: z.ZodOptional<z.ZodString>;
    clubDescription: z.ZodOptional<z.ZodString>;
    clubLogo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    contactEmail: z.ZodOptional<z.ZodString>;
    socialLinks: z.ZodOptional<z.ZodObject<{
        github: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        twitter: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        linkedin: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        discord: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        instagram: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        github?: string | undefined;
        linkedin?: string | undefined;
        twitter?: string | undefined;
        instagram?: string | undefined;
        discord?: string | undefined;
    }, {
        github?: string | undefined;
        linkedin?: string | undefined;
        twitter?: string | undefined;
        instagram?: string | undefined;
        discord?: string | undefined;
    }>>;
    showLeaderboard: z.ZodOptional<z.ZodBoolean>;
    showQOTD: z.ZodOptional<z.ZodBoolean>;
    showAchievements: z.ZodOptional<z.ZodBoolean>;
    maintenanceMode: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    clubName?: string | undefined;
    clubDescription?: string | undefined;
    showLeaderboard?: boolean | undefined;
    showQOTD?: boolean | undefined;
    showAchievements?: boolean | undefined;
    clubLogo?: string | undefined;
    contactEmail?: string | undefined;
    socialLinks?: {
        github?: string | undefined;
        linkedin?: string | undefined;
        twitter?: string | undefined;
        instagram?: string | undefined;
        discord?: string | undefined;
    } | undefined;
    maintenanceMode?: boolean | undefined;
}, {
    clubName?: string | undefined;
    clubDescription?: string | undefined;
    showLeaderboard?: boolean | undefined;
    showQOTD?: boolean | undefined;
    showAchievements?: boolean | undefined;
    clubLogo?: string | undefined;
    contactEmail?: string | undefined;
    socialLinks?: {
        github?: string | undefined;
        linkedin?: string | undefined;
        twitter?: string | undefined;
        instagram?: string | undefined;
        discord?: string | undefined;
    } | undefined;
    maintenanceMode?: boolean | undefined;
}>;
export declare function validate<T extends z.ZodSchema>(schema: T, source?: 'body' | 'query' | 'params'): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function parseSchema<T extends z.ZodSchema>(schema: T, data: unknown): {
    success: true;
    data: z.infer<T>;
} | {
    success: false;
    errors: Array<{
        field: string;
        message: string;
    }>;
};
