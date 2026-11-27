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
import { useSettings, WALLPAPERS } from '../state/settingsStore';
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
  const wallClass = WALLPAPERS.find((w) => w.id === wallpaper)?.className ?? 'wall-crypt';
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

  function launch(appId: string) {
    const app = getApp(appId);
    if (!app) return;
    playSfx('open', sound);
    wm.open({
      appId,
      title: app.name,
      ...(app.defaultBounds ? { bounds: app.defaultBounds } : {}),
      ...(app.singleton ? { singleton: true } : {}),
    });
    setStartOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`${wallClass} relative h-full w-full overflow-hidden`}
      onMouseDown={(e) => {
        if (e.target === rootRef.current) {
          setSelected(null);
          setStartOpen(false);
        }
      }}
    >
      {/* Desktop icon grid */}
      <div
        role="grid"
        aria-label="Desktop icons"
        className="absolute left-2 top-2 grid grid-flow-col grid-rows-[repeat(6,auto)] content-start gap-1"
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

      <WelcomeDialog onOpenApp={(id) => launch(id)} />

      <CrtOverlay />
    </div>
  );
}
