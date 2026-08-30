// @polsia:user-owned — server-only household resolution.
//
// No auth module is installed yet (see AGENTS.md Part 17 in the phase-2
// brief: don't hand-roll auth, don't fake it). Until one ships, every
// request in this app is anonymous, so there is exactly ONE household —
// seeded idempotently by src/lib/seed.ts — and every API route in this
// phase reads/writes that single household. This is explicit "demo mode",
// not multi-tenant production behavior; every route that uses this helper
// says so in its own comments and the /dashboard UI carries a visible notice.
//
// When a real auth module installs, replace `getDemoHousehold` with a lookup
// keyed by the authenticated session's household membership — the shape of
// everything downstream (contracts, business logic, UI) stays the same.
import 'server-only';
import { prisma } from '@/lib/db';

export const DEMO_HOUSEHOLD_NAME = 'The Talukdar Household';

/** Minimal shape returned by {@link getDemoHousehold}, spelled out explicitly
 * rather than inferred from `@prisma/client` so callers stay fully typed even
 * before `prisma generate` has produced the real model types (see the
 * migration notes on the sandboxed build environment). Once generated, the
 * real Prisma return type is structurally compatible with this. */
export interface HouseholdWithMembers {
  id: string;
  name: string;
  members: Array<{ id: string; displayName: string; role: string | null }>;
}

/**
 * Returns the single demo household, creating it (with no members) if it
 * somehow doesn't exist yet. Real member/responsibility seeding lives in
 * src/lib/seed.ts, which runs once at server boot — this is just a safety
 * net for a boot that skipped seeding (e.g. a fresh test database).
 */
export async function getDemoHousehold(): Promise<HouseholdWithMembers> {
  const existing = await prisma.household.findFirst({
    where: { name: DEMO_HOUSEHOLD_NAME },
    include: { members: true },
  });
  if (existing) return existing;

  return prisma.household.create({
    data: { name: DEMO_HOUSEHOLD_NAME },
    include: { members: true },
  });
}
