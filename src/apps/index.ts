// Central app registration. Importing this module registers every built-in app.
// The window manager and shell never import apps directly — they read the registry.

import { registerApp } from './registry';
import {
  AssistantIcon,
  CalculatorIcon,
  ExplorerIcon,
  ImageIcon,
  MusicIcon,
  NotesIcon,
  SettingsIcon,
  TerminalIcon,
} from '../assets/icons';
import { NotesApp } from './notes/NotesApp';
import { ExplorerApp } from './explorer/ExplorerApp';
import { CalculatorApp } from './calculator/CalculatorApp';
import { TerminalApp } from './terminal/TerminalApp';
import { MusicApp } from './music/MusicApp';
import { SettingsApp } from './settings/SettingsApp';
import { AssistantApp } from './assistant/AssistantApp';
import { ImageViewerApp } from './imageviewer/ImageViewerApp';
import {
  NotesAppIcon,
  ExplorerAppIcon,
  TerminalAppIcon,
  CalculatorAppIcon,
  MusicAppIcon,
  ImageAppIcon,
  SettingsAppIcon,
  AssistantAppIcon,
} from '../assets/appIcons';

let registered = false;

export function registerBuiltinApps(): void {
  if (registered) return;
  registered = true;

  registerApp({
    id: 'notes',
    name: 'GraveNotes',
    Icon: NotesIcon,
    Component: NotesApp,
    TileIcon: NotesAppIcon,
    defaultBounds: { width: 560, height: 420 },
    accent: { from: '#6d3fd1', to: '#4bb3a7', glyph: '#f1edf8' },
  });
  registerApp({
    id: 'explorer',
    name: 'Tomb Explorer',
    Icon: ExplorerIcon,
    Component: ExplorerApp,
    TileIcon: ExplorerAppIcon,
    defaultBounds: { width: 600, height: 440 },
    accent: { from: '#357a72', to: '#6ef2a4', glyph: '#0e0b16' },
  });
  registerApp({
    id: 'terminal',
    name: 'Phantom Terminal',
    Icon: TerminalIcon,
    Component: TerminalApp,
    TileIcon: TerminalAppIcon,
    defaultBounds: { width: 620, height: 400 },
    accent: { from: '#111014', to: '#39c178', glyph: '#6ef2a4' },
  });
  registerApp({
    id: 'calculator',
    name: 'Calculator',
    Icon: CalculatorIcon,
    Component: CalculatorApp,
    TileIcon: CalculatorAppIcon,
    defaultBounds: { width: 300, height: 420 },
    accent: { from: '#6d3fd1', to: '#a784f8', glyph: '#f1edf8' },
  });
  registerApp({
    id: 'music',
    name: 'DeadWave',
    Icon: MusicIcon,
    Component: MusicApp,
    TileIcon: MusicAppIcon,
    defaultBounds: { width: 520, height: 500 },
    accent: { from: '#357a72', to: '#8b5cf6', glyph: '#f1edf8' },
  });
  registerApp({
    id: 'imageviewer',
    name: 'Spectral Viewer',
    Icon: ImageIcon,
    Component: ImageViewerApp,
    TileIcon: ImageAppIcon,
    defaultBounds: { width: 480, height: 420 },
    // Launched only by opening an image file; not shown as a desktop icon.
    desktop: false,
    accent: { from: '#357a72', to: '#6fcabf', glyph: '#0e0b16' },
  });
  registerApp({
    id: 'settings',
    name: 'Settings',
    Icon: SettingsIcon,
    Component: SettingsApp,
    TileIcon: SettingsAppIcon,
    defaultBounds: { width: 520, height: 520 },
    singleton: true,
    accent: { from: '#2a2733', to: '#9a8fb0', glyph: '#f1edf8' },
  });
  registerApp({
    id: 'assistant',
    name: 'Spirit Assistant',
    Icon: AssistantIcon,
    Component: AssistantApp,
    TileIcon: AssistantAppIcon,
    defaultBounds: { width: 420, height: 520 },
    singleton: true,
    accent: { from: '#6d3fd1', to: '#e8963a', glyph: '#f1edf8' },
  });
}
