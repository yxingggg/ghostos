import { describe, it, expect } from 'vitest';
import { isKnownCommand, runCommand, ShellContext } from './interpreter';
import { createNode, createVfs } from '../vfs/ops';
import { Clock, VfsState } from '../vfs/types';

const clock: Clock = { now: () => 1 };

function seed(): VfsState {
  let s = createVfs('root', clock);
  const d = createNode(s, 'root', 'docs', { id: 'docs', kind: 'folder' }, clock);
  if (d.ok) s = d.value;
  const f = createNode(s, 'docs', 'note.txt', { id: 'note', kind: 'file' }, clock);
  if (f.ok) s = f.value;
  return s;
}

function ctx(vfs: VfsState, cwd = 'root'): ShellContext {
  return { vfs, cwd, user: 'ghost' };
}

describe('runCommand — navigation and listing', () => {
  it('pwd prints root', () => {
    expect(runCommand('pwd', ctx(seed())).output).toEqual(['/']);
  });

  it('ls lists folders with trailing slash', () => {
    expect(runCommand('ls', ctx(seed())).output).toEqual(['docs/']);
  });

  it('cd changes directory and pwd reflects it', () => {
    const vfs = seed();
    const cd = runCommand('cd docs', ctx(vfs));
    expect(cd.cwd).toBe('docs');
    const pwd = runCommand('pwd', ctx(vfs, cd.cwd));
    expect(pwd.output).toEqual(['/docs']);
  });

  it('cd .. returns to the parent', () => {
    const vfs = seed();
    const res = runCommand('cd ..', ctx(vfs, 'docs'));
    expect(res.cwd).toBe('root');
  });

  it('cd into a missing directory errors', () => {
    expect(runCommand('cd nope', ctx(seed())).output[0]).toContain('no such directory');
  });
});

describe('runCommand — mutations', () => {
  it('mkdir creates a folder', () => {
    const res = runCommand('mkdir stuff', ctx(seed()));
    expect(res.vfs).toBeDefined();
    const names = Object.values(res.vfs!.nodes).map((n) => n.name);
    expect(names).toContain('stuff');
  });

  it('touch creates a file', () => {
    const res = runCommand('touch a.txt', ctx(seed()));
    expect(res.vfs).toBeDefined();
    const names = Object.values(res.vfs!.nodes).map((n) => n.name);
    expect(names).toContain('a.txt');
  });

  it('rm removes a node', () => {
    const res = runCommand('rm docs', ctx(seed()));
    expect(res.vfs).toBeDefined();
    expect(res.vfs!.nodes.docs).toBeUndefined();
    expect(res.vfs!.nodes.note).toBeUndefined();
  });

  it('mkdir with duplicate name reports the error', () => {
    expect(runCommand('mkdir docs', ctx(seed())).output[0]).toContain('already exists');
  });
});

describe('runCommand — misc and errors', () => {
  it('echo prints its arguments', () => {
    expect(runCommand('echo hello world', ctx(seed())).output).toEqual(['hello world']);
  });

  it('whoami prints the user', () => {
    expect(runCommand('whoami', ctx(seed())).output).toEqual(['ghost']);
  });

  it('clear signals cleared', () => {
    expect(runCommand('clear', ctx(seed())).cleared).toBe(true);
  });

  it('unknown command reports not found and keeps running', () => {
    const res = runCommand('frobnicate', ctx(seed()));
    expect(res.output[0]).toContain('command not found');
    expect(res.vfs).toBeUndefined();
  });

  it('empty input yields no output', () => {
    expect(runCommand('   ', ctx(seed())).output).toEqual([]);
  });

  it('help lists all known commands', () => {
    const out = runCommand('help', ctx(seed())).output.join('\n');
    for (const c of ['help', 'ls', 'cd', 'cat', 'mkdir', 'touch', 'rm', 'echo', 'clear', 'pwd', 'whoami']) {
      expect(out).toContain(c);
    }
  });

  it('isKnownCommand recognizes the command set', () => {
    expect(isKnownCommand('ls')).toBe(true);
    expect(isKnownCommand('nope')).toBe(false);
  });
});
