// @polsia:user-owned — server-only Household Pulse: fetches the rows and
// delegates to the pure, DB-free rules in src/lib/business/pulse-rules.ts
// (counts + highlights — no LLM, no database in that module, directly unit-
// tested there without mocking).
import 'server-only';
import { buildHighlights, computeCounts, type PulseRow } from '@/lib/business/pulse-rules';
import type { PulseSummary } from '@/lib/contracts/pulse';
import { prisma } from '@/lib/db';

export async function computePulse(householdId: string): Promise<PulseSummary> {
  const rows: PulseRow[] = await prisma.responsibility.findMany({
    where: { householdId },
    select: { title: true, stage: true, dueAt: true, ownerId: true, waitingSince: true },
  });

  const now = new Date();
  const counts = computeCounts(rows, now);

  return {
    householdId,
    ...counts,
    highlights: buildHighlights(rows, now),
    computedAt: now.toISOString(),
  };
}
