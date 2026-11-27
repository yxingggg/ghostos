import { create } from 'zustand';
import { createId } from '../core/id';
import { loadSlice, saveSlice } from './persist';

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

interface NotesStore {
  notes: Note[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Notes ordered by most recently updated. */
  ordered: () => Note[];
  create: (title?: string) => string;
  update: (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) => void;
  remove: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistDebounced(notes: Note[]): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveSlice('notes', notes);
  }, 400);
}

export const useNotes = create<NotesStore>((set, get) => ({
  notes: [],
  hydrated: false,
  hydrate: async () => {
    const stored = await loadSlice<Note[]>('notes');
    set({ notes: stored ?? [], hydrated: true });
  },
  ordered: () => [...get().notes].sort((a, b) => b.updatedAt - a.updatedAt),
  create: (title = 'Untitled') => {
    const now = Date.now();
    const note: Note = { id: createId('note'), title, body: '', createdAt: now, updatedAt: now };
    const notes = [note, ...get().notes];
    set({ notes });
    persistDebounced(notes);
    return note.id;
  },
  update: (id, patch) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
    );
    set({ notes });
    persistDebounced(notes);
  },
  remove: (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    set({ notes });
    persistDebounced(notes);
  },
}));
