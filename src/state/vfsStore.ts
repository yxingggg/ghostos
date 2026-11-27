import { create } from 'zustand';
import { createId } from '../core/id';
import {
  childrenOf,
  createNode,
  createVfs,
  getNode,
  move as moveOp,
  pathOf,
  remove as removeOp,
  rename as renameOp,
  setFileContentMeta,
} from '../core/vfs/ops';
import type { NodeId, VfsNode, VfsState } from '../core/vfs/types';
import {
  blobToArrayBuffer,
  deleteContent,
  getContent,
  loadSlice,
  putContent,
  saveSlice,
} from './persist';
import { useToasts } from './toastStore';

const ROOT_ID = 'root';

function seedVfs(): VfsState {
  // A small starter filesystem so the desktop isn't empty on first boot.
  let s = createVfs(ROOT_ID);
  const home = createNode(s, ROOT_ID, 'home', { id: createId('dir'), kind: 'folder' });
  if (home.ok) s = home.value;
  const homeId = Object.values(s.nodes).find((n) => n.name === 'home')?.id ?? ROOT_ID;
  const docs = createNode(s, homeId, 'documents', { id: createId('dir'), kind: 'folder' });
  if (docs.ok) s = docs.value;
  const music = createNode(s, homeId, 'music', { id: createId('dir'), kind: 'folder' });
  if (music.ok) s = music.value;
  const readme = createNode(s, homeId, 'README.txt', {
    id: createId('file'),
    kind: 'file',
    mime: 'text/plain',
  });
  if (readme.ok) s = readme.value;
  return s;
}

interface VfsStore {
  vfs: VfsState;
  hydrated: boolean;
  rootId: NodeId;
  hydrate: () => Promise<void>;
  children: (parentId: NodeId) => VfsNode[];
  node: (id: NodeId) => VfsNode | undefined;
  path: (id: NodeId) => VfsNode[];
  createFolder: (parentId: NodeId, name: string) => NodeId | null;
  createTextFile: (parentId: NodeId, name: string, content: string) => Promise<NodeId | null>;
  readText: (id: NodeId) => Promise<string>;
  writeText: (id: NodeId, content: string) => Promise<void>;
  rename: (id: NodeId, name: string) => boolean;
  remove: (id: NodeId) => Promise<void>;
  move: (id: NodeId, newParentId: NodeId) => boolean;
  /** Apply a VFS state produced by the terminal interpreter. */
  applyVfs: (next: VfsState) => void;
  addBinary: (parentId: NodeId, name: string, blob: Blob) => Promise<NodeId | null>;
}

function persist(vfs: VfsState): void {
  void saveSlice('vfs', vfs);
}

export const useVfs = create<VfsStore>((set, get) => ({
  vfs: seedVfs(),
  hydrated: false,
  rootId: ROOT_ID,
  hydrate: async () => {
    const stored = await loadSlice<VfsState>('vfs');
    if (stored && stored.nodes[stored.rootId]) {
      set({ vfs: stored, rootId: stored.rootId, hydrated: true });
    } else {
      const seeded = seedVfs();
      persist(seeded);
      set({ vfs: seeded, hydrated: true });
    }
  },
  children: (parentId) => childrenOf(get().vfs, parentId),
  node: (id) => getNode(get().vfs, id),
  path: (id) => pathOf(get().vfs, id),
  createFolder: (parentId, name) => {
    const id = createId('dir');
    const r = createNode(get().vfs, parentId, name, { id, kind: 'folder' });
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return null;
    }
    set({ vfs: r.value });
    persist(r.value);
    return id;
  },
  createTextFile: async (parentId, name, content) => {
    const id = createId('file');
    const contentId = createId('content');
    const r = createNode(get().vfs, parentId, name, {
      id,
      kind: 'file',
      mime: 'text/plain',
      contentId,
      size: content.length,
    });
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return null;
    }
    await putContent(contentId, content);
    set({ vfs: r.value });
    persist(r.value);
    return id;
  },
  readText: async (id) => {
    const node = getNode(get().vfs, id);
    if (!node || node.kind !== 'file' || !node.contentId) return '';
    const raw = await getContent(node.contentId);
    if (typeof raw === 'string') return raw;
    if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
    return '';
  },
  writeText: async (id, content) => {
    const node = getNode(get().vfs, id);
    if (!node || node.kind !== 'file') return;
    const contentId = node.contentId ?? createId('content');
    await putContent(contentId, content);
    const r = setFileContentMeta(get().vfs, id, {
      contentId,
      size: content.length,
      mime: 'text/plain',
    });
    if (r.ok) {
      set({ vfs: r.value });
      persist(r.value);
    }
  },
  rename: (id, name) => {
    const r = renameOp(get().vfs, id, name);
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return false;
    }
    set({ vfs: r.value });
    persist(r.value);
    return true;
  },
  remove: async (id) => {
    // Clean up any content blobs owned by the subtree being removed.
    const vfs = get().vfs;
    const toDelete = Object.values(vfs.nodes).filter(
      (n) => n.kind === 'file' && n.contentId && isInSubtree(vfs, n.id, id),
    );
    const r = removeOp(vfs, id);
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return;
    }
    for (const f of toDelete) {
      if (f.kind === 'file' && f.contentId) await deleteContent(f.contentId);
    }
    set({ vfs: r.value });
    persist(r.value);
  },
  move: (id, newParentId) => {
    const r = moveOp(get().vfs, id, newParentId);
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return false;
    }
    set({ vfs: r.value });
    persist(r.value);
    return true;
  },
  applyVfs: (next) => {
    set({ vfs: next });
    persist(next);
  },
  addBinary: async (parentId, name, blob) => {
    const id = createId('file');
    const contentId = createId('content');
    const r = createNode(get().vfs, parentId, name, {
      id,
      kind: 'file',
      mime: blob.type,
      contentId,
      size: blob.size,
    });
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return null;
    }
    await putContent(contentId, await blobToArrayBuffer(blob));
    set({ vfs: r.value });
    persist(r.value);
    return id;
  },
}));

function isInSubtree(vfs: VfsState, nodeId: NodeId, ancestorId: NodeId): boolean {
  let cur: NodeId | null = nodeId;
  const seen = new Set<NodeId>();
  while (cur !== null) {
    if (cur === ancestorId) return true;
    if (seen.has(cur)) return false;
    seen.add(cur);
    cur = vfs.nodes[cur]?.parentId ?? null;
  }
  return false;
}
