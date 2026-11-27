// Virtual File System — pure operations.
// Invariants (property-tested in ops.test.ts):
//  - every non-root node has exactly one existing parent (single-parent tree)
//  - following parentId from any node reaches the root (acyclic)
//  - siblings never share a name
//  - remove(folder) deletes the whole subtree
//  - move never creates a cycle (a folder cannot be placed inside its own descendant)

import {
  FileNode,
  FolderNode,
  NodeId,
  Result,
  VfsNode,
  VfsState,
  err,
  ok,
} from './types';

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export function createVfs(rootId: NodeId, clock: Clock = systemClock): VfsState {
  const t = clock.now();
  const root: FolderNode = {
    id: rootId,
    name: '/',
    parentId: null,
    kind: 'folder',
    createdAt: t,
    updatedAt: t,
  };
  return { nodes: { [rootId]: root }, rootId };
}

export function getNode(state: VfsState, id: NodeId): VfsNode | undefined {
  return state.nodes[id];
}

export function childrenOf(state: VfsState, parentId: NodeId): VfsNode[] {
  return Object.values(state.nodes)
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      // Folders first, then alphabetical.
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Path from root to the node (inclusive), or empty if the node is missing. */
export function pathOf(state: VfsState, id: NodeId): VfsNode[] {
  const path: VfsNode[] = [];
  let current = state.nodes[id];
  const seen = new Set<NodeId>();
  while (current) {
    if (seen.has(current.id)) break; // defensive against cycles
    seen.add(current.id);
    path.unshift(current);
    if (current.parentId === null) break;
    current = state.nodes[current.parentId];
  }
  return path;
}

/** True if `maybeDescendant` is `ancestorId` or lies anywhere beneath it. */
export function isDescendant(
  state: VfsState,
  ancestorId: NodeId,
  maybeDescendant: NodeId,
): boolean {
  let current: NodeId | null = maybeDescendant;
  const seen = new Set<NodeId>();
  while (current !== null) {
    if (current === ancestorId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    const node: VfsNode | undefined = state.nodes[current];
    if (!node) return false;
    current = node.parentId;
  }
  return false;
}

function nameTaken(
  state: VfsState,
  parentId: NodeId,
  name: string,
  exceptId?: NodeId,
): boolean {
  return Object.values(state.nodes).some(
    (n) => n.parentId === parentId && n.id !== exceptId && n.name === name,
  );
}

function validateName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) return err('Name cannot be empty.');
  if (trimmed.includes('/')) return err('Name cannot contain "/".');
  if (trimmed === '.' || trimmed === '..') return err('Reserved name.');
  return ok(trimmed);
}

export interface CreateOptions {
  id: NodeId;
  kind: 'folder' | 'file';
  mime?: string;
  contentId?: string;
  size?: number;
}

export function createNode(
  state: VfsState,
  parentId: NodeId,
  name: string,
  opts: CreateOptions,
  clock: Clock = systemClock,
): Result<VfsState> {
  const parent = state.nodes[parentId];
  if (!parent) return err('Parent folder does not exist.');
  if (parent.kind !== 'folder') return err('Parent is not a folder.');
  const validated = validateName(name);
  if (!validated.ok) return validated;
  const finalName = validated.value;
  if (nameTaken(state, parentId, finalName)) {
    return err(`"${finalName}" already exists here.`);
  }
  if (state.nodes[opts.id]) return err('Node id already in use.');
  const t = clock.now();
  const node: VfsNode =
    opts.kind === 'folder'
      ? { id: opts.id, name: finalName, parentId, kind: 'folder', createdAt: t, updatedAt: t }
      : {
          id: opts.id,
          name: finalName,
          parentId,
          kind: 'file',
          createdAt: t,
          updatedAt: t,
          size: opts.size ?? 0,
          ...(opts.mime ? { mime: opts.mime } : {}),
          ...(opts.contentId ? { contentId: opts.contentId } : {}),
        };
  return ok({ ...state, nodes: { ...state.nodes, [opts.id]: node } });
}

export function rename(
  state: VfsState,
  id: NodeId,
  name: string,
  clock: Clock = systemClock,
): Result<VfsState> {
  const node = state.nodes[id];
  if (!node) return err('Node does not exist.');
  if (node.parentId === null) return err('Cannot rename the root.');
  const validated = validateName(name);
  if (!validated.ok) return validated;
  const finalName = validated.value;
  if (nameTaken(state, node.parentId, finalName, id)) {
    return err(`"${finalName}" already exists here.`);
  }
  const updated: VfsNode = { ...node, name: finalName, updatedAt: clock.now() };
  return ok({ ...state, nodes: { ...state.nodes, [id]: updated } });
}

/** Remove a node and, for folders, all of its descendants. */
export function remove(state: VfsState, id: NodeId): Result<VfsState> {
  const node = state.nodes[id];
  if (!node) return err('Node does not exist.');
  if (node.parentId === null) return err('Cannot remove the root.');

  const toDelete = new Set<NodeId>([id]);
  // Breadth-first collect of the subtree.
  let frontier: NodeId[] = [id];
  while (frontier.length > 0) {
    const next: NodeId[] = [];
    for (const parentId of frontier) {
      for (const child of Object.values(state.nodes)) {
        if (child.parentId === parentId && !toDelete.has(child.id)) {
          toDelete.add(child.id);
          next.push(child.id);
        }
      }
    }
    frontier = next;
  }

  const nodes: Record<NodeId, VfsNode> = {};
  for (const [nid, n] of Object.entries(state.nodes)) {
    if (!toDelete.has(nid)) nodes[nid] = n;
  }
  return ok({ ...state, nodes });
}

export function move(
  state: VfsState,
  id: NodeId,
  newParentId: NodeId,
  clock: Clock = systemClock,
): Result<VfsState> {
  const node = state.nodes[id];
  if (!node) return err('Node does not exist.');
  if (node.parentId === null) return err('Cannot move the root.');
  const newParent = state.nodes[newParentId];
  if (!newParent) return err('Destination folder does not exist.');
  if (newParent.kind !== 'folder') return err('Destination is not a folder.');
  if (newParentId === id) return err('Cannot move a node into itself.');
  // Reject moving a folder into its own descendant (would create a cycle).
  if (isDescendant(state, id, newParentId)) {
    return err('Cannot move a folder into its own descendant.');
  }
  if (nameTaken(state, newParentId, node.name, id)) {
    return err(`"${node.name}" already exists in the destination.`);
  }
  const updated: VfsNode = { ...node, parentId: newParentId, updatedAt: clock.now() };
  return ok({ ...state, nodes: { ...state.nodes, [id]: updated } });
}

/** Update a file node's content metadata (size/mime/contentId). */
export function setFileContentMeta(
  state: VfsState,
  id: NodeId,
  meta: { contentId?: string; size: number; mime?: string },
  clock: Clock = systemClock,
): Result<VfsState> {
  const node = state.nodes[id];
  if (!node) return err('Node does not exist.');
  if (node.kind !== 'file') return err('Not a file.');
  const updated: FileNode = {
    ...node,
    size: meta.size,
    updatedAt: clock.now(),
    ...(meta.mime ? { mime: meta.mime } : {}),
    ...(meta.contentId ? { contentId: meta.contentId } : {}),
  };
  return ok({ ...state, nodes: { ...state.nodes, [id]: updated } });
}
