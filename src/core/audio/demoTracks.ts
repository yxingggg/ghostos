// Original demo compositions for DeadWave, specified as note sequences and
// synthesized to WAV at runtime (see wav.ts). These are original, royalty-free
// melodies written for GhostOS — not transcriptions of any existing song.

import type { TrackSpec } from './wav';

// A few note frequencies (equal temperament) for readability.
const N = {
  A2: 110.0,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  REST: 0,
} as const;

export interface DemoTrackDef {
  id: string;
  title: string;
  spec: TrackSpec;
}

/** "Midnight Transmission" — a slow, sparse minor arpeggio over a drone. */
const midnightTransmission: TrackSpec = {
  title: 'Midnight Transmission',
  sampleRate: 22050,
  voices: [
    {
      level: 0.5,
      notes: [
        { freq: N.A3, dur: 0.4, type: 'triangle' },
        { freq: N.C4, dur: 0.4, type: 'triangle' },
        { freq: N.E4, dur: 0.4, type: 'triangle' },
        { freq: N.A4, dur: 0.4, type: 'triangle' },
        { freq: N.E4, dur: 0.4, type: 'triangle' },
        { freq: N.C4, dur: 0.4, type: 'triangle' },
        { freq: N.A3, dur: 0.8, type: 'triangle' },
      ],
    },
    { level: 0.35, notes: [{ freq: N.A2, dur: 3.2, type: 'sine', gain: 0.5 }] },
  ],
};

/** "Spectral Frequencies" — a shimmering square-wave motif with a bass pulse. */
const spectralFrequencies: TrackSpec = {
  title: 'Spectral Frequencies',
  sampleRate: 22050,
  voices: [
    {
      level: 0.4,
      notes: [
        { freq: N.E4, dur: 0.2, type: 'square' },
        { freq: N.G4, dur: 0.2, type: 'square' },
        { freq: N.B4, dur: 0.2, type: 'square' },
        { freq: N.D5, dur: 0.2, type: 'square' },
        { freq: N.B4, dur: 0.2, type: 'square' },
        { freq: N.G4, dur: 0.2, type: 'square' },
        { freq: N.E4, dur: 0.2, type: 'square' },
        { freq: N.REST, dur: 0.2 },
        { freq: N.C5, dur: 0.4, type: 'square' },
        { freq: N.B4, dur: 0.4, type: 'square' },
      ],
    },
    {
      level: 0.45,
      notes: [
        { freq: N.E3, dur: 0.4, type: 'triangle', gain: 0.5 },
        { freq: N.E3, dur: 0.4, type: 'triangle', gain: 0.5 },
        { freq: N.D3, dur: 0.4, type: 'triangle', gain: 0.5 },
        { freq: N.C3, dur: 0.8, type: 'triangle', gain: 0.5 },
      ],
    },
  ],
};

/** "Echoes from 1998" — a bright, nostalgic saw-lead phrase over a steady bass. */
const echoesFrom1998: TrackSpec = {
  title: 'Echoes from 1998',
  sampleRate: 22050,
  voices: [
    {
      level: 0.35,
      notes: [
        { freq: N.C5, dur: 0.25, type: 'saw' },
        { freq: N.D5, dur: 0.25, type: 'saw' },
        { freq: N.E5, dur: 0.5, type: 'saw' },
        { freq: N.G4, dur: 0.25, type: 'saw' },
        { freq: N.A4, dur: 0.25, type: 'saw' },
        { freq: N.C5, dur: 0.5, type: 'saw' },
        { freq: N.REST, dur: 0.25 },
        { freq: N.E5, dur: 0.5, type: 'saw' },
        { freq: N.D5, dur: 0.5, type: 'saw' },
      ],
    },
    {
      level: 0.5,
      notes: [
        { freq: N.C3, dur: 0.5, type: 'triangle', gain: 0.5 },
        { freq: N.G3, dur: 0.5, type: 'triangle', gain: 0.5 },
        { freq: N.A2, dur: 0.5, type: 'triangle', gain: 0.5 },
        { freq: N.F4, dur: 0.5, type: 'triangle', gain: 0.4 },
        { freq: N.C3, dur: 0.75, type: 'triangle', gain: 0.5 },
      ],
    },
  ],
};

export const DEMO_TRACKS: DemoTrackDef[] = [
  { id: 'demo-midnight', title: 'Midnight Transmission', spec: midnightTransmission },
  { id: 'demo-spectral', title: 'Spectral Frequencies', spec: spectralFrequencies },
  { id: 'demo-echoes', title: 'Echoes from 1998', spec: echoesFrom1998 },
];
