import { useEffect, useRef, useState } from 'react';

export interface ToolbarAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Lower priority actions collapse into the overflow menu first. */
  priority?: number;
}

/**
 * A responsive toolbar. It measures available width and shows as many actions
 * as fit (highest priority first); the rest collapse into an accessible "More"
 * overflow menu, so controls are never clipped when a window is narrow.
 */
export function Toolbar({ actions }: { actions: ToolbarAction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(actions.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sort by priority (desc) so the most important actions stay visible.
  const sorted = [...actions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Estimate how many buttons fit; collapse the remainder. We approximate each
    // button at ~96px plus ~56px reserved for the More button.
    const measure = () => {
      const width = el.clientWidth;
      // Width 0 means the element is unmeasured or not laid out (e.g. jsdom or a
      // hidden container) — show everything rather than collapsing prematurely.
      if (width === 0) {
        setVisibleCount(actions.length);
        return;
      }
      const perButton = 98;
      const reserve = 58;
      const fits = Math.max(1, Math.floor((width - reserve) / perButton));
      setVisibleCount(fits >= actions.length ? actions.length : Math.max(1, fits));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [actions.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const visible = sorted.slice(0, visibleCount);
  const overflow = sorted.slice(visibleCount);

  return (
    <div
      ref={containerRef}
      className="flex min-w-0 items-center gap-1 overflow-hidden border-b border-crypt-500 p-1.5"
    >
      {visible.map((a) => (
        <Btn key={a.id} action={a} />
      ))}
      {overflow.length > 0 && (
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600 bevel-out"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="More actions"
              className="absolute left-0 top-full z-30 mt-0.5 w-40 rounded-sm border border-amethyst-600 bg-crypt-800 py-1 shadow-window"
            >
              {overflow.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  onClick={() => {
                    a.onClick();
                    setMenuOpen(false);
                  }}
                  className={[
                    'block w-full px-3 py-1 text-left font-pixel text-base disabled:opacity-40',
                    a.danger
                      ? 'text-bone-200 hover:bg-blood-500 hover:text-white'
                      : 'text-bone-200 hover:bg-amethyst-600/40',
                  ].join(' ')}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Btn({ action }: { action: ToolbarAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={[
        'shrink-0 rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 font-pixel text-base bevel-out',
        'disabled:cursor-not-allowed disabled:opacity-40',
        action.danger
          ? 'text-bone-200 hover:bg-blood-500 hover:text-white'
          : 'text-bone-200 hover:bg-crypt-600',
      ].join(' ')}
    >
      {action.label}
    </button>
  );
}
