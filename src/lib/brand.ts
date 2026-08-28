// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'Daylatch';
export const siteDescription = 'A trusted AI inbox for the life admin you keep putting off.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#b45f1b',
  /** PWA splash + install background. */
  backgroundColor: '#fcfaf5',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#1f1710',
    foreground: '#fff8ed',
    /** Second line under the site name; '' hides it. */
    tagline: 'A trusted AI inbox for the life admin you keep putting off.',
  },
} as const;
