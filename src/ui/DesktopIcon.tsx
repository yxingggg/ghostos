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
        'group flex w-20 flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-spectral-500',
        selected ? 'bg-amethyst-600/30 ring-1 ring-amethyst-500' : 'hover:bg-crypt-600/40',
      ].join(' ')}
    >
      <span className="transition-transform duration-150 group-hover:-translate-y-0.5">
        <AppIconTile app={app} />
      </span>
      <span className="font-pixel text-sm leading-tight text-bone-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        {app.name}
      </span>
    </button>
  );
}
