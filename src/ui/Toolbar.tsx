import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
 *
 * The overflow menu is rendered as a FIXED-position popover anchored to the
 * trigger's bounding rect, so it is not clipped by the toolbar's own
 * `overflow-hidden` (which exists only to keep the row from wrapping while we
 * measure how many buttons fit).
 */
export function Toolbar({ actions }: { actions: ToolbarAction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(actions.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Sort by priority (desc) so the most important actions stay visible.
  const sorted = [...actions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      // Width 0 means unmeasured / not laid out (jsdom, hidden container) — show all.
      if (width === 0) {
        setVisibleCount(actions.length);
        return;
      }
      const perButton = 98;
      const reserve = 58; // room for the "More" trigger
      const fits = Math.max(1, Math.floor((width - reserve) / perButton));
      setVisibleCount(fits >= actions.length ? actions.length : Math.max(1, fits));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [actions.length]);

  // Position the popover under the trigger (fixed coords), clamped to viewport.
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 176; // w-44
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 4);
    const top = Math.min(rect.bottom + 2, window.innerHeight - 8);
    setMenuPos({ left: Math.max(4, left), top });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onScroll = () => setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
    };
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
        <>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            onClick={() => setMenuOpen((o) => !o)}
            className="shrink-0 rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600 bevel-out"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="More actions"
              style={{ position: 'fixed', left: menuPos.left, top: menuPos.top }}
              className="z-[400] w-44 rounded-sm border border-amethyst-600 bg-crypt-800 py-1 shadow-window"
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
        </>
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
