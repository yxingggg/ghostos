// Phantom Terminal — pure command interpreter over the VFS.
// Returns output lines plus any VFS/cwd mutations for the store to apply.
// Never evaluates host code; operates exclusively on the virtual file system.

import { createId } from '../id';
import {
  childrenOf,
  createNode,
  getNode,
  pathOf,
  remove,
} from '../vfs/ops';
import { NodeId, VfsNode, VfsState } from '../vfs/types';

export interface ShellContext {
  vfs: VfsState;
  cwd: NodeId;
  user: string;
}

export interface CommandResult {
  output: string[];
  /** New VFS state if the command mutated it. */
  vfs?: VfsState;
  /** New working directory if the command changed it. */
  cwd?: NodeId;
  /** True if the scrollback should be cleared. */
  cleared?: boolean;
}

const COMMANDS = [
  'help',
  'ls',
  'cd',
  'cat',
  'mkdir',
  'touch',
  'rm',
  'echo',
  'clear',
  'pwd',
  'whoami',
] as const;

function tokenize(line: string): string[] {
  // Simple whitespace tokenizer with support for quoted segments.
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return tokens;
}

function pathString(vfs: VfsState, id: NodeId): string {
  const parts = pathOf(vfs, id);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(1).map((n) => n.name).join('/');
}

/** Resolve a path (absolute or relative) to a node id, or null if not found. */
function resolve(vfs: VfsState, cwd: NodeId, path: string): NodeId | null {
  if (path === '') return cwd;
  const absolute = path.startsWith('/');
  let current: NodeId = absolute ? vfs.rootId : cwd;
  const segments = path.split('/').filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      const node = getNode(vfs, current);
      current = node?.parentId ?? vfs.rootId;
      continue;
    }
    const match = childrenOf(vfs, current).find((n) => n.name === seg);
    if (!match) return null;
    current = match.id;
  }
  return current;
}

function listing(nodes: VfsNode[]): string[] {
  if (nodes.length === 0) return [];
  return nodes.map((n) => (n.kind === 'folder' ? `${n.name}/` : n.name));
}

export function runCommand(line: string, ctx: ShellContext): CommandResult {
  const trimmed = line.trim();
  if (trimmed === '') return { output: [] };
  const tokens = tokenize(trimmed);
  const cmd = tokens[0] ?? '';
  const args = tokens.slice(1);
  const { vfs, cwd, user } = ctx;

  switch (cmd) {
    case 'help':
      return {
        output: [
          'GhostOS Phantom Terminal — available incantations:',
          '  help            show this message',
          '  pwd             print working directory',
          '  ls [path]       list directory contents',
          '  cd [path]       change directory',
          '  cat <file>      print file contents',
          '  mkdir <name>    create a folder',
          '  touch <name>    create an empty file',
          '  rm <path>       remove a file or folder (recursive)',
          '  echo <text>     print text',
          '  whoami          print current user',
          '  clear           clear the screen',
        ],
      };

    case 'whoami':
      return { output: [user] };

    case 'pwd':
      return { output: [pathString(vfs, cwd)] };

    case 'clear':
      return { output: [], cleared: true };

    case 'echo':
      return { output: [args.join(' ')] };

    case 'ls': {
      const target = args[0] ? resolve(vfs, cwd, args[0]) : cwd;
      if (target === null) return { output: [`ls: no such path: ${args[0]}`] };
      const node = getNode(vfs, target);
      if (!node) return { output: [`ls: no such path: ${args[0]}`] };
      if (node.kind === 'file') return { output: [node.name] };
      return { output: listing(childrenOf(vfs, target)) };
    }

    case 'cd': {
      const dest = args[0] ?? '/';
      const target = resolve(vfs, cwd, dest);
      if (target === null) return { output: [`cd: no such directory: ${dest}`] };
      const node = getNode(vfs, target);
      if (!node || node.kind !== 'folder') {
        return { output: [`cd: not a directory: ${dest}`] };
      }
      return { output: [], cwd: target };
    }

    case 'cat': {
      if (!args[0]) return { output: ['cat: missing file operand'] };
      const target = resolve(vfs, cwd, args[0]);
      if (target === null) return { output: [`cat: no such file: ${args[0]}`] };
      const node = getNode(vfs, target);
      if (!node) return { output: [`cat: no such file: ${args[0]}`] };
      if (node.kind !== 'file') return { output: [`cat: ${args[0]} is a directory`] };
      // The interpreter cannot read binary content stores; the store layer
      // substitutes text for text files. Signal via a marker the store reads.
      return { output: [`\u0000cat:${node.id}`] };
    }

    case 'mkdir': {
      if (!args[0]) return { output: ['mkdir: missing operand'] };
      const r = createNode(vfs, cwd, args[0], { id: createId('dir'), kind: 'folder' });
      if (!r.ok) return { output: [`mkdir: ${r.error}`] };
      return { output: [], vfs: r.value };
    }

    case 'touch': {
      if (!args[0]) return { output: ['touch: missing operand'] };
      const r = createNode(vfs, cwd, args[0], { id: createId('file'), kind: 'file' });
      if (!r.ok) return { output: [`touch: ${r.error}`] };
      return { output: [], vfs: r.value };
    }

    case 'rm': {
      if (!args[0]) return { output: ['rm: missing operand'] };
      const target = resolve(vfs, cwd, args[0]);
      if (target === null) return { output: [`rm: no such path: ${args[0]}`] };
      const r = remove(vfs, target);
      if (!r.ok) return { output: [`rm: ${r.error}`] };
      return { output: [], vfs: r.value };
    }

    default:
      return { output: [`${cmd}: command not found. Type "help" for a list.`] };
  }
}

export function isKnownCommand(name: string): boolean {
  return (COMMANDS as readonly string[]).includes(name);
}

export { pathString };
