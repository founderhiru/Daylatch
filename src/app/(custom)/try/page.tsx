// @polsia:user-owned — Daylatch's real paste-to-next-step tool. Relocated
// from src/app/(setup)/page.tsx (which now serves the marketing homepage) per
// the Phase 2 migration plan. Behavior is unchanged — only the route moved.
import type { Metadata } from 'next';
import { IntakeWorkspace } from '@/components/custom/intake-workspace';
import { siteDescription, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Try Daylatch',
  description: siteDescription,
  alternates: { canonical: '/try' },
  openGraph: { title: `Try ${siteName}`, description: siteDescription },
};

export default function TryPage() {
  return <IntakeWorkspace />;
}
