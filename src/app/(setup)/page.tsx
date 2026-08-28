// @polsia:user-owned — starter home replaced with the Daylatch intake surface.

import type { Metadata } from 'next';
import { IntakeWorkspace } from '@/components/custom/intake-workspace';
import { siteDescription, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: siteName },
  description: siteDescription,
  alternates: { canonical: '/' },
};

export default function DaylatchHomePage() {
  return <IntakeWorkspace />;
}
