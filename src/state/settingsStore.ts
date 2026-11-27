import { create } from 'zustand';
import { loadSlice, saveSlice } from './persist';

import type { ProviderId } from '../core/assistant/providers';

export interface AssistantConfig {
  /** Online AI mode is opt-in; offline help mode always works regardless. */
  enabled: boolean;
  provider: ProviderId;
  endpoint?: string;
  /** Kept in session memory only — never persisted or exported. */
  apiKey?: string;
  model?: string;
}

export type WallpaperId = 'castle' | 'graveyard' | 'forest' | 'void';

export interface Settings {
  crt: boolean;
  reducedMotion: boolean;
  sound: boolean;
  assistant: AssistantConfig;
  theme: 'gothic';
  wallpaper: WallpaperId;
}

export const defaultSettings: Settings = {
  crt: true,
  reducedMotion: false,
  sound: false, // sound is opt-in
  assistant: { enabled: false, provider: 'openai' },
  theme: 'gothic',
  wallpaper: 'castle', // Haunted Castle is the default for new users.
};

export const WALLPAPERS: Array<{ id: WallpaperId; name: string }> = [
  { id: 'castle', name: 'Haunted Castle' },
  { id: 'graveyard', name: 'Blood Moon Graveyard' },
  { id: 'forest', name: 'Misty Haunted Forest' },
  { id: 'void', name: 'Supernatural Void' },
];

/** Migrate legacy wallpaper ids so existing users keep a valid selection. */
export function normalizeWallpaper(id: unknown): WallpaperId {
  const legacy: Record<string, WallpaperId> = { crypt: 'castle', bloodmoon: 'graveyard' };
  if (typeof id === 'string') {
    if (id === 'castle' || id === 'graveyard' || id === 'forest' || id === 'void') return id;
    if (legacy[id]) return legacy[id];
  }
  return 'castle';
}

interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setAssistant: (patch: Partial<AssistantConfig>) => void;
  toggle: (key: 'crt' | 'reducedMotion' | 'sound') => void;
}

function persist(state: Settings): void {
  // The API key is deliberately NEVER persisted — it lives only in session
  // memory and is stripped before writing settings to IndexedDB.
  const { apiKey: _omit, ...assistant } = state.assistant;
  void _omit;
  void saveSlice('settings', {
    crt: state.crt,
    reducedMotion: state.reducedMotion,
    sound: state.sound,
    assistant,
    theme: state.theme,
    wallpaper: state.wallpaper,
  });
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...defaultSettings,
  hydrated: false,
  hydrate: async () => {
    const stored = await loadSlice<Partial<Settings>>('settings');
    if (stored) {
      // Deep-merge the nested assistant config so a partial stored object never
      // drops the opt-out default.
      set({
        ...defaultSettings,
        ...stored,
        assistant: { ...defaultSettings.assistant, ...(stored.assistant ?? {}) },
        wallpaper: normalizeWallpaper(stored.wallpaper),
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },
  set: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>);
    persist(get());
  },
  setAssistant: (patch) => {
    const prev = get().assistant;
    const next: AssistantConfig = { ...prev, ...patch };
    // Clear the API key when switching provider or endpoint, so credentials are
    // never reused against a different destination. (Skip if the patch itself
    // sets a new key.)
    const providerChanged = patch.provider !== undefined && patch.provider !== prev.provider;
    const endpointChanged = patch.endpoint !== undefined && patch.endpoint !== prev.endpoint;
    if ((providerChanged || endpointChanged) && patch.apiKey === undefined) {
      delete next.apiKey;
    }
    set({ assistant: next });
    persist(get());
  },
  toggle: (key) => {
    set({ [key]: !get()[key] } as Pick<Settings, typeof key>);
    persist(get());
  },
}));

/** True if motion should be reduced (user setting OR OS preference). */
export function prefersReducedMotion(userSetting: boolean): boolean {
  if (userSetting) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}
