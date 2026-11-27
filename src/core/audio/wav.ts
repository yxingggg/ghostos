// Pure PCM → WAV encoder and tiny original note-sequence synthesizer.
// Used to generate GhostOS's bundled demo tracks at runtime so they are
// genuinely original, fully offline, and require no binary assets. No external
// dependencies; operates on Float32 sample buffers.

export interface Note {
  /** Frequency in Hz (0 = rest). */
  freq: number;
  /** Duration in seconds. */
  dur: number;
  /** Peak amplitude 0..1. */
  gain?: number;
  /** Oscillator type. */
  type?: 'sine' | 'square' | 'triangle' | 'saw';
}

export interface Voice {
  notes: Note[];
  /** Overall multiplier applied to this voice. */
  level?: number;
}

export interface TrackSpec {
  title: string;
  sampleRate?: number;
  voices: Voice[];
}

function oscSample(type: NonNullable<Note['type']>, phase: number): number {
  // phase in [0, 1)
  switch (type) {
    case 'sine':
      return Math.sin(2 * Math.PI * phase);
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'triangle':
      return 4 * Math.abs(phase - 0.5) - 1;
    case 'saw':
      return 2 * phase - 1;
    default: {
      const _n: never = type;
      return _n;
    }
  }
}

/** Render a single voice (sequential notes) into a mono Float32 buffer. */
export function renderVoice(voice: Voice, sampleRate: number, totalSamples: number): Float32Array {
  const out = new Float32Array(totalSamples);
  const level = voice.level ?? 1;
  let cursor = 0;
  for (const note of voice.notes) {
    const n = Math.max(0, Math.round(note.dur * sampleRate));
    const gain = (note.gain ?? 0.2) * level;
    const type = note.type ?? 'sine';
    for (let i = 0; i < n && cursor + i < totalSamples; i += 1) {
      if (note.freq > 0) {
        const t = i / sampleRate;
        const phase = (note.freq * t) % 1;
        // Short attack/release envelope to avoid clicks.
        const env =
          Math.min(1, (i / sampleRate) / 0.01) * Math.min(1, ((n - i) / sampleRate) / 0.03);
        out[cursor + i] = (out[cursor + i] ?? 0) + oscSample(type, phase) * gain * env;
      }
    }
    cursor += n;
  }
  return out;
}

/** Mix voices into one mono buffer, soft-clipped to [-1, 1]. */
export function mixTrack(spec: TrackSpec): { samples: Float32Array; sampleRate: number } {
  const sampleRate = spec.sampleRate ?? 22050;
  const voiceLengths = spec.voices.map((v) =>
    v.notes.reduce((s, note) => s + Math.round(note.dur * sampleRate), 0),
  );
  const totalSamples = Math.max(1, ...voiceLengths);
  const mix = new Float32Array(totalSamples);
  for (const voice of spec.voices) {
    const rendered = renderVoice(voice, sampleRate, totalSamples);
    for (let i = 0; i < totalSamples; i += 1) {
      mix[i] = (mix[i] ?? 0) + (rendered[i] ?? 0);
    }
  }
  // Soft clip.
  for (let i = 0; i < totalSamples; i += 1) {
    mix[i] = Math.tanh(mix[i] ?? 0);
  }
  return { samples: mix, sampleRate };
}

/** Encode a mono Float32 buffer as a 16-bit PCM WAV file (ArrayBuffer). */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

/** Convenience: render a spec straight to a WAV ArrayBuffer. */
export function specToWav(spec: TrackSpec): ArrayBuffer {
  const { samples, sampleRate } = mixTrack(spec);
  return encodeWav(samples, sampleRate);
}
