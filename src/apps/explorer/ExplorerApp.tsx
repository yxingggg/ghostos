import { useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useVfs } from '../../state/vfsStore';
import type { NodeId } from '../../core/vfs/types';
import { FileIcon, FolderIcon } from '../../assets/icons';

export function ExplorerApp(_props: AppComponentProps) {
  const rootId = useVfs((s) => s.rootId);
  const children = useVfs((s) => s.children);
  const path = useVfs((s) => s.path);
  const createFolder = useVfs((s) => s.createFolder);
  const createTextFile = useVfs((s) => s.createTextFile);
  const rename = useVfs((s) => s.rename);
  const remove = useVfs((s) => s.remove);
  // Subscribe to vfs so the view re-renders on changes.
  useVfs((s) => s.vfs);

  const [cwd, setCwd] = useState<NodeId>(rootId);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [renaming, setRenaming] = useState<NodeId | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const items = children(cwd);
  const breadcrumb = path(cwd);

  return (
    <div className="flex h-full flex-col bg-crypt-800">
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
            if (!selected) return;
            const node = items.find((i) => i.id === selected);
            setRenaming(selected);
            setRenameValue(node?.name ?? '');
          }}
        >
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
                  onDoubleClick={() => {
                    if (n.kind === 'folder') {
                      setCwd(n.id);
                      setSelected(null);
                    }
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
    </div>
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
