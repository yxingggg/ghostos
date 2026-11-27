import { useEffect, useRef } from 'react';

interface Props {
  audioEl: HTMLAudioElement | null;
  playing: boolean;
}

// Shared Web Audio graph keyed by the audio element, so re-mounting the
// component doesn't create duplicate MediaElementSource nodes (which throws).
const graphCache = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode }
>();

function getGraph(el: HTMLAudioElement): { ctx: AudioContext; analyser: AnalyserNode } | null {
  const cached = graphCache.get(el);
  if (cached) return cached;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    const source = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    const graph = { ctx, analyser };
    graphCache.set(el, graph);
    return graph;
  } catch {
    return null;
  }
}

/**
 * Canvas spectrum visualizer driven by the Web Audio analyser. If Web Audio is
 * unavailable the canvas simply renders a flat baseline (audio still plays).
 */
export function Visualizer({ audioEl, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const graph = audioEl ? getGraph(audioEl) : null;
    if (graph && graph.ctx.state === 'suspended' && playing) void graph.ctx.resume();

    const bins = graph ? graph.analyser.frequencyBinCount : 32;
    const data = new Uint8Array(bins);

    const draw = () => {
      const w = (canvas.width = canvas.clientWidth);
      const h = (canvas.height = canvas.clientHeight);
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#0a0812';
      g.fillRect(0, 0, w, h);

      if (graph) graph.analyser.getByteFrequencyData(data);

      const barW = w / bins;
      for (let i = 0; i < bins; i += 1) {
        const v = graph ? (data[i] ?? 0) / 255 : 0.04;
        const barH = Math.max(2, v * h);
        const hue = 150 - v * 60; // spectral green -> teal
        g.fillStyle = `hsl(${hue}, 70%, ${35 + v * 25}%)`;
        g.fillRect(i * barW + 1, h - barH, barW - 1, barH);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioEl, playing]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="h-24 w-full shrink-0 bg-crypt-900"
    />
  );
}
