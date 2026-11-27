import { useEffect, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useVfs } from '../../state/vfsStore';
import { extensionOf } from '../../core/vfs/fileType';

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

/** A basic preview for supported image files stored in the VFS. */
export function ImageViewerApp({ props }: AppComponentProps) {
  const fileId = typeof props?.vfsFileId === 'string' ? props.vfsFileId : null;
  const node = useVfs((s) => (fileId ? s.node(fileId) : undefined));
  const readBinary = useVfs((s) => s.readBinary);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) {
      setError('No image selected.');
      return;
    }
    let revoke: string | null = null;
    let cancelled = false;
    const n = node;
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
      revoke = objectUrl;
      setUrl(objectUrl);
      setError(null);
    });
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  return (
    <div className="flex h-full flex-col bg-crypt-900">
      <div className="border-b border-crypt-500 px-3 py-1 font-pixel text-base text-bone-300">
        {node && node.kind === 'file' ? node.name : 'Spectral Viewer'}
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-3">
        {error ? (
          <p className="font-pixel text-bone-500">{error}</p>
        ) : url ? (
          <img
            src={url}
            alt={node && node.kind === 'file' ? node.name : 'image preview'}
            className="max-h-full max-w-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <p className="font-pixel text-bone-500">Conjuring image…</p>
        )}
      </div>
    </div>
  );
}
