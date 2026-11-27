import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

/** A right-click context menu positioned at the pointer, closed on outside click or Escape. */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  // Clamp within the viewport so the menu never overflows off-screen.
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - (items.length * 32 + 8)),
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="File actions"
      tabIndex={-1}
      style={style}
      className="fixed z-[400] w-44 overflow-hidden rounded-sm border border-amethyst-600 bg-crypt-800 py-1 shadow-window outline-none"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={[
            'block w-full px-3 py-1 text-left font-pixel text-base',
            item.danger
              ? 'text-bone-200 hover:bg-blood-500 hover:text-white'
              : 'text-bone-200 hover:bg-amethyst-600/40',
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
