// @polsia:user-owned — pure media-URL parsing and Anthropic content-block
// building, extracted from src/lib/ai/client.ts so it's directly unit-
// testable (no 'server-only', no live API calls). client.ts re-exports and
// uses these; this file is the single source of truth for the logic.
import type Anthropic from '@anthropic-ai/sdk';

const SUPPORTED_IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageMediaType = (typeof SUPPORTED_IMAGE_MEDIA_TYPES)[number];

function isSupportedImageMediaType(value: string): value is SupportedImageMediaType {
  return (SUPPORTED_IMAGE_MEDIA_TYPES as readonly string[]).includes(value);
}

/**
 * Detects a `data:<mediaType>;base64,<data>` URL and extracts its parts.
 * Returns null for anything else (a real https:// URL, or a malformed
 * data URL), so callers can fall back to URL-based handling.
 */
export function parseDataUrl(value: string): { mediaType: string; base64: string } | null {
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i.exec(value);
  if (!match) return null;
  const mediaType = match[1];
  const base64 = match[2];
  if (!mediaType || !base64) return null;
  return { mediaType, base64 };
}

/**
 * Builds the correct Anthropic content block for an image/document URL —
 * this is the ONE place that decides url-source vs. base64-source vs.
 * image vs. document, so every caller (analyzeImage today, any future
 * multimodal caller) gets this right automatically instead of each one
 * needing to know Anthropic's block shapes itself.
 *
 * THE BUG THIS FIXES: browser/mobile capture (src/app/(custom)/capture/
 * page.tsx) produces `data:image/jpeg;base64,...` URLs, not real HTTP(S)
 * URLs. The previous version always built a `{ source: { type: 'url' } }`
 * block, so Anthropic tried to fetch a data: URL as if it were a web
 * address and failed with "Unable to download the file." data: URLs are
 * now parsed and sent as `{ source: { type: 'base64' } }` instead — the
 * payload never leaves this process as a fake "download", which is also
 * better for privacy (no temporary public URL is created just to hand
 * Anthropic something fetchable).
 *
 * PDF support: a `data:application/pdf;base64,...` URL is sent as a
 * `document` block (Anthropic's supported mechanism for PDFs), not
 * misrepresented as an image. An unsupported image media type throws a
 * clear, catchable error rather than silently sending a request Anthropic
 * will reject.
 */
export function toAnthropicMediaBlock(url: string): Anthropic.ContentBlockParam {
  const dataUrl = parseDataUrl(url);
  if (dataUrl) {
    if (dataUrl.mediaType === 'application/pdf') {
      return {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: dataUrl.base64 },
      };
    }
    if (!isSupportedImageMediaType(dataUrl.mediaType)) {
      throw new Error(
        `Unsupported image type "${dataUrl.mediaType}" — Daylatch supports JPEG, PNG, GIF, WebP, and PDF.`,
      );
    }
    return {
      type: 'image',
      source: { type: 'base64', media_type: dataUrl.mediaType, data: dataUrl.base64 },
    };
  }
  // A real HTTPS URL (or anything else not recognized as a data: URL) —
  // only ever reached for genuine remote image URLs today; Anthropic can
  // fetch these directly.
  return { type: 'image', source: { type: 'url', url } };
}

/** Strips a leading/trailing ```json or ``` markdown fence from a raw model
 * response, if present. Claude sometimes wraps JSON in fences even when
 * explicitly told not to — this is the ONE place that normalizes for that,
 * so every caller gets the same resilience instead of each needing its own
 * copy of this logic. */
export function stripMarkdownFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}
