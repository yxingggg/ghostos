import type { AppDefinition } from '../apps/registry';
import { AppIconTile } from './AppIconTile';

interface Props {
  app: AppDefinition;
  selected: boolean;
  tabIndex: number;
  onSelect: () => void;
  onLaunch: () => void;
  onFocusItem: () => void;
}

/** A single selectable, keyboard-operable desktop icon. */
export function DesktopIcon({ app, selected, tabIndex, onSelect, onLaunch, onFocusItem }: Props) {
  return (
    <button
      type="button"
      role="gridcell"
      aria-label={app.name}
      aria-selected={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onDoubleClick={onLaunch}
      onFocus={onFocusItem}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLaunch();
        }
      }}
      className={[
        'group flex w-[4.5rem] flex-col items-center gap-1 rounded-md p-1.5 text-center transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-spectral-500',
        selected ? 'bg-amethyst-600/30 ring-1 ring-amethyst-500' : 'hover:bg-crypt-600/40',
      ].join(' ')}
    >
      <span className="transition-transform duration-150 group-hover:-translate-y-0.5">
        <AppIconTile app={app} size="desktop" />
      </span>
      <span className="line-clamp-2 font-pixel text-[13px] leading-tight text-bone-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        {app.name}
      </span>
    </button>
  );
}
