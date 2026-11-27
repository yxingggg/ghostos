import { describe, it, expect } from 'vitest';
import { SAMPLE_IMAGE_NAME, SAMPLE_IMAGE_SVG, sampleImageBytes } from './sampleImage';

describe('sample image', () => {
  it('is a valid, self-contained SVG', () => {
    expect(SAMPLE_IMAGE_NAME).toMatch(/\.svg$/);
    expect(SAMPLE_IMAGE_SVG.trimStart()).toMatch(/^<svg[\s>]/);
    expect(SAMPLE_IMAGE_SVG).toContain('</svg>');
    expect(SAMPLE_IMAGE_SVG).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('encodes to bytes that decode back to the same SVG', () => {
    const buf = sampleImageBytes();
    expect(buf.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder().decode(new Uint8Array(buf))).toBe(SAMPLE_IMAGE_SVG);
  });
});
