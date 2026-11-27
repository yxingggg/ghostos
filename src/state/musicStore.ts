import { create } from 'zustand';
import { createId } from '../core/id';
import {
  blobToArrayBuffer,
  deleteContent,
  getContent,
  loadSlice,
  putContent,
  saveSlice,
} from './persist';

export interface Track {
  id: string;
  name: string;
  contentId: string;
  mime: string;
  duration?: number;
  addedAt: number;
  /** VFS file id this track was imported from, if any (used for de-duping). */
  vfsFileId?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicStore {
  tracks: Track[];
  currentId: string | null;
  playing: boolean;
  volume: number; // 0..1
  muted: boolean;
  repeat: RepeatMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addTrack: (name: string, blob: Blob) => Promise<string>;
  /** Import a VFS audio file as a track (reusing an existing one for that file). */
  addTrackFromVfs: (
    vfsFileId: string,
    name: string,
    content: ArrayBuffer,
    mime: string,
  ) => Promise<string>;
  /** Add a demo track by id (from core demoTracks), reusing if already added. */
  addDemoTrack: (id: string, title: string, wav: ArrayBuffer) => Promise<string>;
  removeTrack: (id: string) => Promise<void>;
  getTrackUrl: (id: string) => Promise<string | null>;
  select: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  next: () => void;
  prev: () => void;
}

function persist(tracks: Track[]): void {
  void saveSlice('music', tracks);
}

export const useMusic = create<MusicStore>((set, get) => ({
  tracks: [],
  currentId: null,
  playing: false,
  volume: 0.8,
  muted: false,
  repeat: 'off',
  hydrated: false,
  hydrate: async () => {
    const stored = await loadSlice<Track[]>('music');
    set({ tracks: stored ?? [], hydrated: true });
  },
  addTrack: async (name, blob) => {
    const contentId = createId('audio');
    await putContent(contentId, await blobToArrayBuffer(blob));
    const track: Track = {
      id: createId('track'),
      name,
      contentId,
      mime: blob.type || 'audio/mpeg',
      addedAt: Date.now(),
    };
    const tracks = [...get().tracks, track];
    set({ tracks });
    persist(tracks);
    return track.id;
  },
  addTrackFromVfs: async (vfsFileId, name, content, mime) => {
    // Reuse an existing track for this VFS file so re-opening doesn't duplicate.
    const existing = get().tracks.find((t) => t.vfsFileId === vfsFileId);
    if (existing) {
      set({ currentId: existing.id });
      return existing.id;
    }
    const contentId = createId('audio');
    await putContent(contentId, content);
    const track: Track = {
      id: createId('track'),
      name,
      contentId,
      mime: mime || 'audio/mpeg',
      addedAt: Date.now(),
      vfsFileId,
    };
    const tracks = [...get().tracks, track];
    set({ tracks, currentId: track.id });
    persist(tracks);
    return track.id;
  },
  addDemoTrack: async (id, title, wav) => {
    // Dedup demo tracks by their stable demo id (stored in vfsFileId).
    const existing = get().tracks.find((t) => t.vfsFileId === `demo:${id}`);
    if (existing) {
      set({ currentId: existing.id });
      return existing.id;
    }
    const contentId = createId('audio');
    await putContent(contentId, wav);
    const track: Track = {
      id: createId('track'),
      name: title,
      contentId,
      mime: 'audio/wav',
      addedAt: Date.now(),
      vfsFileId: `demo:${id}`,
    };
    const tracks = [...get().tracks, track];
    set({ tracks, currentId: track.id });
    persist(tracks);
    return track.id;
  },
  removeTrack: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (track) await deleteContent(track.contentId);
    const tracks = get().tracks.filter((t) => t.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ tracks, currentId, playing: currentId ? get().playing : false });
    persist(tracks);
  },
  getTrackUrl: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return null;
    const raw = await getContent(track.contentId);
    // Content is stored as ArrayBuffer; rebuild a typed Blob from the track's
    // retained MIME so the <audio> element can play it.
    if (!(raw instanceof ArrayBuffer)) return null;
    const blob = new Blob([raw], { type: track.mime });
    return URL.createObjectURL(blob);
  },
  select: (id) => set({ currentId: id }),
  setPlaying: (playing) => set({ playing }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: v === 0 ? get().muted : false }),
  toggleMute: () => set({ muted: !get().muted }),
  cycleRepeat: () =>
    set({ repeat: get().repeat === 'off' ? 'all' : get().repeat === 'all' ? 'one' : 'off' }),
  next: () => {
    const { tracks, currentId } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentId);
    const nextTrack = tracks[(idx + 1) % tracks.length];
    if (nextTrack) set({ currentId: nextTrack.id, playing: true });
  },
  prev: () => {
    const { tracks, currentId } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentId);
    const prevTrack = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prevTrack) set({ currentId: prevTrack.id, playing: true });
  },
}));
