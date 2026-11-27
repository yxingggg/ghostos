import { useEffect, useRef } from 'react';

interface Props {
  /** Analyser from the shared audio graph, or null (renders a flat baseline). */
  analyser: AnalyserNode | null;
  playing: boolean;
}

/**
 * Canvas spectrum visualizer. It only READS from an analyser node owned by the
 * MusicApp's audio graph — it never creates the graph itself, so it can't
 * accidentally reroute (and mute) the audio element. If there is no analyser
 * (Web Audio unavailable, or playback hasn't started), it draws a flat baseline.
 */
export function Visualizer({ analyser, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const bins = analyser ? analyser.frequencyBinCount : 32;
    const data = new Uint8Array(bins);

    const draw = () => {
      const w = (canvas.width = canvas.clientWidth || 1);
      const h = (canvas.height = canvas.clientHeight || 1);
      g.fillStyle = '#0a0812';
      g.fillRect(0, 0, w, h);

      if (analyser && playing) analyser.getByteFrequencyData(data);

      const barW = w / bins;
      for (let i = 0; i < bins; i += 1) {
        const v = analyser && playing ? (data[i] ?? 0) / 255 : 0.04;
        const barH = Math.max(2, v * h);
        const hue = 150 - v * 60; // spectral green -> teal
        g.fillStyle = `hsl(${hue}, 70%, ${35 + v * 25}%)`;
        g.fillRect(i * barW + 1, h - barH, barW - 1, barH);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, playing]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-20 w-full shrink-0 bg-crypt-900" />;
}
