import { create } from 'zustand';
import { loadSlice, saveSlice } from './persist';

export interface AssistantConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  model?: string;
}

export interface Settings {
  crt: boolean;
  reducedMotion: boolean;
  sound: boolean;
  assistant: AssistantConfig;
  theme: 'gothic';
}

export const defaultSettings: Settings = {
  crt: true,
  reducedMotion: false,
  sound: false, // sound is opt-in
  assistant: { enabled: false },
  theme: 'gothic',
};

interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setAssistant: (patch: Partial<AssistantConfig>) => void;
  toggle: (key: 'crt' | 'reducedMotion' | 'sound') => void;
}

function persist(state: Settings): void {
  void saveSlice('settings', {
    crt: state.crt,
    reducedMotion: state.reducedMotion,
    sound: state.sound,
    assistant: state.assistant,
    theme: state.theme,
  });
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...defaultSettings,
  hydrated: false,
  hydrate: async () => {
    const stored = await loadSlice<Settings>('settings');
    if (stored) {
      set({ ...defaultSettings, ...stored, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
  set: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>);
    persist(get());
  },
  setAssistant: (patch) => {
    set({ assistant: { ...get().assistant, ...patch } });
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
