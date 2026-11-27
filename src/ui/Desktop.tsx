import { useEffect, useRef, useState } from 'react';
import { useWm } from '../state/wmStore';
import { getApp, getApps } from '../apps/registry';
import { DesktopIcon } from './DesktopIcon';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { Toasts } from './Toasts';
import { CrtOverlay } from './CrtOverlay';
import { WelcomeDialog } from './WelcomeDialog';
import { Wallpaper } from './Wallpaper';
import { GhostLogo, GhostMascot } from '../assets/brand';
import { useSettings, prefersReducedMotion } from '../state/settingsStore';
import { playSfx } from '../sound/sfx';

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640
      : false,
  );
  useEffect(() => {
    const onResize = () => setCoarse(window.innerWidth < 640 || window.matchMedia('(pointer: coarse)').matches);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return coarse;
}

export function Desktop() {
  const wm = useWm();
  const windows = useWm((s) => s.state.order.map((id) => s.state.windows[id]));
  const focusedId = useWm((s) => s.state.focusedId);
  const sound = useSettings((s) => s.sound);
  const wallpaper = useSettings((s) => s.wallpaper);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const floatMascot = !prefersReducedMotion(reducedMotion);
  const desktopApps = getApps().filter((a) => a.desktop !== false);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeIcon, setActiveIcon] = useState(0);
  const [startOpen, setStartOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();

  // Keep the WM's desktop size in sync with the viewport (minus the taskbar).
  useEffect(() => {
    const sync = () => wm.setDesktop(window.innerWidth, window.innerHeight - 40);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function launch(appId: string, props?: Record<string, unknown>) {
    const app = getApp(appId);
    if (!app) return;
    playSfx('open', sound);
    wm.open({
      appId,
      title: app.name,
      ...(app.defaultBounds ? { bounds: app.defaultBounds } : {}),
      ...(app.singleton ? { singleton: true } : {}),
      ...(props ? { props } : {}),
    });
    setStartOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-crypt-900"
      onMouseDown={(e) => {
        if (e.target === rootRef.current || (e.target as HTMLElement).dataset.desktopbg === 'true') {
          setSelected(null);
          setStartOpen(false);
        }
      }}
    >
      <Wallpaper id={wallpaper} />
      {/* Click-catcher over the wallpaper so clicking empty desktop deselects. */}
      <div data-desktopbg="true" className="absolute inset-0" />

      {/* Prominent branding watermark (bottom-right, non-interactive). */}
      <div className="pointer-events-none absolute bottom-14 right-5 z-0 flex items-end gap-3 opacity-80">
        <div className="text-right">
          <GhostLogo className="justify-end text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" showMascot={false} />
          <p className="font-pixel text-sm text-bone-300 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            a haunted desktop, reborn
          </p>
        </div>
        <GhostMascot className="h-16 w-16 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" float={floatMascot} />
      </div>

      {/* Desktop icon grid — column-flow grid bounded above the taskbar
          (taskbar is 40px; we reserve 3.5rem total clearance). Each cell is a
          fixed 6rem-wide × 6rem-tall track: wide enough that the longest single
          app word fits on one line, tall enough to reserve two full label lines
          with no vertical overlap into the cell below. `grid-rows-[auto-fill,6rem]`
          computes capacity from the real cell height against the available
          desktop height and wraps into a new column when a column is full, so
          every icon and its complete label stays visible and non-overlapping. */}
      <div
        role="grid"
        aria-label="Desktop icons"
        className="absolute left-2 top-2 grid max-h-[calc(100%-3.5rem)] auto-cols-max grid-flow-col grid-rows-[repeat(auto-fill,6rem)] content-start justify-start gap-x-1 gap-y-1"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIcon((i) => Math.min(i + 1, desktopApps.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIcon((i) => Math.max(i - 1, 0));
          }
        }}
      >
        {desktopApps.map((app, i) => (
          <DesktopIcon
            key={app.id}
            app={app}
            selected={selected === app.id}
            tabIndex={i === activeIcon ? 0 : -1}
            onSelect={() => setSelected(app.id)}
            onLaunch={() => launch(app.id)}
            onFocusItem={() => setActiveIcon(i)}
          />
        ))}
      </div>

      {/* Windows */}
      {windows.map((win) =>
        win && !win.minimized ? (
          <WindowFrame
            key={win.id}
            win={win}
            focused={win.id === focusedId}
            coarsePointer={coarse}
          />
        ) : null,
      )}

      <Toasts />

      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} onLaunch={launch} />
      <Taskbar onToggleStart={() => setStartOpen((o) => !o)} startOpen={startOpen} />

      <WelcomeDialog onOpenApp={(id, props) => launch(id, props)} />

      <CrtOverlay />
    </div>
  );
}
