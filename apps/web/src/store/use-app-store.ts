"use client"

import { create } from "zustand"

interface AppState {
    sidebarCollapsed: boolean
    commandPaletteOpen: boolean
    activeProjectId: string | null
    setSidebarCollapsed: (collapsed: boolean) => void
    toggleSidebar: () => void
    setCommandPaletteOpen: (open: boolean) => void
    toggleCommandPalette: () => void
    setActiveProjectId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
    sidebarCollapsed: false,
    commandPaletteOpen: false,
    activeProjectId: null,
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    setActiveProjectId: (id) => set({ activeProjectId: id }),
}))
