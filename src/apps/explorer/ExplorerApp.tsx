import { useEffect, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { getApp } from '../registry';
import { useVfs } from '../../state/vfsStore';
import { useWm } from '../../state/wmStore';
import { useToasts } from '../../state/toastStore';
import type { NodeId, VfsNode } from '../../core/vfs/types';
import { associate } from '../../core/vfs/fileType';
import { FileIcon, FolderIcon } from '../../assets/icons';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { nodeProperties, PropertiesDialog } from './PropertiesDialog';
import { Overlay } from './Overlay';

export function ExplorerApp(_props: AppComponentProps) {
  const rootId = useVfs((s) => s.rootId);
  const children = useVfs((s) => s.children);
  const path = useVfs((s) => s.path);
  const node = useVfs((s) => s.node);
  const createFolder = useVfs((s) => s.createFolder);
  const createTextFile = useVfs((s) => s.createTextFile);
  const rename = useVfs((s) => s.rename);
  const remove = useVfs((s) => s.remove);
  const duplicate = useVfs((s) => s.duplicate);
  const readBinary = useVfs((s) => s.readBinary);
  // Subscribe to vfs so the view re-renders on changes.
  useVfs((s) => s.vfs);
  const openWindow = useWm((s) => s.open);
  const pushToast = useToasts((s) => s.push);

  const [cwd, setCwd] = useState<NodeId>(rootId);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [renaming, setRenaming] = useState<NodeId | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: NodeId } | null>(null);
  const [openWith, setOpenWith] = useState<NodeId | null>(null);
  const [propsFor, setPropsFor] = useState<NodeId | null>(null);

  const items = children(cwd);
  const breadcrumb = path(cwd);

  // Keep selection valid if the selected node disappears.
  useEffect(() => {
    if (selected && !node(selected)) setSelected(null);
  }, [selected, node]);

  /** Open a node: navigate into folders; launch the associated app for files. */
  function openNode(n: VfsNode, forceAppId?: string): void {
    if (n.kind === 'folder') {
      setCwd(n.id);
      setSelected(null);
      return;
    }
    const assoc = associate(n.name, n.mime);
    const appId = forceAppId ?? assoc.appId;
    if (!appId) {
      pushToast(`No application can open "${n.name}" (unsupported type).`, 'error');
      return;
    }
    const app = getApp(appId);
    if (!app) {
      pushToast('That application is not available.', 'error');
      return;
    }
    openWindow({
      appId,
      title: `${app.name} — ${n.name}`,
      ...(app.defaultBounds ? { bounds: app.defaultBounds } : {}),
      props: { vfsFileId: n.id },
    });
  }

  async function doDownload(id: NodeId): Promise<void> {
    const n = node(id);
    if (!n || n.kind !== 'file') return;
    const buf = await readBinary(id);
    const blob = new Blob([buf ?? new ArrayBuffer(0)], {
      type: n.mime ?? 'application/octet-stream',
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = n.name;
    a.click();
    URL.revokeObjectURL(href);
  }

  function startRename(id: NodeId): void {
    const n = node(id);
    setRenaming(id);
    setRenameValue(n?.name ?? '');
  }

  function contextItems(id: NodeId): MenuItem[] {
    const n = node(id);
    if (!n) return [];
    const isFile = n.kind === 'file';
    return [
      { label: 'Open', onSelect: () => openNode(n) },
      ...(isFile
        ? [{ label: 'Open with…', onSelect: () => setOpenWith(id) }]
        : []),
      { label: 'Rename', onSelect: () => startRename(id) },
      { label: 'Duplicate', onSelect: () => void duplicate(id) },
      ...(isFile
        ? [{ label: 'Download', onSelect: () => void doDownload(id) }]
        : []),
      { label: 'Delete', danger: true, onSelect: () => { void remove(id); setSelected(null); } },
      { label: 'Properties', onSelect: () => setPropsFor(id) },
    ];
  }

  return (
    <div
      className="flex h-full flex-col bg-crypt-800"
      onClick={() => setMenu(null)}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-crypt-500 p-1.5">
        <ToolButton onClick={() => createFolder(cwd, nextName(items.map((i) => i.name), 'New Folder'))}>
          New Folder
        </ToolButton>
        <ToolButton
          onClick={() => void createTextFile(cwd, nextName(items.map((i) => i.name), 'untitled.txt'), '')}
        >
          New File
        </ToolButton>
        <ToolButton
          disabled={!selected}
          onClick={() => {
            const n = selected ? node(selected) : undefined;
            if (n) openNode(n);
          }}
        >
          Open
        </ToolButton>
        <ToolButton disabled={!selected} onClick={() => selected && startRename(selected)}>
          Rename
        </ToolButton>
        <ToolButton
          disabled={!selected}
          danger
          onClick={() => {
            if (selected) void remove(selected);
            setSelected(null);
          }}
        >
          Delete
        </ToolButton>
      </div>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 border-b border-crypt-500 px-2 py-1 font-pixel text-base text-bone-300">
        {breadcrumb.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-bone-500">/</span>}
            <button
              type="button"
              onClick={() => setCwd(n.id)}
              className="hover:text-spectral-500"
            >
              {n.parentId === null ? 'root' : n.name}
            </button>
          </span>
        ))}
      </nav>

      {/* File grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="grid h-full place-items-center font-pixel text-bone-500">
            This crypt is empty.
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  aria-label={n.name}
                  aria-selected={selected === n.id}
                  onClick={() => setSelected(n.id)}
                  onDoubleClick={() => openNode(n)}
                  onKeyDown={(e) => {
                    if (renaming === n.id) return;
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      openNode(n);
                    } else if (e.key === 'Delete') {
                      e.preventDefault();
                      void remove(n.id);
                      setSelected(null);
                    } else if (e.key === 'F2') {
                      e.preventDefault();
                      startRename(n.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelected(n.id);
                    setMenu({ x: e.clientX, y: e.clientY, nodeId: n.id });
                  }}
                  className={[
                    'flex w-full flex-col items-center gap-1 rounded p-2 text-center',
                    selected === n.id ? 'bg-amethyst-600/30 ring-1 ring-amethyst-500' : 'hover:bg-crypt-700',
                  ].join(' ')}
                >
                  {n.kind === 'folder' ? (
                    <FolderIcon className="text-3xl text-teal-400" />
                  ) : (
                    <FileIcon className="text-3xl text-bone-300" />
                  )}
                  {renaming === n.id ? (
                    <input
                      autoFocus
                      aria-label="New name"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        if (renameValue.trim()) rename(n.id, renameValue.trim());
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          if (renameValue.trim()) rename(n.id, renameValue.trim());
                          setRenaming(null);
                        } else if (e.key === 'Escape') {
                          setRenaming(null);
                        }
                      }}
                      className="w-full bg-crypt-900 px-1 text-center font-pixel text-sm text-bone-100 outline-none"
                    />
                  ) : (
                    <span className="w-full truncate font-pixel text-sm text-bone-100">{n.name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={contextItems(menu.nodeId)}
          onClose={() => setMenu(null)}
        />
      )}

      {openWith &&
        (() => {
          const n = node(openWith);
          if (!n || n.kind !== 'file') return null;
          return (
            <OpenWithDialog
              fileName={n.name}
              onPick={(appId) => {
                openNode(n, appId);
                setOpenWith(null);
              }}
              onClose={() => setOpenWith(null)}
            />
          );
        })()}

      {propsFor &&
        (() => {
          const info = nodeProperties(useVfs.getState().vfs, propsFor);
          if (!info) return null;
          return <PropertiesDialog info={info} onClose={() => setPropsFor(null)} />;
        })()}
    </div>
  );
}

/** "Open with" chooser offering the compatible apps for a file. */
function OpenWithDialog({
  fileName,
  onPick,
  onClose,
}: {
  fileName: string;
  onPick: (appId: string) => void;
  onClose: () => void;
}) {
  const choices: Array<{ appId: string; label: string }> = [
    { appId: 'notes', label: 'GraveNotes (text editor)' },
    { appId: 'music', label: 'DeadWave (audio player)' },
    { appId: 'imageviewer', label: 'Spectral Viewer (image)' },
  ];
  return (
    <Overlay onClose={onClose}>
      <h2 className="mb-2 font-gothic text-xl text-spectral-500">Open "{fileName}" with…</h2>
      <ul className="flex flex-col gap-1">
        {choices.map((c) => (
          <li key={c.appId}>
            <button
              type="button"
              onClick={() => onPick(c.appId)}
              className="w-full rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1.5 text-left font-pixel text-base text-bone-100 hover:bg-crypt-600"
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </Overlay>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 font-pixel text-base bevel-out',
        'disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'text-bone-200 hover:bg-blood-500 hover:text-white' : 'text-bone-200 hover:bg-crypt-600',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Produce a non-colliding name by appending a counter if needed. */
function nextName(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  let i = 2;
  while (existing.includes(`${stem} ${i}${ext}`)) i += 1;
  return `${stem} ${i}${ext}`;
}
