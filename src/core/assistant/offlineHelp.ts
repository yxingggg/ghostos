// Offline Spirit — a rule-based, fully local help assistant for GhostOS.
// This is NOT a generative AI model: it matches a user's question against a
// curated local knowledge base (keywords + synonyms) and returns a canned,
// accurate answer drawn from the app's own documentation. It makes no network
// requests and has no external dependencies, so it works entirely offline.

export interface HelpTopic {
  id: string;
  /** Short title shown as a suggested question. */
  question: string;
  /** The answer text (plain, may contain newlines). */
  answer: string;
  /** Keywords/synonyms that route a query to this topic. */
  keywords: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'overview',
    question: 'What is GhostOS?',
    answer:
      'GhostOS is a browser-based retro-gothic desktop environment. It runs entirely in ' +
      'your browser and offline: a window manager with a desktop, start menu and taskbar, ' +
      'plus built-in apps (GraveNotes, Tomb Explorer, Phantom Terminal, Calculator, ' +
      'DeadWave, Spectral Viewer, Settings, and this Spirit Assistant). Your data is stored ' +
      'locally in your browser via IndexedDB — there is no backend or account.',
    keywords: ['what', 'ghostos', 'about', 'overview', 'help', 'start', 'begin', 'intro'],
  },
  {
    id: 'apps',
    question: 'What apps are included?',
    answer:
      'Built-in apps:\n' +
      '• GraveNotes — a notes editor; it also edits text/Markdown files from the filesystem.\n' +
      '• Tomb Explorer — a file manager for the virtual filesystem.\n' +
      '• Phantom Terminal — a simulated shell over the filesystem.\n' +
      '• Calculator — arithmetic with keyboard and buttons.\n' +
      '• DeadWave — a local audio player with a visualizer.\n' +
      '• Spectral Viewer — previews image files.\n' +
      '• Settings — theme, accessibility, sound, backup, and assistant configuration.',
    keywords: ['apps', 'applications', 'programs', 'included', 'list', 'which', 'tools'],
  },
  {
    id: 'open-files',
    question: 'How do I open a file?',
    answer:
      'In Tomb Explorer, double-click a file (or select it and press Enter) to open it in ' +
      'the matching app: text and Markdown open in GraveNotes, audio in DeadWave, and images ' +
      'in Spectral Viewer. Double-click a folder to navigate into it. Right-click any item ' +
      'for a menu with Open, Open with, Rename, Delete, Duplicate, Download, and Properties.',
    keywords: ['open', 'file', 'files', 'double', 'click', 'explorer', 'edit', 'cannot'],
  },
  {
    id: 'notes',
    question: 'How do I use GraveNotes?',
    answer:
      'GraveNotes has two modes. On its own it keeps standalone notes — click "+ New Note" ' +
      'to create one; edits autosave. When you open a text or Markdown file from Tomb ' +
      'Explorer, GraveNotes edits that file directly: changes save back to the same file ' +
      '(autosave, the Save button, or Ctrl/Cmd+S).',
    keywords: ['notes', 'gravenotes', 'write', 'editor', 'save', 'text', 'markdown'],
  },
  {
    id: 'terminal',
    question: 'What terminal commands are available?',
    answer:
      'Phantom Terminal operates on the virtual filesystem and supports: help, ls, cd, cat, ' +
      'mkdir, touch, rm, echo, clear, pwd, and whoami. Use the Up/Down arrows to browse ' +
      'command history. It never runs real system code.',
    keywords: ['terminal', 'command', 'commands', 'shell', 'ls', 'cd', 'mkdir', 'console', 'phantom'],
  },
  {
    id: 'vfs',
    question: 'How does the virtual filesystem work?',
    answer:
      'GhostOS has an in-browser filesystem stored in IndexedDB. Create folders and files ' +
      'in Tomb Explorer or the terminal; rename, move, duplicate, download, and delete them. ' +
      'It is a single tree with a root; everything persists locally between sessions.',
    keywords: ['filesystem', 'vfs', 'files', 'folder', 'directory', 'storage', 'crypt'],
  },
  {
    id: 'shortcuts',
    question: 'What keyboard shortcuts exist?',
    answer:
      'Keyboard support:\n' +
      '• Desktop icons: arrow keys move focus, Enter/Space launches.\n' +
      '• Tomb Explorer: Enter opens, F2 renames, Delete removes the selected item.\n' +
      '• GraveNotes file editor: Ctrl/Cmd+S saves.\n' +
      '• Calculator: digits, + - * /, Enter (=), Escape (clear), Backspace.\n' +
      '• Start menu: arrow keys navigate, Escape closes. All controls are keyboard-reachable.',
    keywords: ['shortcut', 'shortcuts', 'keyboard', 'keys', 'hotkey', 'accessibility', 'enter', 'escape'],
  },
  {
    id: 'settings',
    question: 'What can I change in Settings?',
    answer:
      'Settings lets you toggle the CRT effect, reduce motion, and enable sound effects ' +
      '(all off/soft by default where appropriate). You can export your whole workspace to ' +
      'a JSON backup and import it again. The AI assistant is configured here too.',
    keywords: ['settings', 'crt', 'motion', 'sound', 'theme', 'options', 'preferences', 'accessibility'],
  },
  {
    id: 'backup',
    question: 'How do I back up or restore my workspace?',
    answer:
      'In Settings → Workspace data, click "Export backup" to download a JSON file with your ' +
      'notes, files, music metadata, and settings. "Import backup" restores from such a file. ' +
      'Exports never include your AI API key. Your workspace also persists automatically in ' +
      'this browser between visits.',
    keywords: ['backup', 'restore', 'export', 'import', 'save', 'workspace', 'data', 'persist'],
  },
  {
    id: 'offline',
    question: 'Does GhostOS work offline?',
    answer:
      'Yes. The core app is a PWA with a service worker, so after the first load it runs with ' +
      'no network. All data stays in your browser. The only feature that can use the network ' +
      'is the optional online AI mode, and only if you explicitly enable it and add your own ' +
      'API key.',
    keywords: ['offline', 'network', 'internet', 'pwa', 'service', 'worker', 'connection'],
  },
  {
    id: 'assistant',
    question: 'How do I enable the online AI assistant?',
    answer:
      'This Spirit Assistant works offline by default (that is this help mode). To use a real ' +
      'AI model, open Settings → AI Assistant, enable it, pick a provider (OpenAI, Google ' +
      'Gemini, or a custom OpenAI-compatible endpoint), and enter the endpoint, model, and ' +
      'your API key. Use "Test Connection" to verify. Online requests leave your device and ' +
      'go to that provider; nothing is sent unless you opt in.',
    keywords: ['assistant', 'ai', 'spirit', 'online', 'openai', 'gemini', 'api', 'model', 'enable'],
  },
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'how', 'what', 'can', 'i', 'to', 'in', 'of',
  'and', 'or', 'my', 'me', 'you', 'it', 'for', 'with', 'on', 'use', 'using', 'this',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export interface HelpAnswer {
  matched: boolean;
  topicId: string | null;
  answer: string;
}

/**
 * Answer a question by scoring it against each topic's keywords. Returns a
 * graceful fallback (with suggestions) when nothing matches well enough.
 */
export function answerQuestion(query: string): HelpAnswer {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { matched: false, topicId: null, answer: fallbackAnswer() };
  }
  let best: { topic: HelpTopic; score: number } | null = null;
  for (const topic of HELP_TOPICS) {
    const kw = new Set(topic.keywords);
    let score = 0;
    for (const t of tokens) {
      if (kw.has(t)) score += 2;
      else if (topic.question.toLowerCase().includes(t)) score += 1;
    }
    if (!best || score > best.score) best = { topic, score };
  }
  if (best && best.score >= 2) {
    return { matched: true, topicId: best.topic.id, answer: best.topic.answer };
  }
  return { matched: false, topicId: null, answer: fallbackAnswer() };
}

export function fallbackAnswer(): string {
  return (
    "I'm the offline help spirit — I answer questions about GhostOS from local " +
    'documentation (I am not a generative AI). I could not match your question. Try one of ' +
    'the suggested questions below, or ask about: apps, opening files, GraveNotes, the ' +
    'terminal, the filesystem, keyboard shortcuts, settings, backups, or offline use. For a ' +
    'real AI model, enable the online mode in Settings.'
  );
}

/** Suggested questions to surface as clickable prompts. */
export function suggestedQuestions(limit = 6): HelpTopic[] {
  return HELP_TOPICS.slice(0, limit);
}

/** Look up a topic by id (for click-to-ask suggestions). */
export function topicById(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}
