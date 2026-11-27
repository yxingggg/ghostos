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
  /**
   * Write text to a file. Resolves to a result indicating whether the content
   * was durably persisted to IndexedDB (false = only in-memory fallback).
   */
  writeText: (id: NodeId, content: string) => Promise<{ ok: boolean; durable: boolean; error?: string }>;
  /** All folder nodes (for Save-As destination pickers). */
  folders: () => VfsNode[];
  /**
   * Save text as a file under a folder. If a sibling of the same name exists:
   * overwrite it when `overwrite` is true, otherwise fail. Returns the file id
   * (new or existing) on success, or null on failure (error surfaced via toast).
   */
  saveTextAs: (
    parentId: NodeId,
    name: string,
    content: string,
    opts?: { overwrite?: boolean },
  ) => Promise<NodeId | null>;
  rename: (id: NodeId, name: string) => boolean;
  remove: (id: NodeId) => Promise<void>;
  move: (id: NodeId, newParentId: NodeId) => boolean;
  /** Duplicate a file (copies content) or an empty folder, within its parent. */
  duplicate: (id: NodeId) => Promise<NodeId | null>;
  /** Read a file's raw content bytes, or null if it has none. */
  readBinary: (id: NodeId) => Promise<ArrayBuffer | null>;
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
    await saveSlice('vfs', r.value);
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
    if (!node || node.kind !== 'file') {
      return { ok: false, durable: false, error: 'File no longer exists.' };
    }
    const contentId = node.contentId ?? createId('content');
    // Preserve the file's existing MIME; only assume text/plain for brand-new content.
    const mime = node.mime ?? 'text/plain';
    const contentDurable = await putContent(contentId, content);
    const r = setFileContentMeta(get().vfs, id, {
      contentId,
      size: content.length,
      mime,
    });
    if (!r.ok) {
      return { ok: false, durable: false, error: r.error };
    }
    set({ vfs: r.value });
    // Await the node-index write so we report real durability, not a guess.
    const sliceDurable = await saveSlice('vfs', r.value);
    return { ok: true, durable: contentDurable && sliceDurable };
  },
  folders: () => Object.values(get().vfs.nodes).filter((n) => n.kind === 'folder'),
  saveTextAs: async (parentId, name, content, opts) => {
    const existing = childrenOf(get().vfs, parentId).find((n) => n.name === name);
    if (existing) {
      if (existing.kind !== 'file') {
        useToasts.getState().push(`"${name}" is a folder here.`, 'error');
        return null;
      }
      if (!opts?.overwrite) {
        useToasts.getState().push(`"${name}" already exists.`, 'error');
        return null;
      }
      // Overwrite the existing file in place (same id — no duplicate).
      const res = await get().writeText(existing.id, content);
      if (!res.ok) {
        useToasts.getState().push(res.error ?? 'Save failed.', 'error');
        return null;
      }
      return existing.id;
    }
    return get().createTextFile(parentId, name, content);
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
  duplicate: async (id) => {
    const node = getNode(get().vfs, id);
    if (!node || node.parentId === null) {
      useToasts.getState().push('Cannot duplicate this item.', 'error');
      return null;
    }
    const parentId = node.parentId;
    const siblings = childrenOf(get().vfs, parentId).map((n) => n.name);
    const copyName = duplicateName(siblings, node.name);
    if (node.kind === 'folder') {
      // Duplicate as an empty folder (deep copy of trees is out of scope here).
      const newId = createId('dir');
      const r = createNode(get().vfs, parentId, copyName, { id: newId, kind: 'folder' });
      if (!r.ok) {
        useToasts.getState().push(r.error, 'error');
        return null;
      }
      set({ vfs: r.value });
      persist(r.value);
      return newId;
    }
    // File: copy content into a fresh content entry.
    const newId = createId('file');
    const newContentId = createId('content');
    const raw = node.contentId ? await getContent(node.contentId) : undefined;
    const r = createNode(get().vfs, parentId, copyName, {
      id: newId,
      kind: 'file',
      ...(node.mime ? { mime: node.mime } : {}),
      contentId: newContentId,
      size: node.size,
    });
    if (!r.ok) {
      useToasts.getState().push(r.error, 'error');
      return null;
    }
    await putContent(newContentId, raw ?? '');
    set({ vfs: r.value });
    persist(r.value);
    return newId;
  },
  readBinary: async (id) => {
    const node = getNode(get().vfs, id);
    if (!node || node.kind !== 'file' || !node.contentId) return null;
    const raw = await getContent(node.contentId);
    if (raw instanceof ArrayBuffer) return raw;
    if (typeof raw === 'string') return new TextEncoder().encode(raw).buffer;
    return null;
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

/** Produce a non-colliding "copy" name, preserving the file extension. */
function duplicateName(siblings: string[], name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = `${stem} copy${ext}`;
  let i = 2;
  while (siblings.includes(candidate)) {
    candidate = `${stem} copy ${i}${ext}`;
    i += 1;
  }
  return candidate;
}

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
