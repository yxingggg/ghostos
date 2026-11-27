import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useMusic } from '../../state/musicStore';
import { useVfs } from '../../state/vfsStore';
import { useToasts } from '../../state/toastStore';
import { DEMO_TRACKS } from '../../core/audio/demoTracks';
import { specToWav } from '../../core/audio/wav';
import { Visualizer } from './Visualizer';
import { ensureGraph } from './audioGraph';

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|flac|m4a|aac|weba|opus)$/i;

export function MusicApp({ props }: AppComponentProps) {
  const tracks = useMusic((s) => s.tracks);
  const currentId = useMusic((s) => s.currentId);
  const playing = useMusic((s) => s.playing);
  const volume = useMusic((s) => s.volume);
  const muted = useMusic((s) => s.muted);
  const repeat = useMusic((s) => s.repeat);
  const addTrack = useMusic((s) => s.addTrack);
  const addTrackFromVfs = useMusic((s) => s.addTrackFromVfs);
  const addDemoTrack = useMusic((s) => s.addDemoTrack);
  const removeTrack = useMusic((s) => s.removeTrack);
  const getTrackUrl = useMusic((s) => s.getTrackUrl);
  const select = useMusic((s) => s.select);
  const setPlaying = useMusic((s) => s.setPlaying);
  const setVolume = useMusic((s) => s.setVolume);
  const toggleMute = useMusic((s) => s.toggleMute);
  const cycleRepeat = useMusic((s) => s.cycleRepeat);
  const next = useMusic((s) => s.next);
  const prev = useMusic((s) => s.prev);
  const vfsNode = useVfs((s) => s.node);
  const readBinary = useVfs((s) => s.readBinary);
  const pushToast = useToasts((s) => s.push);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = tracks.find((t) => t.id === currentId) ?? null;

  // Open a VFS audio file passed from Tomb Explorer.
  const vfsFileId = typeof props?.vfsFileId === 'string' ? props.vfsFileId : null;
  useEffect(() => {
    if (!vfsFileId) return;
    let cancelled = false;
    const node = vfsNode(vfsFileId);
    if (!node || node.kind !== 'file') return;
    void readBinary(vfsFileId).then((buf) => {
      if (cancelled) return;
      if (!buf) {
        pushToast('That audio file is empty or unreadable.', 'error');
        return;
      }
      void addTrackFromVfs(vfsFileId, node.name, buf, node.mime ?? 'audio/mpeg').then((id) => {
        if (!cancelled) {
          select(id);
          setPlaying(true);
        }
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfsFileId]);

  // Resolve a blob URL for the current track. The active URL is tracked in a ref
  // and only revoked when it is REPLACED or on unmount — never while it is the
  // element's current src (revoking the in-use URL would stop playback).
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (currentId) {
      void getTrackUrl(currentId).then((u) => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        if (urlRef.current && urlRef.current !== u) URL.revokeObjectURL(urlRef.current);
        urlRef.current = u;
        setUrl(u);
      });
    } else {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setUrl(null);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Revoke the last object URL on unmount.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  // Drive play/pause. Playback goes through the native <audio> element FIRST and
  // never depends on Web Audio; the analyser (for the visualizer only) is
  // attached opportunistically afterward and its failure can't block audio.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el
        .play()
        .then(() => {
          // Best-effort: attach the analyser for the visualizer. If this throws
          // or the context is blocked, audio keeps playing regardless.
          void ensureGraph(el)
            .then((a) => {
              if (a) setAnalyser(a);
            })
            .catch(() => {
              /* visualizer unavailable; playback continues */
            });
        })
        .catch(() => {
          setPlaying(false);
          pushToast('Press Play to start audio (the browser blocked autoplay).');
        });
    } else {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, url]);

  // Apply the player's own volume/mute to the element. (Deliberately NOT gated
  // by the global SFX sound setting — that only governs UI click sounds.)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted, url]);

  async function onAddFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    let added: string | null = null;
    for (const file of list) {
      if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) {
        pushToast(`"${file.name}" is not a supported audio file.`, 'error');
        continue;
      }
      try {
        added = await addTrack(file.name, file);
      } catch {
        pushToast(`Could not read "${file.name}".`, 'error');
      }
    }
    if (added && !currentId) select(added);
  }

  async function playDemo(def: (typeof DEMO_TRACKS)[number]) {
    try {
      const wav = specToWav(def.spec);
      const id = await addDemoTrack(def.id, def.title, wav);
      select(id);
      setPlaying(true); // user gesture → allowed to start
    } catch {
      pushToast('Could not synthesize the demo track.', 'error');
    }
  }

  const hasTracks = tracks.length > 0;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-crypt-800"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void onAddFiles(e.dataTransfer.files);
      }}
    >
      <Visualizer analyser={analyser} playing={playing} />

      {/* Header / import */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-y border-crypt-500 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-pixel text-lg text-spectral-500">
            {current ? current.name : 'DeadWave'}
          </div>
          {current && (
            <div className="truncate font-pixel text-xs text-bone-500">
              {current.mime || 'audio'} · {fmt(progress)} / {fmt(duration)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-sm border border-amethyst-600 bg-amethyst-600/40 px-3 py-1 font-pixel text-base text-bone-100 hover:bg-amethyst-600/60 bevel-out"
        >
          + Import Audio
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
      <div className="flex shrink-0 flex-col gap-2 px-3 py-2">
        {/* Seek on its own full-width row so it never crowds the buttons. */}
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          step="any"
          value={progress}
          disabled={!current}
          onChange={(e) => {
            const t = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setProgress(t);
          }}
          className="w-full accent-amethyst-500"
        />
        {/* Buttons + volume wrap freely on narrow widths. */}
        <div className="flex flex-wrap items-center gap-2">
          <TransportButton label="Previous" onClick={prev} disabled={!hasTracks}>⏮</TransportButton>
          <TransportButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} disabled={!current}>
            {playing ? '⏸' : '▶'}
          </TransportButton>
          <TransportButton
            label="Stop"
            onClick={() => {
              setPlaying(false);
              if (audioRef.current) audioRef.current.currentTime = 0;
              setProgress(0);
            }}
            disabled={!current}
          >
            ⏹
          </TransportButton>
          <TransportButton label="Next" onClick={next} disabled={!hasTracks}>⏭</TransportButton>
          <TransportButton label={`Repeat: ${repeat}`} onClick={cycleRepeat} active={repeat !== 'off'}>
            {repeat === 'one' ? '🔂' : '🔁'}
          </TransportButton>
          <div className="flex min-w-0 items-center gap-1">
            <TransportButton label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute} active={muted}>
              {muted ? '🔇' : '🔊'}
            </TransportButton>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-amethyst-500"
            />
          </div>
        </div>
      </div>

      {/* Playlist / empty state */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-crypt-500">
        {!hasTracks ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-gothic text-xl text-spectral-500">DeadWave is silent.</p>
            <p className="max-w-xs font-pixel text-base text-bone-400">
              Import local audio with the button above, drag-and-drop files here, open an audio
              file from Tomb Explorer — or summon an original demo track:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEMO_TRACKS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => void playDemo(d)}
                  className="rounded-sm border border-spectral-600 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-spectral-400 hover:bg-crypt-600 bevel-out"
                >
                  ▶ {d.title}
                </button>
              ))}
            </div>
            <p className="font-pixel text-xs text-bone-500">
              Demo tracks are original synthesized compositions, generated locally — no streaming,
              no downloads. Audio only plays after you click.
            </p>
          </div>
        ) : (
          <ul>
            {tracks.map((t) => (
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
            ))}
            <li className="px-3 py-2">
              <span className="font-pixel text-xs text-bone-500">Demo tracks: </span>
              {DEMO_TRACKS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => void playDemo(d)}
                  className="mr-1 rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-0.5 font-pixel text-sm text-spectral-400 hover:bg-crypt-600"
                >
                  ▶ {d.title}
                </button>
              ))}
            </li>
          </ul>
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-spectral-500 bg-crypt-900/70 font-pixel text-xl text-spectral-500">
          Drop audio files to import
        </div>
      )}

      {/* The audio element is ALWAYS mounted so its ref is stable; src is bound
          reactively. Conditionally mounting it caused the ref to be null when
          play() ran, so nothing played. */}
      <audio
        ref={audioRef}
        {...(url ? { src: url } : {})}
        preload="auto"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          if (!url) return;
          pushToast(
            `Could not play "${current?.name ?? 'this file'}" — the format may be unsupported or the file is corrupted.`,
            'error',
          );
          setPlaying(false);
        }}
        onEnded={() => {
          if (repeat === 'one') {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              void audioRef.current.play().catch(() => setPlaying(false));
            }
          } else if (repeat === 'all' || tracks.length > 1) {
            next();
          } else {
            setPlaying(false);
          }
        }}
      />
    </div>
  );
}

function TransportButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'grid h-8 w-8 shrink-0 place-items-center rounded-sm border text-lg bevel-out disabled:opacity-40',
        active
          ? 'border-amethyst-500 bg-amethyst-600/40 text-bone-100'
          : 'border-crypt-500 bg-crypt-700 text-bone-100 hover:bg-crypt-600',
      ].join(' ')}
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
