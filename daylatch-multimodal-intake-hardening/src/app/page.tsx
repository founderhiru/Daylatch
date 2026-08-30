// @polsia:user-owned — the real Daylatch home. Replaces the deleted
// src/app/(setup)/page.tsx starter route per the
// `setup_route_replaced_by_app_surface` tier invariant: this root page.tsx
// now takes over `/`. The former (setup) content (the intake tool) lives on
// at src/app/(custom)/try/page.tsx, unchanged.
import type { Metadata } from 'next';
import {
  ActionFlow,
  Capture,
  Coordination,
  CoreIntelligence,
  FinalCta,
  Hero,
  Outcomes,
  Problem,
  ProductOverview,
  Trust,
} from '@/components/custom/marketing/sections';
import { siteDescription, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: `${siteName} — The operating layer for your household` },
  description: siteDescription,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Problem />
      <ProductOverview />
      <CoreIntelligence />
      <Coordination />
      <ActionFlow />
      <Trust />
      <Capture />
      <Outcomes />
      <FinalCta />
    </main>
  );
}
