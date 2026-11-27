// Lazily-created Web Audio graph for DeadWave.
//
// Creating a MediaElementSource permanently routes an <audio> element's output
// through the Web Audio graph, so it MUST connect through to destination or the
// element goes silent. We also only build the graph on a user gesture and
// resume the context, because browsers start AudioContexts suspended until a
// gesture — building it earlier can leave playback muted.

interface Graph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

// One graph per element (a second createMediaElementSource on the same element
// throws). Keyed weakly so GC can reclaim it with the element.
const graphs = new WeakMap<HTMLAudioElement, Graph>();

function AudioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/** True when the Web Audio API is available in this environment. */
export function audioSupported(): boolean {
  return AudioCtor() !== null;
}

/**
 * Ensure the graph exists for `el` and the context is running. Call this from a
 * user-gesture handler (e.g. Play). Returns the analyser for visualization, or
 * null if Web Audio is unavailable (audio still plays via the element itself).
 */
export async function ensureGraph(el: HTMLAudioElement): Promise<AnalyserNode | null> {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  let graph = graphs.get(el);
  if (!graph) {
    try {
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      // source -> analyser -> destination keeps audio audible AND analysable.
      source.connect(analyser);
      analyser.connect(ctx.destination);
      graph = { ctx, analyser, source };
      graphs.set(el, graph);
    } catch {
      return null;
    }
  }
  if (graph.ctx.state === 'suspended') {
    try {
      await graph.ctx.resume();
    } catch {
      // ignore — playback may still proceed via the element
    }
  }
  return graph.analyser;
}

/** Get an existing analyser for `el` without creating one. */
export function existingAnalyser(el: HTMLAudioElement | null): AnalyserNode | null {
  if (!el) return null;
  return graphs.get(el)?.analyser ?? null;
}
