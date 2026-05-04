"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/lib/types";
import { authApi, usersApi } from "@/lib/api/services";
import { AUTH_STORE_KEY, clearStoredAuth, readAccessToken, writeAccessToken } from "@/lib/auth-storage";

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role;
  isHydrated: boolean;
  initialRefreshDone: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name?: string) => Promise<User>;
  googleLogin: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setRoleLocal: (role: Role) => void;
  patchUserLocal: (patch: Partial<User>) => void;
  resetSession: () => void;
  setHydrated: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: "guest",
      isHydrated: false,
      initialRefreshDone: false,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { token, user } = await authApi.login(email, password);
          writeAccessToken(token);
          set({ token, user, role: user.role, loading: false });
          return user;
        } catch (e) {
          const msg = (e as { message?: string })?.message ?? "Login failed";
          set({ loading: false, error: msg });
          throw e;
        }
      },

      signup: async (email, password, name) => {
        set({ loading: true, error: null });
        try {
          const { token, user } = await authApi.signup(email, password, name);
          writeAccessToken(token);
          set({ token, user, role: user.role, loading: false });
          return user;
        } catch (e) {
          const msg = (e as { message?: string })?.message ?? "Signup failed";
          set({ loading: false, error: msg });
          throw e;
        }
      },

      googleLogin: async (idToken) => {
        set({ loading: true, error: null });
        try {
          const { token, user } = await authApi.googleLogin(idToken);
          writeAccessToken(token);
          set({ token, user, role: user.role, loading: false });
          return user;
        } catch (e) {
          const msg = (e as { message?: string })?.message ?? "Google sign-in failed";
          set({ loading: false, error: msg });
          throw e;
        }
      },

      logout: async () => {
        await authApi.logout().catch(() => null);
        clearStoredAuth(false);
        set({ user: null, token: null, role: "guest" });
      },

      refresh: async () => {
        set({ loading: true });
        try {
          const storedToken = readAccessToken();
          if (!storedToken) {
            const session = await authApi.refresh();
            writeAccessToken(session.token);
            set({
              token: session.token,
              user: session.user,
              role: session.user.role,
              loading: false,
              initialRefreshDone: true,
            });
            return;
          }
          const u = await usersApi.me();
          set({ token: storedToken, user: u, role: u.role, loading: false, initialRefreshDone: true });
        } catch {
          try {
            const session = await authApi.refresh();
            writeAccessToken(session.token);
            set({
              token: session.token,
              user: session.user,
              role: session.user.role,
              loading: false,
              initialRefreshDone: true,
            });
          } catch {
            clearStoredAuth(false);
            set({ user: null, token: null, role: "guest", loading: false, initialRefreshDone: true });
          }
        }
      },

      setRoleLocal: (role) => {
        const current = get().user;
        if (current) set({ user: { ...current, role }, role });
        else set({ role });
      },

      patchUserLocal: (patch) => {
        const current = get().user;
        if (!current) return;
        const next = { ...current, ...patch };
        set({ user: next, role: next.role });
      },

      resetSession: () => {
        clearStoredAuth(false);
        set({ user: null, token: null, role: "guest", error: null, loading: false });
      },

      setHydrated: () => set({ isHydrated: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: AUTH_STORE_KEY,
      partialize: (s) => ({ user: s.user, token: s.token, role: s.role }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
