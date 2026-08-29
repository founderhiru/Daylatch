// @polsia:user-owned — pure, deterministic Household Pulse rules: no
// database, no LLM, no 'server-only' import. Deliberately separated from
// src/lib/business/pulse.ts (which does the Prisma query) so these rules —
// the actual business logic worth testing — are directly unit-testable
// without a database connection or any mocking.
import { computeIsAtRisk, getRiskReasons } from '@/lib/business/risk';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HIGHLIGHTS = 5;

export interface PulseRow {
  title: string;
  stage: 'received' | 'understood' | 'assigned' | 'active' | 'completed';
  dueAt: Date | null;
  ownerId: string | null;
  waitingSince: Date | null;
}

export interface PulseCounts {
  attentionCount: number;
  waitingCount: number;
  upcomingCount: number;
  atRiskCount: number;
  completedCount: number;
}

/** Deterministic, database-derived counts. One pass over the rows. */
export function computeCounts(rows: PulseRow[], now: Date = new Date()): PulseCounts {
  let attentionCount = 0;
  let waitingCount = 0;
  let upcomingCount = 0;
  let atRiskCount = 0;
  let completedCount = 0;

  for (const row of rows) {
    if (row.stage === 'completed') {
      completedCount += 1;
      continue;
    }

    const isWaiting = row.waitingSince !== null;
    const atRisk = computeIsAtRisk(row, now);
    if (atRisk) atRiskCount += 1;

    if (isWaiting) {
      waitingCount += 1;
    } else if (
      row.stage === 'received' ||
      row.stage === 'understood' ||
      row.stage === 'assigned' ||
      atRisk
    ) {
      // Needs a human decision or action right now.
      attentionCount += 1;
    } else if (row.stage === 'active') {
      // On track, scheduled ahead — not yet demanding attention.
      upcomingCount += 1;
    }
  }

  return { attentionCount, waitingCount, upcomingCount, atRiskCount, completedCount };
}

/** Deterministic, specific highlight sentences — one per real condition
 * found, capped so the UI never gets flooded. Every sentence names the
 * actual responsibility title; nothing here is templated marketing copy. */
export function buildHighlights(rows: PulseRow[], now: Date = new Date()): string[] {
  const highlights: string[] = [];

  for (const row of rows) {
    if (highlights.length >= MAX_HIGHLIGHTS) break;
    if (row.stage === 'completed') continue;

    const reasons = getRiskReasons(row, now);

    if (row.ownerId === null && (row.stage === 'active' || row.stage === 'assigned')) {
      highlights.push(`"${row.title}" has no owner.`);
      continue;
    }
    if (reasons.includes('overdue')) {
      highlights.push(`"${row.title}" is overdue.`);
      continue;
    }
    if (row.waitingSince && reasons.includes('waiting_too_long')) {
      const days = Math.floor((now.getTime() - row.waitingSince.getTime()) / DAY_MS);
      highlights.push(`"${row.title}" has been waiting ${days} day${days === 1 ? '' : 's'}.`);
    }
  }

  return highlights;
}
