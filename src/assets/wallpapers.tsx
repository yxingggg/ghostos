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

export const WallpaperCastle: FC<WProps> = ({ className }) => (
  <Scene className={className}>
    <defs>
      <linearGradient id="castle-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#141033" />
        <stop offset="45%" stopColor="#1e1b4e" />
        <stop offset="100%" stopColor="#2a2a63" />
      </linearGradient>
      <radialGradient id="castle-moon" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#eef3dd" />
        <stop offset="70%" stopColor="#c7d6b8" />
        <stop offset="100%" stopColor="#8fa6a0" />
      </radialGradient>
      <radialGradient id="castle-moonhalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(224,234,205,0.5)" />
        <stop offset="100%" stopColor="rgba(224,234,205,0)" />
      </radialGradient>
    </defs>

    <rect width="1024" height="640" fill="url(#castle-sky)" />
    <Stars seed={7} count={90} />

    {/* Moon with halo, right of centre */}
    <circle cx="740" cy="180" r="150" fill="url(#castle-moonhalo)" />
    <circle cx="740" cy="180" r="92" fill="url(#castle-moon)" />
    {/* craters */}
    <circle cx="712" cy="158" r="12" fill="#aebfa6" opacity="0.6" />
    <circle cx="766" cy="196" r="16" fill="#aebfa6" opacity="0.5" />
    <circle cx="755" cy="150" r="7" fill="#aebfa6" opacity="0.5" />

    {/* Cloud bands drifting across the moon */}
    <CloudBand y={120} fill="#3a3a78" opacity={0.85} blocks={[[560,0,120,16],[600,-10,160,20],[700,6,150,18],[820,-4,120,16],[520,18,90,14]]} />
    <CloudBand y={210} fill="#4a4a8c" opacity={0.75} blocks={[[640,0,200,18],[780,8,160,20],[560,10,120,14],[860,-2,120,16]]} />
    <CloudBand y={70} fill="#2e2e63" opacity={0.8} blocks={[[120,0,180,16],[60,10,120,14],[280,-6,160,18],[900,6,120,16]]} />

    {/* Distant hill + faint spires (left depth) */}
    <path d="M0 420 L0 640 L420 640 L420 440 Q300 410 200 420 Q100 408 0 420 Z" fill="#191636" />
    <g fill="#201d45" opacity="0.8">
      <rect x="70" y="360" width="10" height="70" />
      <path d="M68 360 l7 -22 l7 22 z" />
      <rect x="110" y="376" width="8" height="54" />
      <path d="M108 376 l6 -18 l6 18 z" />
    </g>

    {/* Cliff the castle sits on */}
    <path d="M120 640 L120 470 Q200 440 300 452 Q400 440 470 470 L470 640 Z" fill="#14122c" />
    <path d="M120 640 L120 500 Q210 478 300 488 Q380 480 470 505 L470 640 Z" fill="#0f0d24" />

    {/* Castle silhouette with towers */}
    <g fill="#201d47" stroke="#2c2960" strokeWidth="2">
      {/* main keep */}
      <rect x="250" y="250" width="70" height="210" />
      {/* tall central tower */}
      <rect x="300" y="170" width="46" height="290" />
      <path d="M298 170 l25 -42 l25 42 z" fill="#2c2960" />
      {/* left wing */}
      <rect x="190" y="300" width="70" height="160" />
      <path d="M188 300 l35 -34 l35 34 z" fill="#2c2960" />
      {/* right wing */}
      <rect x="338" y="296" width="70" height="164" />
      <path d="M336 296 l35 -30 l35 30 z" fill="#2c2960" />
      {/* side turret */}
      <rect x="406" y="330" width="34" height="130" />
      <path d="M404 330 l19 -26 l19 26 z" fill="#2c2960" />
    </g>
    {/* flag */}
    <g>
      <rect x="322" y="110" width="2" height="22" fill="#cfc7df" />
      <path d="M324 112 l16 6 l-16 6 z" fill="#c0392b" />
    </g>

    {/* Glowing windows */}
    <g fill="#f4c66a">
      <rect x="315" y="210" width="8" height="12" />
      <rect x="327" y="210" width="8" height="12" />
      <rect x="315" y="250" width="8" height="12" />
      <rect x="327" y="250" width="8" height="12" />
      <rect x="268" y="300" width="8" height="12" />
      <rect x="296" y="300" width="8" height="12" />
      <rect x="210" y="340" width="8" height="12" />
      <rect x="230" y="340" width="8" height="12" />
      <rect x="356" y="330" width="8" height="12" />
      <rect x="378" y="330" width="8" height="12" />
      {/* big arched gate glow */}
      <rect x="286" y="408" width="24" height="40" rx="10" opacity="0.9" />
    </g>
    <g fill="#f4c66a" opacity="0.18">
      <circle cx="298" cy="430" r="40" />
    </g>

    {/* Foreground pines */}
    <g fill="#0a0a1c">
      {[-10, 40, 92, 150, 210, 980, 930, 880, 820, 760, 700].map((x, i) => (
        <g key={i} transform={`translate(${x} ${540 - (i % 3) * 14})`}>
          <rect x="7" y="70" width="6" height="40" />
          <path d="M10 -6 L28 60 L-8 60 Z" />
          <path d="M10 18 L30 84 L-10 84 Z" />
        </g>
      ))}
    </g>

    {/* Fog near the ground */}
    <rect x="0" y="560" width="1024" height="80" fill="#2a2a63" opacity="0.25" />
    <rect x="0" y="590" width="1024" height="50" fill="#3a3a78" opacity="0.2" />
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
