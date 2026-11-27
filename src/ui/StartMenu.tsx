import { useEffect, useRef, useState } from 'react';
import { getApps } from '../apps/registry';
import { AppIconTile } from './AppIconTile';
import { GhostLogo } from '../assets/brand';

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
      className="absolute bottom-12 left-1.5 z-[200] w-72 animate-winopen overflow-hidden rounded-lg border border-amethyst-600/70 bg-crypt-800/95 shadow-window outline-none backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b border-amethyst-600/60 bg-gradient-to-r from-amethyst-600/50 via-crypt-700 to-crypt-800 px-3 py-2.5">
        <GhostLogo className="text-xl" />
      </div>
      <ul className="py-1.5">
        {apps.map((app, i) => (
          <li key={app.id} role="none">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onClick={() => onLaunch(app.id)}
              className={[
                'flex w-full items-center gap-3 px-3 py-1.5 text-left font-pixel text-lg transition-colors',
                i === active ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-300 hover:bg-crypt-700/60',
              ].join(' ')}
            >
              <AppIconTile app={app} size="sm" />
              {app.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
