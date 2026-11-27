import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, useSettings } from '../state/settingsStore';
import { playSfx } from '../sound/sfx';

interface Props {
  onDone: () => void;
}

const LINES = [
  'GhostOS BIOS v6.66 — Spectral Systems',
  'Summoning memory .............. 640K OK (and then some)',
  'Detecting apparitions ......... [ OK ]',
  'Mounting /crypt (IndexedDB) ... [ OK ]',
  'Loading window manager ........ [ OK ]',
  'Calibrating CRT phosphor ...... [ OK ]',
  'Awakening the desktop ...',
];

/** Atmospheric retro boot sequence shown while stores hydrate. */
export function BootSequence({ onDone }: Props) {
  const sound = useSettings((s) => s.sound);
  const reduced = useSettings((s) => s.reducedMotion);
  const [shown, setShown] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const fast = prefersReducedMotion(reduced);
    const step = fast ? 30 : 360;
    playSfx('boot', sound);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= LINES.length) {
        clearInterval(timer);
        setTimeout(() => doneRef.current(), fast ? 60 : 700);
      }
    }, step);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ghost-wallpaper grid h-full w-full place-items-center">
      <div className="w-[min(90vw,640px)] p-6">
        <h1 className="mb-4 font-gothic text-5xl text-spectral-500 drop-shadow-[0_0_8px_rgba(110,242,164,0.5)]">
          GhostOS
        </h1>
        <pre className="font-pixel text-lg leading-relaxed text-spectral-400">
          {LINES.slice(0, shown).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <span className="animate-bootblink text-spectral-500">█</span>
        </pre>
      </div>
    </div>
  );
}
