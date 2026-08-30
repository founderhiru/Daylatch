// @polsia:user-owned — mobile bottom-navigation shell for the Daylatch
// product surface (Phase 1.1). This is ADDITIVE alongside the existing
// desktop SiteNav (src/components/custom/site-nav.tsx) — that file is
// untouched. Rendered globally via global-mounts.tsx (the sanctioned seam
// for app-wide overlays) so the framework-owned src/app/layout.tsx never
// needs editing.
'use client';

import { Activity, Home, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Routes considered part of the "product surface" (the household command
 * center), as opposed to the marketing site (`/`) or the legacy desktop
 * intake tool (`/try`). The bottom nav only renders on these, on mobile
 * widths — the marketing homepage keeps its full-width, nav-free layout.
 */
function isProductSurfaceRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/household') ||
    pathname.startsWith('/activity') ||
    pathname.startsWith('/capture') ||
    pathname.startsWith('/responsibilities')
  );
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/household', label: 'Household', icon: Users },
] as const;

const NAV_ITEMS_RIGHT = [{ href: '/activity', label: 'Activity', icon: Activity }] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const visible = isProductSurfaceRoute(pathname);

  // Toggle a body class so page content can reserve space for the fixed bar
  // on mobile widths, without editing the framework-owned root layout (which
  // renders {children} directly, with no shared wrapper this file could hook
  // into). Scoped to a class rather than inline styles so the padding rule
  // itself lives in CSS (src/app/custom-style.css) alongside the other
  // Daylatch-specific styling, not scattered across components.
  useEffect(() => {
    document.body.classList.toggle('has-mobile-nav', visible);
    return () => {
      document.body.classList.remove('has-mobile-nav');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      aria-label="Primary (mobile)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="relative mx-auto flex h-16 max-w-md items-center justify-between px-6">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}

        {/* Central capture action — visually prominent, elevated above the
            bar, per the brief's "prominent central + action." */}
        <Link
          href="/capture"
          aria-label="Add something to Daylatch"
          className="absolute left-1/2 -top-5 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
        {/* Spacer so the two side items don't collide with the floating
            center button at narrow widths. */}
        <span className="w-10" aria-hidden="true" />

        {NAV_ITEMS_RIGHT.map((item) => (
          <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1 text-[11px] transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </Link>
  );
}
