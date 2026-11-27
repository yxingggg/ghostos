import { useEffect, useState } from 'react';
import { loadSlice, saveSlice } from '../state/persist';
import { useVfs } from '../state/vfsStore';
import { childrenOf } from '../core/vfs/ops';
import { SAMPLE_IMAGE_NAME, sampleImageBytes } from '../core/assets/sampleImage';
import { GhostMascot, GhostLogo } from '../assets/brand';
import { prefersReducedMotion, useSettings } from '../state/settingsStore';

interface Props {
  onOpenApp: (appId: string, props?: Record<string, unknown>) => void;
}

const README_BODY = `Welcome to GhostOS — a haunted retro-futuristic desktop in your browser.

Everything here runs offline and your work is saved locally (no account, no server).

Try this:
  • Open Tomb Explorer to browse your files.
  • Open a .txt or .md file to edit it in GraveNotes (Save As makes new files).
  • Launch DeadWave and press a demo track to hear original synth music.
  • Ask the Spirit Assistant for help — it works offline.

Your desktop and files are restored automatically each visit via Ghost Memory.`;

const SCRATCH_BODY = `# Spectral Notes

A Markdown scratchpad. Edit me in GraveNotes and press Ctrl/Cmd+S.

- [ ] Explore the crypt
- [ ] Summon a demo track
- [ ] Customize the wallpaper in Settings
`;

/** Seed a few sample files into the VFS on first launch (idempotent). */
async function seedSamples(): Promise<void> {
  const vfs = useVfs.getState();
  const state = vfs.vfs;
  const home = Object.values(state.nodes).find(
    (n) => n.kind === 'folder' && n.name === 'home',
  );
  const docs = home
    ? childrenOf(state, home.id).find((n) => n.kind === 'folder' && n.name === 'documents')
    : undefined;
  const dest = docs?.id ?? vfs.rootId;
  const existing = childrenOf(vfs.vfs, dest).map((n) => n.name);
  if (!existing.includes('WELCOME.txt')) await vfs.createTextFile(dest, 'WELCOME.txt', README_BODY);
  if (!existing.includes('scratchpad.md')) await vfs.createTextFile(dest, 'scratchpad.md', SCRATCH_BODY);
  if (!existing.includes(SAMPLE_IMAGE_NAME)) {
    await vfs.addBinary(
      dest,
      SAMPLE_IMAGE_NAME,
      new Blob([sampleImageBytes()], { type: 'image/svg+xml' }),
    );
  }
}

/** First-launch welcome experience: branding, a tour, and seeded sample files. */
export function WelcomeDialog({ onOpenApp }: Props) {
  const [open, setOpen] = useState(false);
  const reduced = useSettings((s) => s.reducedMotion);

  useEffect(() => {
    let cancelled = false;
    void loadSlice<{ seen: boolean }>('welcome').then((w) => {
      if (cancelled || w?.seen) return;
      void seedSamples().then(() => {
        if (!cancelled) setOpen(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss(): void {
    void saveSlice('welcome', { seen: true });
    setOpen(false);
  }

  if (!open) return null;
  const float = !prefersReducedMotion(reduced);

  return (
    <div className="absolute inset-0 z-[600] grid place-items-center bg-black/60 p-4 animate-fadein">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to GhostOS"
        className="w-full max-w-md overflow-hidden rounded-xl border border-amethyst-600/70 bg-crypt-800 shadow-window"
      >
        <div className="flex items-center gap-3 border-b border-amethyst-600/50 bg-gradient-to-r from-amethyst-600/40 via-crypt-700 to-crypt-800 p-4">
          <GhostMascot className="h-14 w-14" float={float} />
          <div>
            <GhostLogo className="text-2xl" showMascot={false} />
            <p className="font-pixel text-sm text-bone-400">A haunted retro desktop, reborn.</p>
          </div>
        </div>
        <div className="p-4">
          <p className="mb-3 font-pixel text-base leading-relaxed text-bone-200">
            Welcome! I'm Wisp, your guide. I've placed a few sample files in{' '}
            <span className="text-spectral-500">home/documents</span> to get you started —
            a WELCOME note, a Markdown scratchpad, and an image.
          </p>
          <p className="mb-4 font-pixel text-sm text-bone-500">
            Everything runs offline and is saved locally. Your desktop is restored each visit.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenApp('explorer');
                dismiss();
              }}
              className="rounded-sm border border-spectral-600 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-spectral-400 hover:bg-crypt-600 bevel-out"
            >
              Explore my files
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenApp('music');
                dismiss();
              }}
              className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-bone-200 hover:bg-crypt-600 bevel-out"
            >
              Hear a demo track
            </button>
            <button
              type="button"
              onClick={() => {
                // Resurrect a workspace from a prior export: open Settings and
                // jump straight to the Ghost Memory restore picker.
                onOpenApp('settings', { focus: 'restore' });
                dismiss();
              }}
              className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-bone-200 hover:bg-crypt-600 bevel-out"
            >
              Restore a backup
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="ml-auto rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-bone-300 hover:bg-crypt-600"
            >
              Enter GhostOS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
