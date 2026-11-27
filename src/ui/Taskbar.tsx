import { useWm } from '../state/wmStore';
import { getApp } from '../apps/registry';
import { AppIconTile } from './AppIconTile';
import { GhostMascot } from '../assets/brand';
import { Clock } from './Clock';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { useSettings, prefersReducedMotion } from '../state/settingsStore';
import { playSfx } from '../sound/sfx';

interface Props {
  onToggleStart: () => void;
  startOpen: boolean;
}

export function Taskbar({ onToggleStart, startOpen }: Props) {
  const windows = useWm((s) => s.state.order.map((id) => s.state.windows[id]));
  const focusedId = useWm((s) => s.state.focusedId);
  const wm = useWm();
  const sound = useSettings((s) => s.sound);
  const reduced = useSettings((s) => s.reducedMotion);
  const float = !prefersReducedMotion(reduced);

  return (
    <div className="absolute inset-x-0 bottom-0 z-[150] flex h-11 items-stretch gap-1 border-t border-amethyst-600/70 bg-gradient-to-b from-crypt-700/95 to-crypt-800/95 px-1.5 shadow-taskbar backdrop-blur">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={startOpen}
        aria-label="Start menu"
        onClick={() => {
          playSfx('click', sound);
          onToggleStart();
        }}
        className={[
          'my-1 flex items-center gap-2 rounded-md border px-3 font-gothic text-lg transition-colors bevel-out',
          startOpen
            ? 'border-amethyst-500 bg-amethyst-600 text-white shadow-glow-amethyst'
            : 'border-amethyst-600/70 bg-crypt-700 text-spectral-500 hover:bg-crypt-600',
        ].join(' ')}
      >
        <GhostMascot className={`h-6 w-6 ${float ? 'animate-pulseglow' : ''}`} />
        Start
      </button>

      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto py-1">
        {windows.map((win) => {
          if (!win) return null;
          const app = getApp(win.appId);
          if (!app) return null;
          const isFocused = win.id === focusedId && !win.minimized;
          return (
            <button
              key={win.id}
              type="button"
              aria-label={`${win.title}${win.minimized ? ' (minimized)' : ''}`}
              aria-pressed={isFocused}
              onClick={() => {
                if (isFocused) wm.minimize(win.id);
                else wm.restore(win.id);
              }}
              className={[
                'my-1 flex max-w-[12rem] items-center gap-2 truncate rounded-md border px-2 font-pixel text-base transition-colors',
                isFocused
                  ? 'border-amethyst-500 bg-amethyst-600/40 text-bone-100 shadow-glow-sm'
                  : win.minimized
                    ? 'border-crypt-500 bg-crypt-700/60 text-bone-500 italic'
                    : 'border-crypt-500 bg-crypt-700 text-bone-300 hover:bg-crypt-600',
              ].join(' ')}
            >
              <AppIconTile app={app} size="sm" />
              <span className="truncate">{win.title}</span>
            </button>
          );
        })}
      </div>

      <ConnectivityIndicator />
      <Clock />
    </div>
  );
}
