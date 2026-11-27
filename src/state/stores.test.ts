import { describe, it, expect, beforeEach } from 'vitest';
import { __resetPersistenceForTests, loadSlice } from './persist';
import { useWm } from './wmStore';
import { useNotes } from './notesStore';
import { useVfs } from './vfsStore';
import { createInitialState } from '../core/wm/reducer';

describe('wmStore (integration)', () => {
  beforeEach(() => {
    useWm.setState({ state: createInitialState() });
  });

  it('opens and focuses windows', () => {
    const wm = useWm.getState();
    const a = wm.open({ appId: 'notes', title: 'Notes' });
    const b = wm.open({ appId: 'calc', title: 'Calc' });
    expect(useWm.getState().state.focusedId).toBe(b);
    useWm.getState().focus(a);
    expect(useWm.getState().state.focusedId).toBe(a);
  });

  it('singleton reuses an existing window', () => {
    const wm = useWm.getState();
    const a = wm.open({ appId: 'notes', title: 'Notes', singleton: true });
    const again = useWm.getState().open({ appId: 'notes', title: 'Notes', singleton: true });
    expect(again).toBe(a);
    expect(Object.keys(useWm.getState().state.windows)).toHaveLength(1);
  });

  it('closes windows', () => {
    const wm = useWm.getState();
    const a = wm.open({ appId: 'notes', title: 'Notes' });
    useWm.getState().close(a);
    expect(Object.keys(useWm.getState().state.windows)).toHaveLength(0);
  });
});

describe('notesStore persistence (integration)', () => {
  beforeEach(() => {
    __resetPersistenceForTests();
    useNotes.setState({ notes: [], hydrated: false });
  });

  it('creates, updates, and persists notes; reload restores them', async () => {
    const id = useNotes.getState().create('First');
    useNotes.getState().update(id, { body: 'hello crypt' });
    // Wait out the debounce.
    await new Promise((r) => setTimeout(r, 500));
    const stored = await loadSlice<Array<{ id: string; body: string }>>('notes');
    expect(stored?.[0]?.body).toBe('hello crypt');

    // Fresh store hydrates from storage.
    useNotes.setState({ notes: [], hydrated: false });
    await useNotes.getState().hydrate();
    expect(useNotes.getState().notes.find((n) => n.id === id)?.body).toBe('hello crypt');
  });

  it('orders notes by most recently updated', async () => {
    const a = useNotes.getState().create('A');
    const b = useNotes.getState().create('B');
    useNotes.getState().update(a, { body: 'touched last' });
    const ordered = useNotes.getState().ordered();
    expect(ordered[0]?.id).toBe(a);
    expect(ordered[1]?.id).toBe(b);
  });
});

describe('vfsStore persistence (integration)', () => {
  beforeEach(() => {
    __resetPersistenceForTests();
  });

  it('creates a folder and a text file and reads it back', async () => {
    await useVfs.getState().hydrate();
    const root = useVfs.getState().rootId;
    const folderId = useVfs.getState().createFolder(root, 'crypt');
    expect(folderId).not.toBeNull();
    if (!folderId) return;
    const fileId = await useVfs.getState().createTextFile(folderId, 'spell.txt', 'abra');
    expect(fileId).not.toBeNull();
    if (!fileId) return;
    const text = await useVfs.getState().readText(fileId);
    expect(text).toBe('abra');
  });

  it('rejects a duplicate folder name', async () => {
    await useVfs.getState().hydrate();
    const root = useVfs.getState().rootId;
    useVfs.getState().createFolder(root, 'dup');
    const second = useVfs.getState().createFolder(root, 'dup');
    expect(second).toBeNull();
  });
});
