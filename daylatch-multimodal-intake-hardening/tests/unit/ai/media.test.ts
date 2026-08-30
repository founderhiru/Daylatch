// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseDataUrl, stripMarkdownFences, toAnthropicMediaBlock } from '@/lib/ai/media';

describe('parseDataUrl', () => {
  it('parses a base64 image data URL into media type and payload', () => {
    expect(parseDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toEqual({
      mediaType: 'image/jpeg',
      base64: '/9j/4AAQSkZJRg==',
    });
  });

  it('parses a base64 PDF data URL', () => {
    expect(parseDataUrl('data:application/pdf;base64,JVBERi0xLjQK')).toEqual({
      mediaType: 'application/pdf',
      base64: 'JVBERi0xLjQK',
    });
  });

  it('returns null for a real https URL (not a data: URL)', () => {
    expect(parseDataUrl('https://example.com/photo.jpg')).toBeNull();
  });

  it('returns null for a malformed data URL with no base64 payload', () => {
    expect(parseDataUrl('data:image/jpeg;base64,')).toBeNull();
  });
});

describe('toAnthropicMediaBlock', () => {
  // Regression test for the actual production bug: a data: URL was being
  // sent as a { source: { type: 'url' } } block, which Anthropic tries to
  // fetch like a web address and fails with "Unable to download the file."
  it('builds a base64 image block for a data:image/... URL, never a url-source block', () => {
    const block = toAnthropicMediaBlock('data:image/png;base64,iVBORw0KGgo=');
    expect(block).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' },
    });
  });

  it('builds a document block for a data:application/pdf URL, not an image block', () => {
    const block = toAnthropicMediaBlock('data:application/pdf;base64,JVBERi0xLjQK');
    expect(block).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0xLjQK' },
    });
  });

  it('builds a url-source image block for a genuine https URL', () => {
    const block = toAnthropicMediaBlock('https://example.com/photo.jpg');
    expect(block).toEqual({
      type: 'image',
      source: { type: 'url', url: 'https://example.com/photo.jpg' },
    });
  });

  it('throws a clear error for an unsupported image media type rather than sending a doomed request', () => {
    expect(() => toAnthropicMediaBlock('data:image/tiff;base64,AAAA')).toThrow(
      /Unsupported image type/,
    );
  });

  it('accepts every Anthropic-supported image media type', () => {
    for (const mediaType of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
      expect(() => toAnthropicMediaBlock(`data:${mediaType};base64,AAAA`)).not.toThrow();
    }
  });
});

describe('stripMarkdownFences', () => {
  // Regression test for the actual production bug: Claude sometimes wraps
  // JSON in ```json fences despite being told not to, and JSON.parse throws
  // on the fence characters if they aren't stripped first.
  it('strips a ```json ... ``` fence', () => {
    expect(stripMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips a plain ``` ... ``` fence with no language tag', () => {
    expect(stripMarkdownFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('leaves already-clean JSON untouched', () => {
    expect(stripMarkdownFences('{"a":1}')).toBe('{"a":1}');
  });

  it('trims surrounding whitespace even with no fence present', () => {
    expect(stripMarkdownFences('  \n{"a":1}\n  ')).toBe('{"a":1}');
  });
});
