import { describe, it, expect } from 'vitest';
import { sanitizeImageReferences } from '../../lib/brd/sanitize';

describe('sanitizeImageReferences', () => {
  it('replaces PDF inline image objects (/Im123 Do)', () => {
    expect(sanitizeImageReferences('See /Im42 Do here')).toBe('See [image] here');
  });

  it('replaces standalone PDF image references (/Im456)', () => {
    expect(sanitizeImageReferences('Ref /Im456 end')).toBe('Ref [image] end');
  });

  it('replaces markdown image syntax', () => {
    expect(sanitizeImageReferences('![alt](path/to/img.png)')).toBe('[image]');
  });

  it('handles markdown images with various extensions', () => {
    const extensions = ['jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff', 'webp'];
    for (const ext of extensions) {
      expect(sanitizeImageReferences(`![pic](file.${ext})`)).toBe('[image]');
    }
  });

  it('replaces HTML <img> tags', () => {
    expect(sanitizeImageReferences('<img src="logo.png" />')).toBe('[image]');
  });

  it('replaces self-closing and non-self-closing img tags', () => {
    expect(sanitizeImageReferences('<img src="a.png">')).toBe('[image]');
  });

  it('replaces [image: description] markers', () => {
    expect(sanitizeImageReferences('[image: company logo]')).toBe('[image]');
  });

  it('replaces bare filenames with image extensions', () => {
    expect(sanitizeImageReferences('See diagram.png for details')).toBe('See [image] for details');
  });

  it('collapses multiple consecutive [image] tokens', () => {
    expect(sanitizeImageReferences('[image: a] [image: b]')).toBe('[image]');
  });

  it('returns text unchanged when no image references exist', () => {
    const text = 'This is a normal paragraph with no images.';
    expect(sanitizeImageReferences(text)).toBe(text);
  });

  it('handles mixed image types in one string', () => {
    const input = 'Start ![alt](pic.png) middle <img src="x.jpg"/> end /Im1 Do';
    const result = sanitizeImageReferences(input);
    expect(result).not.toContain('![');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('/Im1');
  });
});
