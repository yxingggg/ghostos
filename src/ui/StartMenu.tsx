import { useEffect, useRef, useState } from 'react';
import { getApps } from '../apps/registry';

interface Props {
  open: boolean;
  onClose: () => void;
  onLaunch: (appId: string) => void;
}

/** Start menu using a menu/listbox pattern with arrow-key navigation. */
export function StartMenu({ open, onClose, onLaunch }: Props) {
  const apps = getApps();
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setActive(0);
      ref.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Start menu"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((a) => (a + 1) % apps.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((a) => (a - 1 + apps.length) % apps.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const app = apps[active];
          if (app) onLaunch(app.id);
        }
      }}
      className="absolute bottom-11 left-1 z-[200] w-64 animate-risefade overflow-hidden rounded-sm border border-amethyst-600 bg-crypt-800 shadow-window outline-none"
    >
      <div className="flex items-center gap-2 border-b border-amethyst-600 bg-gradient-to-r from-amethyst-600/60 to-crypt-700 px-3 py-2">
        <span className="font-gothic text-lg text-bone-100">GhostOS</span>
      </div>
      <ul className="py-1">
        {apps.map((app, i) => {
          const Icon = app.Icon;
          return (
            <li key={app.id} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onClick={() => onLaunch(app.id)}
                className={[
                  'flex w-full items-center gap-3 px-3 py-1.5 text-left font-pixel text-lg',
                  i === active ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-300',
                ].join(' ')}
              >
                <Icon className="text-2xl text-spectral-500" />
                {app.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
