// Virtual File System — domain types.
// A single-rooted tree persisted as a flat node map keyed by id.

export type NodeId = string;

export interface VfsNodeBase {
  id: NodeId;
  name: string;
  parentId: NodeId | null;
  createdAt: number;
  updatedAt: number;
}

export interface FolderNode extends VfsNodeBase {
  kind: 'folder';
}

export interface FileNode extends VfsNodeBase {
  kind: 'file';
  /** Key into the content store for large/binary bodies. */
  contentId?: string;
  size: number;
  mime?: string;
}

export type VfsNode = FolderNode | FileNode;

export interface VfsState {
  nodes: Record<NodeId, VfsNode>;
  rootId: NodeId;
}

/** Discriminated result used for fallible operations (no throwing). */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}
