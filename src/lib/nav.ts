// @polsia:user-owned — app navigation rendered by SiteNav/SiteFooter and read by
// the sitemap. Edit it as pages are added or removed.
// This list is a convenience, not module registration.

export type NavGroup = 'primary' | 'secondary' | 'footer';

export interface NavItem {
  /** Visible link text. */
  label: string;
  /** App route, e.g. '/' or '/dashboard'. */
  href: string;
  /** Where it renders: top-nav 'primary'/'secondary', or 'footer'. */
  group: NavGroup;
  /** Group `primary` items into a dropdown. */
  menu?: string;
  /** When true, render only if a session exists. */
  requiresAuth?: boolean;
  /** Sort key within a group. */
  order?: number;
}

export const navItems: NavItem[] = [
  { label: 'How it works', href: '/#how', group: 'primary', order: 1 },
  { label: 'Coordination', href: '/#coordination', group: 'primary', order: 2 },
  { label: 'Trust', href: '/#trust', group: 'primary', order: 3 },
  // Demo-mode dashboard: NOT gated by requiresAuth because no auth module is
  // installed yet (see src/app/(custom)/dashboard/page.tsx's demo-mode notice
  // and AGENTS.md Part 17 — do not fake authentication). Re-flag this
  // `requiresAuth: true` the moment a real auth module is installed.
  { label: 'Dashboard (demo)', href: '/dashboard', group: 'secondary', order: 1 },
  { label: 'Try Daylatch', href: '/try', group: 'secondary', order: 2 },
  {
    label: 'Contact Daylatch',
    href: 'mailto:hello@daylatch.app?subject=Hello%20Daylatch',
    group: 'footer',
    order: 0,
  },
];
