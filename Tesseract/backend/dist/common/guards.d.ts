import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "../auth/auth.service";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "./cache.service";
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly auth;
    private readonly prisma;
    private readonly cache;
    constructor(reflector: Reflector, auth: AuthService, prisma: PrismaService, cache: CacheService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class RoleGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
export declare class SuspensionGuard implements CanActivate {
    private readonly reflector;
    private readonly prisma;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class FeatureGuard implements CanActivate {
    private readonly reflector;
    private readonly features;
    constructor(reflector: Reflector, features: FeatureService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
