// Original detailed SVG scene wallpapers for GhostOS.
// Hand-authored vector scenes (not gradients-only) with layered depth: sky,
// stars, moon, clouds/fog, distant silhouettes, midground structures, and a
// foreground. All original compositions — no third-party or traced imagery.
// Rendered as full-bleed background layers behind the desktop.

import type { FC } from 'react';

type WProps = { className?: string };

function Scene({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 640"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {children}
    </svg>
  );
}

/** A scattering of pixel stars, deterministic so renders are stable. */
function Stars({ seed = 1, count = 70, color = '#cfc7df' }: { seed?: number; count?: number; color?: string }) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const dots = Array.from({ length: count }, () => {
    const x = Math.round(rnd() * 1024);
    const y = Math.round(rnd() * 300);
    const size = rnd() > 0.85 ? 3 : 2;
    const op = 0.35 + rnd() * 0.5;
    return { x, y, size, op };
  });
  return (
    <g>
      {dots.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={d.size} height={d.size} fill={color} opacity={d.op} />
      ))}
    </g>
  );
}

/** Layered pixel cloud band. */
function CloudBand({ y, fill, opacity = 1, blocks }: { y: number; fill: string; opacity?: number; blocks: Array<[number, number, number, number]> }) {
  return (
    <g opacity={opacity}>
      {blocks.map(([x, dy, w, h], i) => (
        <rect key={i} x={x} y={y + dy} width={w} height={h} fill={fill} />
      ))}
    </g>
  );
}

// -------------------- Haunted Castle (default) --------------------

type CloudBlock = [number, number, number, number];
interface CloudCluster {
  y: number;
  fill: string;
  op: number;
  blocks: CloudBlock[];
}

const CASTLE_CLOUDS: CloudCluster[] = [
  { y: 96, fill: '#241f52', op: 0.9, blocks: [[80, 0, 140, 22], [40, 14, 110, 18], [200, -8, 120, 20], [150, 20, 90, 14]] },
  { y: 150, fill: '#322c66', op: 0.85, blocks: [[560, 0, 150, 24], [640, -12, 120, 20], [700, 10, 170, 22], [820, -2, 120, 18], [520, 18, 100, 16]] },
  { y: 232, fill: '#423c80', op: 0.8, blocks: [[600, 0, 220, 22], [760, 10, 180, 24], [540, 12, 130, 16], [880, -4, 120, 18]] },
  { y: 70, fill: '#1d1a45', op: 0.9, blocks: [[300, 0, 180, 18], [420, 10, 150, 16], [900, 6, 130, 18], [980, -4, 80, 14]] },
  { y: 300, fill: '#4a4590', op: 0.55, blocks: [[640, 0, 260, 20], [840, 8, 160, 18]] },
];

export const WallpaperCastle: FC<WProps> = ({ className }) => (
  <Scene className={className}>
    <defs>
      <linearGradient id="castle-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0f0c2a" />
        <stop offset="40%" stopColor="#1a1748" />
        <stop offset="75%" stopColor="#2a2a63" />
        <stop offset="100%" stopColor="#343a73" />
      </linearGradient>
      <radialGradient id="castle-moon" cx="42%" cy="38%" r="62%">
        <stop offset="0%" stopColor="#f6f8e6" />
        <stop offset="55%" stopColor="#d7e0c4" />
        <stop offset="85%" stopColor="#b3c2ac" />
        <stop offset="100%" stopColor="#8fa6a0" />
      </radialGradient>
      <radialGradient id="castle-moonhalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(226,236,208,0.55)" />
        <stop offset="60%" stopColor="rgba(160,180,190,0.18)" />
        <stop offset="100%" stopColor="rgba(160,180,190,0)" />
      </radialGradient>
      <linearGradient id="castle-stone" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#15122f" />
        <stop offset="55%" stopColor="#242056" />
        <stop offset="100%" stopColor="#1a1740" />
      </linearGradient>
      <radialGradient id="window-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(246,200,110,0.9)" />
        <stop offset="100%" stopColor="rgba(246,200,110,0)" />
      </radialGradient>
      <linearGradient id="castle-fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(120,130,200,0)" />
        <stop offset="100%" stopColor="rgba(120,130,200,0.35)" />
      </linearGradient>
      {/* pixel texture: 2px dither grid for a pixel-art feel */}
      <pattern id="px" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="transparent" />
        <rect width="2" height="2" fill="rgba(255,255,255,0.02)" />
        <rect x="2" y="2" width="2" height="2" fill="rgba(0,0,0,0.05)" />
      </pattern>
      <radialGradient id="castle-vig" cx="50%" cy="46%" r="70%">
        <stop offset="60%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(5,4,14,0.5)" />
      </radialGradient>
    </defs>

    <rect width="1024" height="640" fill="url(#castle-sky)" />
    <Stars seed={7} count={120} />
    <Stars seed={19} count={30} color="#8ff7bc" />

    {/* Moon with layered halo and craters */}
    <circle cx="742" cy="176" r="170" fill="url(#castle-moonhalo)" />
    <circle cx="742" cy="176" r="96" fill="url(#castle-moon)" />
    <g fill="#9fb3a4" opacity="0.5">
      <circle cx="712" cy="150" r="13" />
      <circle cx="770" cy="196" r="18" />
      <circle cx="758" cy="142" r="7" />
      <circle cx="724" cy="200" r="9" />
      <circle cx="792" cy="160" r="6" />
    </g>
    <circle cx="742" cy="176" r="96" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

    {/* Irregular, multi-tone pixel cloud clusters drifting over the moon */}
    {CASTLE_CLOUDS.map((c, i) => (
      <CloudBand key={i} y={c.y} fill={c.fill} opacity={c.op} blocks={c.blocks} />
    ))}

    {/* Distant mountain ridge + faint ghost spires (left depth) */}
    <path d="M0 410 L120 352 L230 404 L360 360 L470 420 L470 640 L0 640 Z" fill="#171433" opacity="0.9" />
    <g fill="#1d1a44" opacity="0.7">
      <rect x="64" y="350" width="9" height="66" /><path d="M62 350 l7 -20 l7 20 z" />
      <rect x="104" y="366" width="7" height="50" /><path d="M102 366 l5 -16 l5 16 z" />
      <rect x="138" y="372" width="6" height="44" /><path d="M136 372 l5 -14 l5 14 z" />
    </g>

    {/* Cliff with rock shading + cast shadow */}
    <path d="M110 640 L110 468 Q190 436 300 450 Q400 438 480 470 L480 640 Z" fill="#12102a" />
    <path d="M110 640 L110 496 Q200 474 300 484 Q390 476 480 504 L480 640 Z" fill="#0d0b20" />
    {/* rock strata highlights */}
    <g stroke="#201c48" strokeWidth="2" opacity="0.6" fill="none">
      <path d="M130 520 Q230 502 330 512" />
      <path d="M150 560 Q260 544 380 556" />
      <path d="M120 590 Q250 576 400 588" />
    </g>

    {/* Castle — layered masses with lit (left) and shadow (right) faces */}
    <g>
      {/* back towers (further, darker) */}
      <rect x="196" y="286" width="56" height="178" fill="#161338" />
      <path d="M194 286 l30 -30 l30 30 z" fill="#1c1947" />
      <rect x="402" y="320" width="40" height="144" fill="#161338" />
      <path d="M400 320 l22 -24 l22 24 z" fill="#1c1947" />

      {/* main keep */}
      <rect x="248" y="244" width="78" height="222" fill="url(#castle-stone)" />
      <rect x="248" y="244" width="14" height="222" fill="#2c2866" opacity="0.7" />
      <rect x="312" y="244" width="14" height="222" fill="#0e0c26" opacity="0.6" />
      {/* battlements */}
      <g fill="#242056">
        {[248,262,276,290,304,318].map((x) => <rect key={x} x={x} y="238" width="8" height="10" />)}
      </g>

      {/* tall central tower */}
      <rect x="300" y="150" width="50" height="316" fill="url(#castle-stone)" />
      <rect x="300" y="150" width="10" height="316" fill="#312c72" opacity="0.7" />
      <rect x="340" y="150" width="10" height="316" fill="#0e0c26" opacity="0.6" />
      <path d="M296 150 l29 -46 l29 46 z" fill="#2a2666" />
      <path d="M325 104 l0 46 l29 0 z" fill="#17143a" />

      {/* left wing */}
      <rect x="184" y="298" width="74" height="168" fill="#1d1a44" />
      <path d="M182 298 l38 -34 l38 34 z" fill="#242056" />
      {/* right wing */}
      <rect x="340" y="296" width="74" height="170" fill="#17143a" />
      <path d="M338 296 l38 -30 l38 30 z" fill="#1d1a44" />
    </g>

    {/* flag */}
    <rect x="324" y="86" width="2" height="22" fill="#cfc7df" />
    <path d="M326 88 l18 7 l-18 7 z" fill="#c0392b" />

    {/* Window glows (soft halo + bright core) */}
    {([
      [318,204],[332,204],[318,250],[332,250],
      [266,316],[290,316],[206,348],[228,348],
      [360,340],[384,340],[318,300],[332,300],
    ] as const).map(([x,y],i) => (
      <g key={i}>
        <circle cx={x+4} cy={y+6} r="16" fill="url(#window-glow)" />
        <rect x={x} y={y} width="8" height="13" fill="#ffe3a0" />
        <rect x={x+2} y={y+2} width="4" height="9" fill="#fff3d0" />
      </g>
    ))}
    {/* lit arched gate */}
    <circle cx="300" cy="438" r="30" fill="url(#window-glow)" />
    <path d="M288 466 v-24 a12 12 0 0 1 24 0 v24 z" fill="#ffdf9a" />

    {/* Layered foreground pines (3 depth tones) */}
    {([
      { tone: '#151334', base: 470, scale: 0.8, xs: [20,70,118,170,940,890,840] },
      { tone: '#0d0b22', base: 512, scale: 1.0, xs: [-6,54,110,175,232,1002,952,900,842,784] },
      { tone: '#070615', base: 560, scale: 1.25, xs: [-20,44,120,200,1010,930,850,770] },
    ] as const).map((layer, li) => (
      <g key={li} fill={layer.tone}>
        {layer.xs.map((x, i) => (
          <g key={i} transform={`translate(${x} ${layer.base}) scale(${layer.scale})`}>
            <rect x="8" y="64" width="6" height="42" />
            <path d="M11 -8 L30 56 L-8 56 Z" />
            <path d="M11 16 L33 84 L-11 84 Z" />
            <path d="M11 40 L36 110 L-14 110 Z" />
          </g>
        ))}
      </g>
    ))}

    {/* Atmospheric fog layers, lit slightly by the moon */}
    <rect x="0" y="470" width="1024" height="170" fill="url(#castle-fog)" />
    <CloudBand y={540} fill="#4a4f94" opacity={0.18} blocks={[[0,0,320,26],[280,10,300,22],[560,-4,320,26],[820,8,260,20]]} />
    <CloudBand y={590} fill="#5a5fa6" opacity={0.16} blocks={[[120,0,360,24],[480,8,360,22],[820,-2,260,20]]} />

    {/* global pixel texture + gentle vignette */}
    <rect width="1024" height="640" fill="url(#px)" />
    <rect width="1024" height="640" fill="url(#castle-vig)" />
  </Scene>
);

// -------------------- Blood Moon Graveyard --------------------

export const WallpaperGraveyard: FC<WProps> = ({ className }) => (
  <Scene className={className}>
    <defs>
      <linearGradient id="grave-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a0a12" />
        <stop offset="60%" stopColor="#2a0f16" />
        <stop offset="100%" stopColor="#120a14" />
      </linearGradient>
      <radialGradient id="blood-moon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f0a24a" />
        <stop offset="55%" stopColor="#d35236" />
        <stop offset="100%" stopColor="#7a1f1f" />
      </radialGradient>
      <radialGradient id="blood-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(211,82,54,0.45)" />
        <stop offset="100%" stopColor="rgba(211,82,54,0)" />
      </radialGradient>
    </defs>

    <rect width="1024" height="640" fill="url(#grave-sky)" />
    <Stars seed={21} count={60} color="#e7b7a0" />

    <circle cx="512" cy="210" r="220" fill="url(#blood-halo)" />
    <circle cx="512" cy="210" r="120" fill="url(#blood-moon)" />
    <CloudBand y={190} fill="#2a0f16" opacity={0.85} blocks={[[380,0,160,18],[520,8,200,22],[300,12,120,16],[700,4,160,18]]} />
    <CloudBand y={120} fill="#1f0b11" opacity={0.8} blocks={[[120,0,200,16],[420,8,180,18],[760,-4,180,18]]} />

    {/* distant dead trees */}
    <g stroke="#160a10" strokeWidth="4" fill="none" opacity="0.9">
      <path d="M120 430 L120 320 M120 360 L96 336 M120 380 L146 352 M120 340 L104 322" />
      <path d="M900 440 L900 330 M900 370 L924 346 M900 390 L876 364" />
    </g>

    {/* ground */}
    <path d="M0 440 Q256 410 512 430 Q768 412 1024 438 L1024 640 L0 640 Z" fill="#160a10" />
    <path d="M0 500 Q300 476 560 494 Q800 480 1024 500 L1024 640 L0 640 Z" fill="#0f070b" />

    {/* tombstones */}
    <g fill="#231820" stroke="#30212b" strokeWidth="2">
      <path d="M210 470 h40 v-30 a20 20 0 0 0 -40 0 z" />
      <rect x="300" y="452" width="30" height="40" />
      <path d="M300 452 l15 -14 l15 14 z" />
      <path d="M430 480 h34 v-26 a17 17 0 0 0 -34 0 z" />
      <rect x="560" y="458" width="26" height="40" transform="rotate(-6 573 478)" />
      <path d="M660 476 h44 v-34 a22 22 0 0 0 -44 0 z" />
      <rect x="770" y="462" width="28" height="42" />
      <path d="M770 462 l14 -12 l14 12 z" />
    </g>
    {/* crosses */}
    <g stroke="#2a1c25" strokeWidth="6">
      <path d="M360 476 v-40 M344 448 h32" />
      <path d="M840 486 v-44 M824 456 h32" />
    </g>

    {/* fog */}
    <rect x="0" y="470" width="1024" height="60" fill="#d35236" opacity="0.08" />
    <rect x="0" y="540" width="1024" height="100" fill="#2a0f16" opacity="0.4" />

    {/* foreground gate silhouette */}
    <g fill="#0b0609">
      <rect x="20" y="300" width="14" height="340" />
      <rect x="130" y="300" width="14" height="340" />
      <path d="M20 300 q62 -60 124 0 l0 16 q-62 -52 -124 0 z" />
    </g>
  </Scene>
);

// -------------------- Misty Haunted Forest --------------------

export const WallpaperForest: FC<WProps> = ({ className }) => (
  <Scene className={className}>
    <defs>
      <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#07140e" />
        <stop offset="55%" stopColor="#0c2018" />
        <stop offset="100%" stopColor="#081511" />
      </linearGradient>
      <radialGradient id="forest-glow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="rgba(110,242,164,0.28)" />
        <stop offset="100%" stopColor="rgba(110,242,164,0)" />
      </radialGradient>
    </defs>

    <rect width="1024" height="640" fill="url(#forest-sky)" />
    <Stars seed={33} count={50} color="#9ff7bc" />
    <ellipse cx="512" cy="230" rx="360" ry="220" fill="url(#forest-glow)" />
    <circle cx="512" cy="150" r="60" fill="#dff7e6" opacity="0.8" />
    <circle cx="512" cy="150" r="60" fill="#0c2018" opacity="0.15" />

    {/* layered tree walls, back to front, each lighter->darker for depth */}
    {([
      { y: 300, fill: '#12342a', step: 64, h: 150 },
      { y: 350, fill: '#0e2a22', step: 80, h: 180 },
      { y: 410, fill: '#0a1f19', step: 104, h: 220 },
    ] as const).map((layer, li) => (
      <g key={li} fill={layer.fill}>
        {Array.from({ length: Math.ceil(1024 / layer.step) + 1 }, (_, i) => {
          const x = i * layer.step;
          return (
            <path
              key={i}
              d={`M${x} ${layer.y + 640} L${x} ${layer.y} L${x + layer.step / 2} ${layer.y - 46} L${x + layer.step} ${layer.y} Z`}
            />
          );
        })}
      </g>
    ))}

    {/* mist bands between layers */}
    <rect x="0" y="330" width="1024" height="34" fill="#6ef2a4" opacity="0.07" />
    <rect x="0" y="400" width="1024" height="40" fill="#8ff7bc" opacity="0.08" />
    <rect x="0" y="480" width="1024" height="70" fill="#4bb3a7" opacity="0.1" />
    <rect x="0" y="560" width="1024" height="80" fill="#9ff7bc" opacity="0.07" />

    {/* glowing eyes in the dark */}
    <g fill="#6ef2a4">
      <rect x="300" y="470" width="4" height="4" />
      <rect x="310" y="470" width="4" height="4" />
      <rect x="690" y="500" width="4" height="4" />
      <rect x="700" y="500" width="4" height="4" />
    </g>

    {/* foreground trunks */}
    <g fill="#06100c">
      <rect x="60" y="260" width="26" height="380" />
      <rect x="940" y="300" width="30" height="340" />
      <rect x="430" y="360" width="18" height="280" />
    </g>
  </Scene>
);

// -------------------- Supernatural Landscape (Amethyst Void) --------------------

export const WallpaperVoid: FC<WProps> = ({ className }) => (
  <Scene className={className}>
    <defs>
      <linearGradient id="void-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a0620" />
        <stop offset="50%" stopColor="#140a33" />
        <stop offset="100%" stopColor="#0b0718" />
      </linearGradient>
      <radialGradient id="void-neb1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(139,92,246,0.5)" />
        <stop offset="100%" stopColor="rgba(139,92,246,0)" />
      </radialGradient>
      <radialGradient id="void-neb2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(75,179,167,0.4)" />
        <stop offset="100%" stopColor="rgba(75,179,167,0)" />
      </radialGradient>
      <radialGradient id="void-portal" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#d9c7ff" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="rgba(109,63,209,0)" />
      </radialGradient>
    </defs>

    <rect width="1024" height="640" fill="url(#void-sky)" />
    <ellipse cx="300" cy="180" rx="360" ry="300" fill="url(#void-neb1)" />
    <ellipse cx="800" cy="320" rx="320" ry="260" fill="url(#void-neb2)" />
    <Stars seed={99} count={110} color="#e5d9ff" />

    {/* floating portal / moon */}
    <circle cx="640" cy="210" r="96" fill="url(#void-portal)" />
    <circle cx="640" cy="210" r="96" fill="none" stroke="#d9c7ff" strokeWidth="2" opacity="0.5" />

    {/* floating islands with waterfalls of light */}
    <g fill="#1b1340">
      <path d="M120 360 q70 -40 150 0 l-20 44 q-55 26 -110 0 z" />
      <path d="M760 430 q60 -34 128 0 l-18 40 q-46 22 -92 0 z" />
      <path d="M420 500 q90 -44 190 0 l-26 50 q-70 30 -138 0 z" />
    </g>
    <g stroke="#a784f8" strokeWidth="3" opacity="0.5">
      <path d="M190 404 L184 470" />
      <path d="M820 470 L814 520" />
      <path d="M512 550 L506 610" />
    </g>

    {/* distant mountains */}
    <path d="M0 540 L160 430 L300 540 Z" fill="#160e30" />
    <path d="M260 540 L470 400 L680 540 Z" fill="#120a28" />
    <path d="M620 540 L820 440 L1024 540 L1024 640 L0 640 L0 540 Z" fill="#0d071c" />
    <rect x="0" y="560" width="1024" height="80" fill="#8b5cf6" opacity="0.08" />
  </Scene>
);
