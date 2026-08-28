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
  {
    label: 'Contact Daylatch',
    href: 'mailto:daylatch-6@polsia.app?subject=Hello%20Daylatch',
    group: 'footer',
    order: 0,
  },
];
