import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useVfs } from '../../state/vfsStore';
import { useToasts } from '../../state/toastStore';
import { extensionOf } from '../../core/vfs/fileType';
import { SAMPLE_IMAGE_NAME, sampleImageBytes } from '../../core/assets/sampleImage';
import { OpenImageDialog } from './OpenImageDialog';

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;

export function ImageViewerApp({ props }: AppComponentProps) {
  const nodeOf = useVfs((s) => s.node);
  const readBinary = useVfs((s) => s.readBinary);
  const rootId = useVfs((s) => s.rootId);
  const addBinary = useVfs((s) => s.addBinary);
  const push = useToasts((s) => s.push);

  const [fileId, setFileId] = useState<string | null>(
    typeof props?.vfsFileId === 'string' ? props.vfsFileId : null,
  );
  const node = useVfs((s) => (fileId ? s.node(fileId) : undefined));
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // View transform.
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  // Load the bound image's bytes into an object URL.
  useEffect(() => {
    if (!fileId) {
      setUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return null;
      });
      urlRef.current = null;
      setError(null);
      return;
    }
    let cancelled = false;
    const n = nodeOf(fileId);
    if (!n || n.kind !== 'file') {
      setError('This image no longer exists.');
      return;
    }
    const mime = n.mime ?? EXT_MIME[extensionOf(n.name)] ?? 'application/octet-stream';
    void readBinary(fileId).then((buf) => {
      if (cancelled) return;
      if (!buf || buf.byteLength === 0) {
        setError('This image is empty.');
        return;
      }
      const objectUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
      setError(null);
      setZoom(1);
      setRotation(0);
      setFit(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function importFiles(files: FileList | File[] | null): Promise<void> {
    if (!files) return;
    let opened: string | null = null;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !IMAGE_EXT.test(file.name)) {
        push(`"${file.name}" is not a supported image.`, 'error');
        continue;
      }
      // Store into the VFS so the image also appears in Tomb Explorer.
      const id = await addBinary(rootId, file.name, file);
      if (id) opened = id;
    }
    if (opened) setFileId(opened);
  }

  async function loadSample(): Promise<void> {
    const blob = new Blob([sampleImageBytes()], { type: 'image/svg+xml' });
    const id = await addBinary(rootId, SAMPLE_IMAGE_NAME, blob);
    if (id) setFileId(id);
    else push('Could not load the sample image.', 'error');
  }

  const title = node && node.kind === 'file' ? node.name : 'Spectral Viewer';

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-crypt-900"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void importFiles(e.dataTransfer.files);
      }}
    >
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-crypt-500 p-1.5">
        <ViewerBtn onClick={() => setShowOpen(true)}>Open Image…</ViewerBtn>
        <ViewerBtn onClick={() => fileInputRef.current?.click()}>Import…</ViewerBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void importFiles(e.target.files)}
        />
        <span className="mx-1 w-px self-stretch bg-crypt-500" aria-hidden="true" />
        <ViewerBtn disabled={!url} onClick={() => { setFit(false); setZoom((z) => Math.min(8, z * 1.25)); }} label="Zoom in">＋</ViewerBtn>
        <ViewerBtn disabled={!url} onClick={() => { setFit(false); setZoom((z) => Math.max(0.1, z / 1.25)); }} label="Zoom out">－</ViewerBtn>
        <ViewerBtn disabled={!url} onClick={() => setRotation((r) => (r + 90) % 360)} label="Rotate">⟳</ViewerBtn>
        <ViewerBtn disabled={!url} onClick={() => { setFit(true); setZoom(1); }} label="Fit to window">Fit</ViewerBtn>
        <ViewerBtn disabled={!url} onClick={() => { setFit(false); setZoom(1); }} label="Actual size">1:1</ViewerBtn>
        <span className="ml-auto truncate px-1 font-pixel text-sm text-bone-500" title={title}>
          {title}
          {url ? ` · ${Math.round(zoom * 100)}%` : ''}
        </span>
      </div>

      {/* Stage */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-3">
        {error ? (
          <p className="font-pixel text-blood-500">{error}</p>
        ) : url ? (
          <img
            src={url}
            alt={title}
            draggable={false}
            className={fit ? 'max-h-full max-w-full object-contain' : 'max-w-none'}
            style={{
              transform: `rotate(${rotation}deg)` + (fit ? '' : ` scale(${zoom})`),
              transformOrigin: 'center',
              imageRendering: 'auto',
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-gothic text-xl text-spectral-500">No image summoned.</p>
            <p className="max-w-xs font-pixel text-base text-bone-400">
              Open an image from the filesystem, import a local file (or drag one here) — or
              conjure the original sample:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <ViewerBtn onClick={() => void loadSample()}>View Sample Image</ViewerBtn>
              <ViewerBtn onClick={() => fileInputRef.current?.click()}>Import an image</ViewerBtn>
            </div>
          </div>
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-spectral-500 bg-crypt-900/70 font-pixel text-xl text-spectral-500">
          Drop images to import
        </div>
      )}

      {showOpen && (
        <OpenImageDialog
          onCancel={() => setShowOpen(false)}
          onOpen={(id) => {
            setFileId(id);
            setShowOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ViewerBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...(label ? { 'aria-label': label, title: label } : {})}
      className="shrink-0 rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600 disabled:opacity-40 bevel-out"
    >
      {children}
    </button>
  );
}
