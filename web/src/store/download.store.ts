'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DownloadHistoryItem,
  MediaType,
  PlaylistQualityPreference,
} from '@/types/api';

export type DownloadMode = 'SINGLE' | 'PLAYLIST';

interface DownloadSelection {
  formatId: string;
  quality: string;
  mediaType: MediaType;
  audioBitrate?: number;
}

export interface ClipRange {
  enabled: boolean;
  startSeconds: number;
  endSeconds: number;
}

export interface PlaylistSelectionState {
  playlistId: string;
  selectedItemIds: string[];
  qualityPreference: PlaylistQualityPreference;
  audioBitrate: number;
}

interface DownloadUiState {
  activeJobId: string | null;
  activePlaylistId: string | null;
  mode: DownloadMode;
  selection: DownloadSelection | null;
  clipRange: ClipRange | null;
  playlistSelection: PlaylistSelectionState | null;
  setActiveJobId: (id: string | null) => void;
  setActivePlaylistId: (id: string | null) => void;
  setMode: (mode: DownloadMode) => void;
  setSelection: (selection: DownloadSelection | null) => void;
  clearSelection: () => void;
  setClipRange: (clip: ClipRange | null) => void;
  clearClipRange: () => void;
  setPlaylistSelection: (selection: PlaylistSelectionState | null) => void;
  patchPlaylistSelection: (patch: Partial<PlaylistSelectionState>) => void;
  clearPlaylistSelection: () => void;
}

export const useDownloadUiStore = create<DownloadUiState>((set) => ({
  activeJobId: null,
  activePlaylistId: null,
  mode: 'SINGLE',
  selection: null,
  clipRange: null,
  playlistSelection: null,
  setActiveJobId: (id) => set({ activeJobId: id }),
  setActivePlaylistId: (id) => set({ activePlaylistId: id }),
  setMode: (mode) => set({ mode }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setClipRange: (clip) => set({ clipRange: clip }),
  clearClipRange: () => set({ clipRange: null }),
  setPlaylistSelection: (selection) => set({ playlistSelection: selection }),
  patchPlaylistSelection: (patch) =>
    set((state) => ({
      playlistSelection: state.playlistSelection
        ? { ...state.playlistSelection, ...patch }
        : state.playlistSelection,
    })),
  clearPlaylistSelection: () => set({ playlistSelection: null }),
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
