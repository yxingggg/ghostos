import type { FC } from 'react';
import type { Bounds } from '../core/wm/types';

export interface AppComponentProps {
  windowId: string;
  props?: Record<string, unknown>;
}

export interface AppDefinition {
  id: string;
  name: string;
  Icon: FC<{ className?: string }>;
  Component: FC<AppComponentProps>;
  defaultBounds?: Partial<Bounds>;
  /** If true, launching focuses an existing window instead of opening a new one. */
  singleton?: boolean;
  /** Show on the desktop as an icon. */
  desktop?: boolean;
  /**
   * Visual accent for the app's icon tile: a CSS gradient and a glyph tint.
   * Purely cosmetic; defaults applied if omitted.
   */
  accent?: { from: string; to: string; glyph: string };
}

const registry = new Map<string, AppDefinition>();

export function registerApp(def: AppDefinition): void {
  registry.set(def.id, def);
}

export function getApps(): AppDefinition[] {
  return Array.from(registry.values());
}

export function getApp(id: string): AppDefinition | undefined {
  return registry.get(id);
}

/** Test-only reset. */
export function __clearRegistry(): void {
  registry.clear();
}
