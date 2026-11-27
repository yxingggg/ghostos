// Synthesized retro sound effects via the Web Audio API.
// No audio assets are bundled — cues are generated at runtime, so there is no
// network dependency and nothing proprietary. All cues are gated behind the
// user's sound setting (opt-in, default off).

export type Cue = 'open' | 'close' | 'click' | 'error' | 'boot';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

interface Blip {
  freq: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  slideTo?: number;
}

const cues: Record<Cue, Blip[]> = {
  open: [{ freq: 440, type: 'square', duration: 0.07, gain: 0.05, slideTo: 760 }],
  close: [{ freq: 520, type: 'square', duration: 0.08, gain: 0.05, slideTo: 180 }],
  click: [{ freq: 300, type: 'triangle', duration: 0.03, gain: 0.04 }],
  error: [
    { freq: 180, type: 'sawtooth', duration: 0.12, gain: 0.05 },
    { freq: 120, type: 'sawtooth', duration: 0.16, gain: 0.05 },
  ],
  boot: [
    { freq: 220, type: 'sine', duration: 0.18, gain: 0.05, slideTo: 440 },
    { freq: 440, type: 'sine', duration: 0.22, gain: 0.05, slideTo: 660 },
  ],
};

/** Play a cue if sound is enabled. No-op when disabled or audio is unavailable. */
export function playSfx(cue: Cue, enabled: boolean): void {
  if (!enabled) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  let when = audio.currentTime;
  for (const blip of cues[cue]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = blip.type;
    osc.frequency.setValueAtTime(blip.freq, when);
    if (blip.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(blip.slideTo, when + blip.duration);
    }
    gain.gain.setValueAtTime(blip.gain, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + blip.duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(when);
    osc.stop(when + blip.duration);
    when += blip.duration;
  }
}
