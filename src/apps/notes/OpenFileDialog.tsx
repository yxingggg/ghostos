import { useMemo } from 'react';
import { useVfs } from '../../state/vfsStore';
import { pathOf } from '../../core/vfs/ops';
import { isTextLike } from '../../core/vfs/fileType';
import type { NodeId } from '../../core/vfs/types';

interface Props {
  onCancel: () => void;
  onOpen: (fileId: NodeId) => void;
}

/** Lists the virtual filesystem's text/Markdown files for opening in GraveNotes. */
export function OpenFileDialog({ onCancel, onOpen }: Props) {
  const vfs = useVfs((s) => s.vfs);

  const files = useMemo(() => {
    return Object.values(vfs.nodes)
      .filter((n) => n.kind === 'file' && isTextLike(n.name, n.mime))
      .map((n) => {
        const parts = pathOf(vfs, n.id);
        const path = parts.length <= 1 ? `/${n.name}` : '/' + parts.slice(1).map((p) => p.name).join('/');
        return { id: n.id, name: n.name, path };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [vfs]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Open file"
        className="flex max-h-[80%] w-full max-w-md flex-col rounded-sm border border-amethyst-600 bg-crypt-800 p-4 shadow-window"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-gothic text-xl text-spectral-500">Open a text file</h2>
        {files.length === 0 ? (
          <p className="font-pixel text-base text-bone-500">
            No text or Markdown files yet. Create one with Save As, or in Tomb Explorer.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onOpen(f.id)}
                  className="block w-full truncate rounded-sm px-2 py-1.5 text-left font-pixel text-base text-bone-100 hover:bg-amethyst-600/40"
                  title={f.path}
                >
                  {f.path}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
