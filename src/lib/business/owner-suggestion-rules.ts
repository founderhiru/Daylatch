// @polsia:user-owned — deterministic "suggested owner" rule, pure and
// DB-free (mirrors pulse-rules.ts vs pulse.ts) so it's directly unit-
// testable. src/lib/business/owner-suggestion.ts wraps this with the
// Prisma query and the 'server-only' guard.
//
// IMPORTANT: this suggests, it never assigns. Every caller must treat the
// result as a pre-filled default the human can change, never as a written
// ownerId — see src/app/api/intake/route.ts and the /capture confirm UI.
//
// Grouped by `category` (the intake/medium classification: bill, form,
// appointment, etc.), not `domain` — domain is chosen by the human only at
// confirmation time and is not yet known when a suggestion is needed (see
// the domain comment in prisma/schema/household.prisma). Category is
// available immediately from the AI extraction, and is a reasonable proxy:
// households tend to have a consistent "who handles bills" / "who handles
// forms" pattern even before a specific life-area is assigned.

// A suggestion is only offered once there's enough history to mean
// something, and only when one owner is unambiguously the most frequent —
// a 1-1 tie or a single past instance isn't a pattern yet.
const MIN_HISTORY_COUNT = 2;

/**
 * Pure rule: given the ownerIds of past responsibilities in the same
 * category (nulls included, for unassigned ones), return the one owner who
 * has handled a clear majority — or null if there's no history, not enough
 * of it, or no unambiguous leader.
 */
export function suggestOwnerFromHistory(pastOwnerIds: Array<string | null>): string | null {
  const counts = new Map<string, number>();
  for (const ownerId of pastOwnerIds) {
    if (ownerId === null) continue;
    counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return null;
  const [topOwnerId, topCount] = top;
  if (topCount < MIN_HISTORY_COUNT) return null;
  // A tie for first place is not a clear pattern — stay silent rather than
  // guess between two equally-likely owners.
  const runnerUp = sorted[1];
  if (runnerUp && runnerUp[1] === topCount) return null;

  return topOwnerId;
}
