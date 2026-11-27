import { describe, it, expect } from 'vitest';
import {
  associate,
  classifyFile,
  extensionOf,
  isTextLike,
} from './fileType';

describe('extensionOf', () => {
  it('extracts the lowercase extension', () => {
    expect(extensionOf('notes.TXT')).toBe('txt');
    expect(extensionOf('song.mp3')).toBe('mp3');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
  });
  it('returns empty for no/dotfile/trailing-dot', () => {
    expect(extensionOf('README')).toBe('');
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('weird.')).toBe('');
  });
});

describe('classifyFile', () => {
  it('classifies text and markdown', () => {
    expect(classifyFile('a.txt')).toBe('text');
    expect(classifyFile('a.json')).toBe('text');
    expect(classifyFile('a.md')).toBe('markdown');
    expect(classifyFile('a.markdown')).toBe('markdown');
  });
  it('classifies audio and image', () => {
    expect(classifyFile('track.mp3')).toBe('audio');
    expect(classifyFile('pic.png')).toBe('image');
    expect(classifyFile('vector.svg')).toBe('image');
  });
  it('falls back to MIME when extension is unknown', () => {
    expect(classifyFile('blob.dat', 'audio/mpeg')).toBe('audio');
    expect(classifyFile('blob.dat', 'image/png')).toBe('image');
    expect(classifyFile('blob.dat', 'text/markdown')).toBe('markdown');
    expect(classifyFile('blob.dat', 'text/plain')).toBe('text');
  });
  it('treats extensionless/generic files as editable text', () => {
    expect(classifyFile('README')).toBe('text');
    expect(classifyFile('data', 'application/octet-stream')).toBe('text');
  });
  it('marks genuinely unknown binary as unsupported', () => {
    expect(classifyFile('thing.xyz', 'application/zip')).toBe('unsupported');
  });
});

describe('associate', () => {
  it('routes text/markdown to GraveNotes', () => {
    expect(associate('n.txt').appId).toBe('notes');
    expect(associate('n.md').appId).toBe('notes');
  });
  it('routes audio to DeadWave and images to the viewer', () => {
    expect(associate('s.mp3').appId).toBe('music');
    expect(associate('p.png').appId).toBe('imageviewer');
  });
  it('gives unsupported files a null handler', () => {
    expect(associate('x.zip', 'application/zip').appId).toBeNull();
  });
});

describe('isTextLike', () => {
  it('is true for text and markdown only', () => {
    expect(isTextLike('a.txt')).toBe(true);
    expect(isTextLike('a.md')).toBe(true);
    expect(isTextLike('a.mp3')).toBe(false);
    expect(isTextLike('a.png')).toBe(false);
  });
});
