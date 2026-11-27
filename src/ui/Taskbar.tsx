import { useWm } from '../state/wmStore';
import { getApp } from '../apps/registry';
import { GhostSigil } from '../assets/icons';
import { Clock } from './Clock';
import { useSettings } from '../state/settingsStore';
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

  return (
    <div className="absolute inset-x-0 bottom-0 z-[150] flex h-10 items-stretch gap-1 border-t border-amethyst-600 bg-crypt-800/95 px-1 backdrop-blur">
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
          'my-1 flex items-center gap-2 rounded-sm border border-amethyst-600 px-3 font-gothic text-lg bevel-out',
          startOpen ? 'bg-amethyst-600 text-white' : 'bg-crypt-700 text-spectral-500 hover:bg-crypt-600',
        ].join(' ')}
      >
        <GhostSigil className="text-xl" />
        Start
      </button>

      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto py-1">
        {windows.map((win) => {
          if (!win) return null;
          const app = getApp(win.appId);
          if (!app) return null;
          const Icon = app.Icon;
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
                'flex max-w-[12rem] items-center gap-2 rounded-sm border px-2 font-pixel text-base truncate',
                isFocused
                  ? 'border-amethyst-500 bg-amethyst-600/40 text-bone-100'
                  : win.minimized
                    ? 'border-crypt-500 bg-crypt-700 text-bone-500 italic'
                    : 'border-crypt-500 bg-crypt-700 text-bone-300 hover:bg-crypt-600',
              ].join(' ')}
            >
              <Icon className="shrink-0 text-lg text-spectral-500" />
              <span className="truncate">{win.title}</span>
            </button>
          );
        })}
      </div>

      <Clock />
    </div>
  );
}
