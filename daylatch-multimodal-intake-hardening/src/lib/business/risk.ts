// @polsia:user-owned — deterministic "at risk" rules for a Responsibility.
// Pure functions, no I/O, no LLM. Updated for the north-star correction:
// `stage` is workflow position only; "waiting" is a condition
// (waitingSince !== null), not a stage value, so the waiting_too_long rule
// now reads waitingSince directly instead of overloading `updatedAt`
// (which would have reset on any unrelated edit).
import type { ResponsibilityStage } from '@/lib/contracts/responsibility';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_APPROACHING_WINDOW_MS = 2 * DAY_MS;
const WAITING_TOO_LONG_MS = 5 * DAY_MS;

export type RiskReason =
  | 'overdue'
  | 'deadline_approaching'
  | 'waiting_too_long'
  | 'unowned_and_active';

export interface RiskInput {
  stage: ResponsibilityStage;
  dueAt: Date | null;
  ownerId: string | null;
  /** Non-null means the responsibility is currently waiting (a condition,
   * independent of stage) — see prisma/schema/household.prisma. */
  waitingSince: Date | null;
}

/** Returns every deterministic reason a responsibility is currently at risk. */
export function getRiskReasons(input: RiskInput, now: Date = new Date()): RiskReason[] {
  if (input.stage === 'completed') return [];

  const reasons: RiskReason[] = [];

  if (input.dueAt) {
    const msUntilDue = input.dueAt.getTime() - now.getTime();
    if (msUntilDue < 0) {
      reasons.push('overdue');
    } else if (msUntilDue <= DEADLINE_APPROACHING_WINDOW_MS) {
      reasons.push('deadline_approaching');
    }
  }

  if (input.waitingSince && now.getTime() - input.waitingSince.getTime() >= WAITING_TOO_LONG_MS) {
    reasons.push('waiting_too_long');
  }

  if (input.ownerId === null && (input.stage === 'active' || input.stage === 'assigned')) {
    reasons.push('unowned_and_active');
  }

  return reasons;
}

/** Convenience boolean wrapper around {@link getRiskReasons}. */
export function computeIsAtRisk(input: RiskInput, now: Date = new Date()): boolean {
  return getRiskReasons(input, now).length > 0;
}
