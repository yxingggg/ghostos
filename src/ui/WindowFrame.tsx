import { useCallbackRef } from './hooks/useCallbackRef';
import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useWm } from '../state/wmStore';
import { getApp } from '../apps/registry';
import type { WindowState } from '../core/wm/types';
import { useSettings } from '../state/settingsStore';
import { playSfx } from '../sound/sfx';

interface Props {
  win: WindowState;
  focused: boolean;
  coarsePointer: boolean;
}

type ResizeEdge = 'e' | 's' | 'se' | 'w' | 'n' | 'nw' | 'ne' | 'sw';

export function WindowFrame({ win, focused, coarsePointer }: Props) {
  const wm = useWm();
  const sound = useSettings((s) => s.sound);
  const app = getApp(win.appId);
  const ref = useRef<HTMLDivElement>(null);

  // Move focus into the window when it first mounts (accessibility).
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      ref.current?.focus();
    }
  }, []);

  const startDrag = useCallbackRef((e: ReactPointerEvent) => {
    if (win.maximized || coarsePointer) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    wm.focus(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = win.bounds.x;
    const originY = win.bounds.y;
    const onMove = (ev: PointerEvent) => {
      wm.move(win.id, originX + (ev.clientX - startX), originY + (ev.clientY - startY));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  const beginResize = useCallbackRef((edge: ResizeEdge, e: ReactPointerEvent) => {
    if (win.maximized || coarsePointer) return;
    e.preventDefault();
    e.stopPropagation();
    wm.focus(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const b = { ...win.bounds };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y, width, height } = b;
      if (edge.includes('e')) width = b.width + dx;
      if (edge.includes('s')) height = b.height + dy;
      if (edge.includes('w')) {
        width = b.width - dx;
        x = b.x + dx;
      }
      if (edge.includes('n')) {
        height = b.height - dy;
        y = b.y + dy;
      }
      wm.resize(win.id, { x, y, width, height });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  function close() {
    playSfx('close', sound);
    wm.close(win.id);
  }

  if (!app) return null;
  const Body = app.Component;
  const Icon = app.Icon;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={win.title}
      aria-modal={false}
      tabIndex={-1}
      className={[
        'absolute flex animate-winopen flex-col overflow-hidden rounded-lg border text-bone-100 shadow-window outline-none',
        focused
          ? 'border-amethyst-500/70 shadow-glow-amethyst'
          : 'border-crypt-500/80 opacity-95',
      ].join(' ')}
      style={{
        left: win.bounds.x,
        top: win.bounds.y,
        width: win.bounds.width,
        height: win.bounds.height,
        zIndex: win.zIndex,
      }}
      onPointerDown={() => wm.focus(win.id)}
    >
      {/* Title bar */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => wm.toggleMaximize(win.id)}
        className={[
          'flex h-9 shrink-0 items-center gap-2 border-b px-2 select-none',
          focused
            ? 'cursor-grab border-amethyst-600/60 bg-gradient-to-r from-amethyst-600/35 via-crypt-600 to-crypt-600'
            : 'cursor-default border-crypt-500 bg-crypt-600',
        ].join(' ')}
      >
        <Icon className={`text-lg ${focused ? 'text-spectral-500' : 'text-bone-500'}`} />
        <span className="flex-1 truncate font-gothic text-lg leading-none tracking-wide">{win.title}</span>
        <div data-no-drag className="flex items-center gap-1">
          <TitleButton label="Minimize" onClick={() => { playSfx('click', sound); wm.minimize(win.id); }}>
            _
          </TitleButton>
          <TitleButton label={win.maximized ? 'Restore' : 'Maximize'} onClick={() => wm.toggleMaximize(win.id)}>
            {win.maximized ? '❐' : '▢'}
          </TitleButton>
          <TitleButton label="Close" danger onClick={close}>
            ✕
          </TitleButton>
        </div>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-crypt-700">
        <Body windowId={win.id} {...(win.props ? { props: win.props } : {})} />
      </div>

      {/* Resize handles (hidden when maximized or on coarse pointers) */}
      {!win.maximized && !coarsePointer && (
        <>
          {(['e', 's', 'se', 'w', 'n', 'nw', 'ne', 'sw'] as ResizeEdge[]).map((edge) => (
            <Handle key={edge} edge={edge} onPointerDown={(e) => beginResize(edge, e)} />
          ))}
        </>
      )}
    </div>
  );
}

function TitleButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'grid h-5 w-5 place-items-center border border-crypt-500 bg-crypt-700 text-sm leading-none text-bone-300 bevel-out',
        'hover:text-bone-100',
        danger ? 'hover:bg-blood-500 hover:text-white' : 'hover:bg-crypt-600',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const edgeClass: Record<ResizeEdge, string> = {
  e: 'top-0 right-0 h-full w-1.5 cursor-ew-resize',
  w: 'top-0 left-0 h-full w-1.5 cursor-ew-resize',
  s: 'bottom-0 left-0 h-1.5 w-full cursor-ns-resize',
  n: 'top-0 left-0 h-1.5 w-full cursor-ns-resize',
  se: 'bottom-0 right-0 h-3 w-3 cursor-nwse-resize',
  nw: 'top-0 left-0 h-3 w-3 cursor-nwse-resize',
  ne: 'top-0 right-0 h-3 w-3 cursor-nesw-resize',
  sw: 'bottom-0 left-0 h-3 w-3 cursor-nesw-resize',
};

function Handle({
  edge,
  onPointerDown,
}: {
  edge: ResizeEdge;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className={`absolute ${edgeClass[edge]}`}
    />
  );
}


