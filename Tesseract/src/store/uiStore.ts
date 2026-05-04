"use client";

import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  commandOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setCommandOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  commandOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCommandOpen: (v) => set({ commandOpen: v }),
}));
