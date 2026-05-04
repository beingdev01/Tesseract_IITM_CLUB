import { SetMetadata } from "@nestjs/common";

export const PUBLIC_ROUTE = "publicRoute";
export const ROLES = "roles";
export const FEATURE_FLAG = "featureFlag";
export const ALLOW_SUSPENDED = "allowSuspended";

export type RoleName = "guest" | "member" | "core" | "admin";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES, roles);
export const RequireFlag = (key: string) => SetMetadata(FEATURE_FLAG, key);
export const AllowSuspended = () => SetMetadata(ALLOW_SUSPENDED, true);
