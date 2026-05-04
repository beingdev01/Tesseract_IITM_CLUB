import { Injectable } from "@nestjs/common";

import { AppError } from "../common/app-error";
import { hasMinRole } from "../common/types";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Role } from "../common/types";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  rollNumber: string | null;
  avatarUrl: string | null;
  bio: string | null;
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

const levels = ["Bronze", "Silver", "Gold", "Platinum", "Diamond I", "Diamond II", "Diamond III", "Mythic I", "Mythic II", "Mythic III"];

export function levelForXp(xp: number): string {
  return levels[Math.min(Math.floor(xp / 5000), levels.length - 1)];
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureService
  ) {}

  async getById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async mustGetById(id: string): Promise<User> {
    const user = await this.getById(id);
    if (!user) throw new AppError("not_found", "User not found.", 404);
    return user;
  }

  async publicUser(user: User, viewer?: { id: string; role: Role } | null) {
    const own = viewer?.id === user.id;
    const privileged = viewer ? hasMinRole(viewer.role, "core") : false;
    const [rank, latestRequest, flags] = await Promise.all([
      this.rankForUser(user),
      this.prisma.membershipRequest.findFirst({ where: { userId: user.id }, orderBy: { requestedAt: "desc" } }),
      this.features.resolveForUser(user.id)
    ]);
    const roleApproved = user.role !== "guest";
    const membershipStatus = roleApproved ? "approved" : latestRequest?.status ?? "none";
    return {
      id: user.id,
      name: user.name,
      email: own || privileged || flags["profile.show_email"] === true ? user.email : "",
      avatar: user.avatarUrl,
      role: user.role,
      rollNumber: own || privileged || flags["profile.show_roll_number"] === true ? user.rollNumber : undefined,
      level: user.level,
      joinedAt: user.joinedAt,
      xp: user.xp,
      rank,
      streak: user.streak,
      bio: user.bio,
      phone: own || privileged ? user.phone : undefined,
      course: user.course,
      branch: user.branch,
      year: user.year,
      profileCompleted: user.profileCompleted,
      badges: [],
      membershipStatus,
      membershipRequestedAt: latestRequest?.requestedAt ?? null
    };
  }

  async rankForUser(user: Pick<User, "id" | "xp" | "joinedAt">): Promise<number> {
    const ahead = await this.prisma.user.count({
      where: {
        deletedAt: null,
        OR: [{ xp: { gt: user.xp } }, { xp: user.xp, joinedAt: { lt: user.joinedAt } }]
      }
    });
    return ahead + 1;
  }

  async updateMe(userId: string, patch: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    rollNumber?: string | null;
    phone?: string | null;
    course?: string | null;
    branch?: string | null;
    year?: string | null;
  }) {
    const current = await this.mustGetById(userId);
    const fields = ["name", "bio", "avatarUrl", "rollNumber", "phone", "course", "branch", "year"] as const;
    const changed = fields.some((key) => {
      return patch[key] !== undefined && patch[key] !== current[key as keyof User];
    });

    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.bio !== undefined) data.bio = patch.bio;
    if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
    if (patch.rollNumber !== undefined) data.rollNumber = patch.rollNumber;
    if (patch.phone !== undefined) data.phone = patch.phone;
    if (patch.course !== undefined) data.course = patch.course;
    if (patch.branch !== undefined) data.branch = patch.branch;
    if (patch.year !== undefined) data.year = patch.year;

    // Auto-compute profileCompleted: name + rollNumber + course + branch + year all filled
    const merged = { ...current, ...data };
    data.profileCompleted = !!(merged.name && merged.rollNumber && merged.course && merged.branch && merged.year);

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return { updated, changed };
  }

  async canViewProfile(target: User, viewer: { id: string; role: Role }): Promise<boolean> {
    if (target.id === viewer.id || hasMinRole(viewer.role, "core")) return true;
    const flags = await this.features.resolveForUser(target.id);
    return flags["profile.visible_in_directory"] === true;
  }
}
