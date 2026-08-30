// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'Daylatch';
export const siteDescription =
  'The operating layer for your household. Daylatch knows what matters, who owns it, and what happens next — and never acts without your approval.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — kept in sync with the brand_tokens seed (--brand-h: 32).
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#8a4318',
  /** PWA splash + install background. */
  backgroundColor: '#fdfbf7',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#241a10',
    foreground: '#fdfbf7',
    /** Second line under the site name; '' hides it. */
    tagline: 'Life asks. Daylatch handles.',
  },
} as const;
