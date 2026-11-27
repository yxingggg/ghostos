import { describe, it, expect } from 'vitest';
import { encodeWav, mixTrack, renderVoice, specToWav, type TrackSpec } from './wav';
import { DEMO_TRACKS } from './demoTracks';

function readStr(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i += 1) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe('encodeWav', () => {
  it('produces a valid RIFF/WAVE header with correct sizes', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buf = encodeWav(samples, 8000);
    const view = new DataView(buf);
    expect(readStr(view, 0, 4)).toBe('RIFF');
    expect(readStr(view, 8, 4)).toBe('WAVE');
    expect(readStr(view, 12, 4)).toBe('fmt ');
    expect(readStr(view, 36, 4)).toBe('data');
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(8000); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(40, true)).toBe(samples.length * 2); // data size
    expect(buf.byteLength).toBe(44 + samples.length * 2);
  });

  it('clamps out-of-range samples', () => {
    const buf = encodeWav(new Float32Array([2, -2]), 8000);
    const view = new DataView(buf);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe('renderVoice / mixTrack', () => {
  it('renders the requested number of samples and stays within [-1, 1]', () => {
    const spec: TrackSpec = {
      title: 't',
      sampleRate: 8000,
      voices: [{ notes: [{ freq: 440, dur: 0.1, type: 'sine' }] }],
    };
    const { samples, sampleRate } = mixTrack(spec);
    expect(sampleRate).toBe(8000);
    expect(samples.length).toBe(800);
    for (const s of samples) expect(Math.abs(s)).toBeLessThanOrEqual(1);
  });

  it('treats freq 0 as a rest (silence)', () => {
    const silent = renderVoice({ notes: [{ freq: 0, dur: 0.05 }] }, 8000, 400);
    expect(silent.every((s) => s === 0)).toBe(true);
  });

  it('mixes multiple voices to the longest length', () => {
    const spec: TrackSpec = {
      title: 't',
      sampleRate: 8000,
      voices: [
        { notes: [{ freq: 220, dur: 0.2 }] },
        { notes: [{ freq: 440, dur: 0.1 }] },
      ],
    };
    const { samples } = mixTrack(spec);
    expect(samples.length).toBe(1600); // max(0.2s, 0.1s) * 8000
  });
});

describe('demo tracks', () => {
  it('provides the three named original tracks', () => {
    expect(DEMO_TRACKS.map((t) => t.title)).toEqual([
      'Midnight Transmission',
      'Spectral Frequencies',
      'Echoes from 1998',
    ]);
  });

  it('every demo track encodes to a non-trivial WAV buffer', () => {
    for (const t of DEMO_TRACKS) {
      const wav = specToWav(t.spec);
      const view = new DataView(wav);
      expect(readStr(view, 0, 4)).toBe('RIFF');
      // At least ~0.5s of 16-bit mono audio at the track's sample rate.
      const sr = t.spec.sampleRate ?? 22050;
      expect(wav.byteLength).toBeGreaterThan(44 + sr); // > ~0.5s of samples
    }
  });
});
