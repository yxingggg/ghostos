import type { AppDefinition } from '../apps/registry';

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
  const Icon = app.Icon;
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
        'flex w-20 flex-col items-center gap-1 rounded p-2 text-center',
        'focus:outline-none',
        selected ? 'bg-amethyst-600/30 ring-1 ring-amethyst-500' : 'hover:bg-crypt-600/40',
      ].join(' ')}
    >
      <Icon className="text-4xl text-spectral-500" />
      <span className="font-pixel text-sm leading-tight text-bone-100 drop-shadow">
        {app.name}
      </span>
    </button>
  );
}
