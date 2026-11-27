import { describe, it, expect, beforeEach } from 'vitest';
import { __clearRegistry, getApp, getApps, registerApp } from './registry';

const Noop = () => null;

describe('app registry', () => {
  beforeEach(() => __clearRegistry());

  it('registers and retrieves apps', () => {
    registerApp({ id: 'a', name: 'A', Icon: Noop, Component: Noop });
    registerApp({ id: 'b', name: 'B', Icon: Noop, Component: Noop });
    expect(getApps().map((a) => a.id)).toEqual(['a', 'b']);
    expect(getApp('a')?.name).toBe('A');
    expect(getApp('missing')).toBeUndefined();
  });

  it('overwrites an app registered with the same id', () => {
    registerApp({ id: 'a', name: 'First', Icon: Noop, Component: Noop });
    registerApp({ id: 'a', name: 'Second', Icon: Noop, Component: Noop });
    expect(getApps()).toHaveLength(1);
    expect(getApp('a')?.name).toBe('Second');
  });
});
