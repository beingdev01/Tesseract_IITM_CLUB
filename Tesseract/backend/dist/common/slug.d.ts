import { PrismaService } from "../prisma/prisma.service";
export declare function generateSlug(title: string): string;
export declare function generateUniqueSlug(title: string, prisma: PrismaService, excludeId?: string): Promise<string>;
