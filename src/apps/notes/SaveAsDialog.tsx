import { useMemo, useState } from 'react';
import { useVfs } from '../../state/vfsStore';
import { pathOf, childrenOf } from '../../core/vfs/ops';
import type { NodeId } from '../../core/vfs/types';

interface Props {
  initialName: string;
  onCancel: () => void;
  /** Called with the chosen destination folder, final file name, and overwrite intent. */
  onSave: (parentId: NodeId, name: string, overwrite: boolean) => void | Promise<void>;
}

type Ext = '.txt' | '.md';

/** Split a name into a stem and a .txt/.md extension (defaulting to .txt). */
function splitName(name: string): { stem: string; ext: Ext } {
  if (name.toLowerCase().endsWith('.md')) return { stem: name.slice(0, -3), ext: '.md' };
  if (name.toLowerCase().endsWith('.txt')) return { stem: name.slice(0, -4), ext: '.txt' };
  return { stem: name, ext: '.txt' };
}

export function SaveAsDialog({ initialName, onCancel, onSave }: Props) {
  const vfs = useVfs((s) => s.vfs);
  const rootId = useVfs((s) => s.rootId);
  const init = splitName(initialName);

  const [stem, setStem] = useState(init.stem);
  const [ext, setExt] = useState<Ext>(init.ext);
  const [parentId, setParentId] = useState<NodeId>(() => {
    // Default to a "documents" folder if one exists, else root.
    const docs = Object.values(vfs.nodes).find(
      (n) => n.kind === 'folder' && n.name.toLowerCase() === 'documents',
    );
    return docs?.id ?? rootId;
  });
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Folder choices as indented paths, so nested destinations are clear.
  const folderChoices = useMemo(() => {
    return Object.values(vfs.nodes)
      .filter((n) => n.kind === 'folder')
      .map((n) => {
        const parts = pathOf(vfs, n.id);
        const label = parts.length <= 1 ? '/' : '/' + parts.slice(1).map((p) => p.name).join('/');
        return { id: n.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vfs]);

  const finalName = `${stem.trim()}${ext}`;
  const siblingNames = childrenOf(vfs, parentId).map((n) => n.name);
  const collides = siblingNames.includes(finalName);
  const nameValid = stem.trim().length > 0 && !stem.includes('/');

  function handleSave() {
    if (!nameValid) return;
    if (collides && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    void onSave(parentId, finalName, collides && confirmOverwrite);
  }

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save As"
        className="w-full max-w-md rounded-sm border border-amethyst-600 bg-crypt-800 p-4 shadow-window"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-gothic text-xl text-spectral-500">Save As</h2>

        <label className="mb-2 flex flex-col gap-1 font-pixel text-base">
          <span className="text-bone-300">File name</span>
          <div className="flex gap-1">
            <input
              autoFocus
              aria-label="File name"
              value={stem}
              onChange={(e) => {
                setStem(e.target.value);
                setConfirmOverwrite(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                else if (e.key === 'Escape') onCancel();
              }}
              className="min-w-0 flex-1 rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 text-bone-100 outline-none focus:border-amethyst-500"
            />
            <select
              aria-label="File extension"
              value={ext}
              onChange={(e) => {
                setExt(e.target.value as Ext);
                setConfirmOverwrite(false);
              }}
              className="rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 text-bone-100 outline-none focus:border-amethyst-500"
            >
              <option value=".txt">.txt</option>
              <option value=".md">.md</option>
            </select>
          </div>
        </label>

        <label className="mb-3 flex flex-col gap-1 font-pixel text-base">
          <span className="text-bone-300">Destination folder</span>
          <select
            aria-label="Destination folder"
            value={parentId}
            onChange={(e) => {
              setParentId(e.target.value);
              setConfirmOverwrite(false);
            }}
            className="rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 text-bone-100 outline-none focus:border-amethyst-500"
          >
            {folderChoices.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        {collides && (
          <p className="mb-2 font-pixel text-sm text-blood-500" role="alert">
            "{finalName}" already exists here.{' '}
            {confirmOverwrite ? 'Click Overwrite to replace it.' : 'Saving will ask to overwrite.'}
          </p>
        )}
        {!nameValid && (
          <p className="mb-2 font-pixel text-sm text-blood-500">Enter a valid file name.</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!nameValid}
            className="rounded-sm border border-amethyst-600 bg-amethyst-600/40 px-3 py-1 font-pixel text-base text-bone-100 hover:bg-amethyst-600/60 disabled:opacity-40"
          >
            {collides && confirmOverwrite ? 'Overwrite' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
