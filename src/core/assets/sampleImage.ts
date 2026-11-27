// An original sample image for Spectral Viewer — a hand-authored SVG "spectral
// sigil". Bundled as a string so it works offline with no binary asset. This is
// an original composition for GhostOS.

export const SAMPLE_IMAGE_NAME = 'spectral-sigil.svg';

export const SAMPLE_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#6ef2a4"/>
      <stop offset="55%" stop-color="#4bb3a7"/>
      <stop offset="100%" stop-color="#1d1733"/>
    </radialGradient>
  </defs>
  <rect width="256" height="256" fill="#0a0812"/>
  <circle cx="128" cy="110" r="78" fill="url(#g)" opacity="0.9"/>
  <circle cx="128" cy="110" r="78" fill="none" stroke="#8b5cf6" stroke-width="2"/>
  <path d="M128 40 L150 104 L216 104 L162 142 L182 206 L128 168 L74 206 L94 142 L40 104 L106 104 Z"
        fill="none" stroke="#e8e3f0" stroke-width="2" opacity="0.8"/>
  <circle cx="128" cy="110" r="10" fill="#0a0812" stroke="#6ef2a4" stroke-width="2"/>
  <text x="128" y="238" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#c7bfd8">GhostOS</text>
</svg>`;

/** Encode the sample SVG as a UTF-8 ArrayBuffer for storage in the VFS. */
export function sampleImageBytes(): ArrayBuffer {
  return new TextEncoder().encode(SAMPLE_IMAGE_SVG).buffer;
}
