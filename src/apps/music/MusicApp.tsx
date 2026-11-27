import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useMusic } from '../../state/musicStore';
import { useSettings } from '../../state/settingsStore';
import { Visualizer } from './Visualizer';

export function MusicApp(_props: AppComponentProps) {
  const tracks = useMusic((s) => s.tracks);
  const currentId = useMusic((s) => s.currentId);
  const playing = useMusic((s) => s.playing);
  const addTrack = useMusic((s) => s.addTrack);
  const removeTrack = useMusic((s) => s.removeTrack);
  const getTrackUrl = useMusic((s) => s.getTrackUrl);
  const select = useMusic((s) => s.select);
  const setPlaying = useMusic((s) => s.setPlaying);
  const next = useMusic((s) => s.next);
  const prev = useMusic((s) => s.prev);
  const muted = !useSettings((s) => s.sound);

  const audioRef = useRef<HTMLAudioElement>(null);
  // Tracked in state (not just a ref) so the Visualizer re-renders and binds
  // its analyser once the <audio> element actually mounts.
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = tracks.find((t) => t.id === currentId) ?? null;

  // Resolve a blob URL for the current track and revoke the previous one.
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    if (currentId) {
      void getTrackUrl(currentId).then((u) => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        setUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return u;
        });
        revoked = u;
      });
    } else {
      setUrl(null);
    }
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Drive play/pause from the store.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, url, setPlaying]);

  async function onAddFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = await addTrack(file.name, file);
      if (!currentId) select(id);
    }
  }

  return (
    <div className="flex h-full flex-col bg-crypt-800">
      <Visualizer audioEl={audioEl} playing={playing} />

      <div className="flex items-center justify-between border-y border-crypt-500 px-3 py-1">
        <div className="min-w-0 font-pixel text-lg text-spectral-500">
          <span className="truncate">{current ? current.name : 'DeadWave — no track loaded'}</span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-0.5 font-pixel text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
        >
          + Add Audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => void onAddFiles(e.target.files)}
        />
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2 px-3 py-2">
        <TransportButton label="Previous" onClick={prev}>⏮</TransportButton>
        <TransportButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} disabled={!current}>
          {playing ? '⏸' : '▶'}
        </TransportButton>
        <TransportButton label="Stop" onClick={() => { setPlaying(false); if (audioRef.current) audioRef.current.currentTime = 0; }} disabled={!current}>⏹</TransportButton>
        <TransportButton label="Next" onClick={next}>⏭</TransportButton>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={(e) => {
            const t = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setProgress(t);
          }}
          className="flex-1 accent-amethyst-500"
        />
        <span className="w-16 text-right font-pixel text-sm text-bone-500">
          {fmt(progress)}/{fmt(duration)}
        </span>
      </div>

      {/* Playlist */}
      <ul className="min-h-0 flex-1 overflow-y-auto border-t border-crypt-500">
        {tracks.length === 0 ? (
          <li className="grid h-full place-items-center font-pixel text-bone-500">
            Add local audio files to summon the dead wave.
          </li>
        ) : (
          tracks.map((t) => (
            <li key={t.id} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  select(t.id);
                  setPlaying(true);
                }}
                className={[
                  'min-w-0 flex-1 truncate px-3 py-1.5 text-left font-pixel text-base',
                  t.id === currentId ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-300 hover:bg-crypt-700',
                ].join(' ')}
              >
                {t.id === currentId && playing ? '♪ ' : ''}
                {t.name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={() => void removeTrack(t.id)}
                className="px-2 text-bone-500 hover:text-blood-500"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>

      {url && (
        <audio
          ref={(el) => {
            audioRef.current = el;
            setAudioEl(el);
          }}
          src={url}
          muted={muted}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={next}
        />
      )}
    </div>
  );
}

function TransportButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-sm border border-crypt-500 bg-crypt-700 text-lg text-bone-100 hover:bg-crypt-600 disabled:opacity-40 bevel-out"
    >
      {children}
    </button>
  );
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
