import { pathOf } from '../../core/vfs/ops';
import { associate } from '../../core/vfs/fileType';
import type { NodeId, VfsState } from '../../core/vfs/types';
import { Overlay } from './Overlay';

export interface NodeInfo {
  name: string;
  kind: 'file' | 'folder';
  path: string;
  type: string;
  size: number;
  created: number;
  modified: number;
  childCount?: number;
}

/** Pure: compute the displayable properties of a VFS node. */
export function nodeProperties(vfs: VfsState, id: NodeId): NodeInfo | null {
  const n = vfs.nodes[id];
  if (!n) return null;
  const parts = pathOf(vfs, id);
  const pathStr =
    parts.length <= 1 ? '/' : '/' + parts.slice(1).map((p) => p.name).join('/');
  if (n.kind === 'folder') {
    const childCount = Object.values(vfs.nodes).filter((c) => c.parentId === id).length;
    return {
      name: n.name,
      kind: 'folder',
      path: pathStr,
      type: 'Folder',
      size: 0,
      created: n.createdAt,
      modified: n.updatedAt,
      childCount,
    };
  }
  const assoc = associate(n.name, n.mime);
  return {
    name: n.name,
    kind: 'file',
    path: pathStr,
    type: n.mime ?? `${assoc.kind} file`,
    size: n.size,
    created: n.createdAt,
    modified: n.updatedAt,
  };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function PropertiesDialog({ info, onClose }: { info: NodeInfo; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ['Name', info.name],
    ['Type', info.type],
    ['Location', info.path],
    ...(info.kind === 'file'
      ? ([['Size', fmtBytes(info.size)]] as Array<[string, string]>)
      : ([['Items', String(info.childCount ?? 0)]] as Array<[string, string]>)),
    ['Created', new Date(info.created).toLocaleString()],
    ['Modified', new Date(info.modified).toLocaleString()],
  ];
  return (
    <Overlay onClose={onClose}>
      <h2 className="mb-3 font-gothic text-xl text-spectral-500">Properties</h2>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 font-pixel text-base">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-bone-500">{k}</dt>
            <dd className="truncate text-bone-100" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Overlay>
  );
}
