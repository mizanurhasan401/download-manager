'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DownloadHistoryItem, MediaType } from '@/types/api';

interface DownloadSelection {
  formatId: string;
  quality: string;
  mediaType: MediaType;
}

interface DownloadUiState {
  activeJobId: string | null;
  selection: DownloadSelection | null;
  setActiveJobId: (id: string | null) => void;
  setSelection: (selection: DownloadSelection | null) => void;
  clearSelection: () => void;
}

export const useDownloadUiStore = create<DownloadUiState>((set) => ({
  activeJobId: null,
  selection: null,
  setActiveJobId: (id) => set({ activeJobId: id }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
}));

interface HistoryState {
  items: DownloadHistoryItem[];
  upsertItem: (item: DownloadHistoryItem) => void;
  updateItem: (id: string, patch: Partial<DownloadHistoryItem>) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export const useDownloadHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      upsertItem: (item) =>
        set((state) => {
          const exists = state.items.find((entry) => entry.id === item.id);
          if (exists) {
            return {
              items: state.items.map((entry) =>
                entry.id === item.id ? { ...entry, ...item } : entry,
              ),
            };
          }
          return { items: [item, ...state.items].slice(0, 50) };
        }),
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ items: [] }),
    }),
    { name: 'vidgrab-download-history' },
  ),
);
