import type { Config } from 'tailwindcss';

// GhostOS retro-gothic design tokens.
// Palette: deep purple, charcoal, muted teal, spectral green accents.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds / surfaces
        crypt: {
          900: '#0a0812', // deepest void
          800: '#0e0b16', // desktop base
          700: '#151024', // window body
          600: '#1d1733', // raised surface
          500: '#271f45', // borders / bevels
        },
        charcoal: {
          900: '#111014',
          700: '#1c1a22',
          500: '#2a2733',
        },
        // Accents
        spectral: {
          // spectral green
          500: '#6ef2a4',
          400: '#8ff7bc',
          600: '#39c178',
        },
        teal: {
          // muted teal
          500: '#4bb3a7',
          400: '#6fcabf',
          600: '#357a72',
        },
        amethyst: {
          // deep purple accent
          500: '#8b5cf6',
          400: '#a784f8',
          600: '#6d3fd1',
        },
        bone: {
          100: '#f1edf8',
          300: '#cfc7df',
          500: '#9a8fb0',
        },
        blood: {
          500: '#c0392b',
          400: '#e05a4c',
        },
        // Warm accent for highlights/badges — improves contrast against purples.
        ember: {
          400: '#f4b267',
          500: '#e8963a',
        },
      },
      fontFamily: {
        pixel: ['"VT323"', '"Courier New"', 'monospace'],
        gothic: ['"IM Fell English SC"', 'Georgia', 'serif'],
        mono: ['"VT323"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Beveled 9x-era chrome
        'bevel-out':
          'inset 1px 1px 0 0 rgba(255,255,255,0.12), inset -2px -2px 0 0 rgba(0,0,0,0.6)',
        'bevel-in':
          'inset -1px -1px 0 0 rgba(255,255,255,0.12), inset 2px 2px 0 0 rgba(0,0,0,0.6)',
        glow: '0 0 12px 0 rgba(110,242,164,0.35)',
        'glow-amethyst': '0 0 16px 0 rgba(139,92,246,0.4)',
        'glow-sm': '0 0 6px 0 rgba(110,242,164,0.3)',
        window: '0 16px 48px -10px rgba(0,0,0,0.85), 0 2px 8px -2px rgba(139,92,246,0.25)',
        'taskbar': '0 -6px 20px -8px rgba(0,0,0,0.7)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.82' },
          '94%': { opacity: '1' },
          '97%': { opacity: '0.9' },
        },
        bootblink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        risefade: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseglow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(110,242,164,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(110,242,164,0.8))' },
        },
        winopen: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        flicker: 'flicker 6s linear infinite',
        bootblink: 'bootblink 1s step-end infinite',
        risefade: 'risefade 180ms ease-out',
        fadein: 'fadein 300ms ease-out',
        float: 'float 4s ease-in-out infinite',
        pulseglow: 'pulseglow 3s ease-in-out infinite',
        winopen: 'winopen 140ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
