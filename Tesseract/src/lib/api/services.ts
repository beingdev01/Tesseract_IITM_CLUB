import type { AxiosRequestConfig } from "axios";

import { apiClient, toApiError } from "./client";
import type {
  Activity,
  AdminAuditLogEntry,
  AdminAnalytics,
  DashboardStats,
  Game,
  LeaderboardEntry,
  Notification,
  PublicDashboardSummary,
  Role,
  TesseractEvent,
  User,
} from "@/lib/types";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: { code?: string; message?: string } | null;
  meta?: Record<string, unknown> | null;
};

async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<ApiEnvelope<T>>(config);
    return response.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function assertIITMEmail(email: string) {
  const lower = email.trim().toLowerCase();
  if (
    !lower.endsWith("@ds.study.iitm.ac.in") &&
    !lower.endsWith("@es.study.iitm.ac.in")
  ) {
    throw { message: "Only IITM BS student emails are allowed." };
  }
  return lower;
}

export const authApi = {
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: User }> {
    const normalized = assertIITMEmail(email);
    if (!password) throw { message: "Enter your password." };
    return requestData({
      method: "post",
      url: "/auth/login",
      data: { email: normalized, password },
    });
  },

  async signup(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ token: string; user: User }> {
    const normalized = assertIITMEmail(email);
    if (!password || password.length < 8) {
      throw { message: "Password must be at least 8 characters." };
    }
    return requestData({
      method: "post",
      url: "/auth/signup",
      data: { email: normalized, password, name },
    });
  },

  async googleLogin(
    idToken: string,
  ): Promise<{ token: string; user: User }> {
    if (!idToken) throw { message: "Google sign-in token missing." };
    return requestData({
      method: "post",
      url: "/auth/oauth/google",
      data: { idToken },
    });
  },

  async refresh(): Promise<{ token: string; user: User }> {
    return requestData({
      method: "post",
      url: "/auth/refresh",
      headers: { "x-skip-auth-refresh": "true" },
    });
  },

  async logout(): Promise<{ ok: true }> {
    return requestData({
      method: "post",
      url: "/auth/logout",
      headers: { "x-skip-auth-refresh": "true" },
    });
  },
};

export const usersApi = {
  async me(): Promise<User> {
    return requestData({
      method: "get",
      url: "/users/me",
    });
  },

  async profile(id: string): Promise<User> {
    return requestData({
      method: "get",
      url: `/users/${id}`,
    });
  },
};

export const membersApi = {
  async me(): Promise<{
    status: string;
    requestedAt?: string | null;
    latestRequest?: { id: string; status: string } | null;
  }> {
    return requestData({
      method: "get",
      url: "/members/me",
    });
  },

  async request(note?: string): Promise<{ id: string; status: string }> {
    return requestData({
      method: "post",
      url: "/members/requests",
      data: { note },
    });
  },

  async list(options?: {
    role?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<User[]> {
    return requestData({
      method: "get",
      url: "/members",
      params: {
        role: options?.role,
        search: options?.search,
        page: options?.page,
        page_size: options?.pageSize,
      },
    });
  },
};

export const eventsApi = {
  async list(filter?: {
    status?: TesseractEvent["status"];
    page?: number;
    pageSize?: number;
    query?: string;
  }): Promise<TesseractEvent[]> {
    return requestData({
      method: "get",
      url: "/events",
      params: {
        status: filter?.status,
        page: filter?.page,
        page_size: filter?.pageSize,
        query: filter?.query,
      },
    });
  },

  async get(id: string): Promise<TesseractEvent> {
    return requestData({
      method: "get",
      url: `/events/${id}`,
    });
  },

  async join(id: string): Promise<{ ok: true }> {
    return requestData({
      method: "post",
      url: `/registrations/events/${id}`,
    });
  },

  async create(payload: Partial<TesseractEvent>): Promise<TesseractEvent> {
    return requestData({
      method: "post",
      url: "/events",
      data: payload,
    });
  },

  async update(id: string, payload: Partial<TesseractEvent>): Promise<TesseractEvent> {
    return requestData({
      method: "patch",
      url: `/events/${id}`,
      data: payload,
    });
  },

  async remove(id: string): Promise<{ ok: true }> {
    return requestData({
      method: "delete",
      url: `/events/${id}`,
    });
  },
};

export const gamesApi = {
  async list(options?: {
    page?: number;
    pageSize?: number;
    query?: string;
  }): Promise<Game[]> {
    return requestData({
      method: "get",
      url: "/games",
      params: {
        page: options?.page,
        page_size: options?.pageSize,
        query: options?.query,
      },
    });
  },

  async get(id: string): Promise<Game> {
    return requestData({
      method: "get",
      url: `/games/${id}`,
    });
  },

  async create(payload: Partial<Game>): Promise<Game> {
    return requestData({
      method: "post",
      url: "/games",
      data: payload,
    });
  },

  async update(id: string, payload: Partial<Game>): Promise<Game> {
    return requestData({
      method: "patch",
      url: `/games/${id}`,
      data: payload,
    });
  },

  async remove(id: string): Promise<{ ok: true }> {
    return requestData({
      method: "delete",
      url: `/games/${id}`,
    });
  },

  async submitScore(id: string, score: number): Promise<{
    ok: true;
    rank: number;
    personalBest: boolean;
    xpAwarded: number;
  }> {
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4fff-8fff-${Math.random().toString(16).slice(2, 14).padEnd(12, "0").slice(0, 12)}`;

    const result = await requestData<{
      rank: number;
      personalBest: boolean;
      xpAwarded: number;
    }>({
      method: "post",
      url: `/games/${id}/scores`,
      data: { score },
      headers: { "Idempotency-Key": idempotencyKey },
    });

    return { ok: true, ...result };
  },
};

export const leaderboardApi = {
  async global(options?: { page?: number; pageSize?: number }): Promise<LeaderboardEntry[]> {
    return requestData({
      method: "get",
      url: "/leaderboard/global",
      params: {
        page: options?.page,
        page_size: options?.pageSize,
      },
    });
  },

  async forGame(
    gameId: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<LeaderboardEntry[]> {
    return requestData({
      method: "get",
      url: `/leaderboard/games/${gameId}`,
      params: {
        page: options?.page,
        page_size: options?.pageSize,
      },
    });
  },
};

export const activityApi = {
  async feed(userId?: string): Promise<Activity[]> {
    return requestData({
      method: "get",
      url: "/activity",
      params: { userId },
    });
  },

  async notifications(): Promise<Notification[]> {
    return requestData({
      method: "get",
      url: "/activity/notifications",
    });
  },

  async markRead(id: string): Promise<{ ok: true }> {
    return requestData({
      method: "post",
      url: `/activity/notifications/${id}/read`,
    });
  },
};

export const dashboardApi = {
  async stats(): Promise<DashboardStats> {
    return requestData({
      method: "get",
      url: "/dashboard/stats",
    });
  },

  async publicSummary(): Promise<PublicDashboardSummary> {
    return requestData({
      method: "get",
      url: "/dashboard/public",
    });
  },
};

export const adminApi = {
  async analytics(): Promise<AdminAnalytics> {
    return requestData({
      method: "get",
      url: "/admin/analytics",
    });
  },

  async users(options?: {
    role?: Role;
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<User[]> {
    return requestData({
      method: "get",
      url: "/admin/users",
      params: {
        role: options?.role,
        query: options?.query,
        page: options?.page,
        page_size: options?.pageSize,
      },
    });
  },

  async setRole(userId: string, role: Role): Promise<User> {
    return requestData({
      method: "patch",
      url: `/admin/users/${userId}/role`,
      data: { role },
    });
  },

  async auditLogs(options?: {
    action?: string;
    targetType?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminAuditLogEntry[]> {
    return requestData({
      method: "get",
      url: "/admin/audit-logs",
      params: {
        action: options?.action,
        targetType: options?.targetType,
        page: options?.page,
        page_size: options?.pageSize,
      },
    });
  },
};

export const registrationsApi = {
  async register(eventId: string, customFieldResponses?: Record<string, any>): Promise<{ ok: true }> {
    return requestData({
      method: "post",
      url: `/registrations/events/${eventId}`,
      data: { additionalFields: customFieldResponses }
    });
  },
  
  async unregister(eventId: string): Promise<{ ok: true }> {
    return requestData({
      method: "delete",
      url: `/registrations/events/${eventId}`
    });
  },
  
  async status(eventId: string): Promise<{ isRegistered: boolean, teamId?: string }> {
    return requestData({
      method: "get",
      url: `/registrations/events/${eventId}/status`
    });
  }
};

export const teamsApi = {
  async create(eventId: string, teamName: string, customFieldResponses?: Record<string, any>) {
    return requestData<{ teamId: string, inviteCode: string }>({
      method: "post",
      url: "/teams/create",
      data: { eventId, teamName, customFieldResponses }
    });
  },
  
  async join(inviteCode: string, customFieldResponses?: Record<string, any>) {
    return requestData<{ teamId: string }>({
      method: "post",
      url: "/teams/join",
      data: { inviteCode, customFieldResponses }
    });
  },
  
  async myTeam(eventId: string) {
    return requestData<{
      id: string,
      teamName: string,
      inviteCode: string,
      isLocked: boolean,
      leaderId: string,
      members: { userId: string, role: "LEADER" | "MEMBER", joinedAt: string }[]
    }>({
      method: "get",
      url: `/teams/my-team/${eventId}`
    });
  },
  
  async lock(teamId: string, lock: boolean) {
    return requestData<{ ok: true }>({
      method: "patch",
      url: `/teams/${teamId}/lock`,
      data: { isLocked: lock }
    });
  },
  
  async dissolve(teamId: string) {
    return requestData<{ ok: true }>({
      method: "post",
      url: `/teams/${teamId}/dissolve`
    });
  },
  
  async removeMember(teamId: string, userId: string) {
    return requestData<{ ok: true }>({
      method: "post",
      url: `/teams/${teamId}/remove-member`,
      data: { userId }
    });
  }
};

export const announcementsApi = {
  async list(): Promise<import("../types").Announcement[]> {
    return requestData({
      method: "get",
      url: "/announcements"
    });
  }
};
