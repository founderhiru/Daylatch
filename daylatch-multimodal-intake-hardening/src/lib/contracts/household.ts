// @polsia:user-owned — shared zod contract for the Household resource.
// Keep this module client-importable: zod only, no server-only imports.
import { z } from 'zod';

export const HouseholdMemberItem = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(80),
  role: z.string().max(60).nullable(),
});

// A household plus its members — this is the one read shape the client
// needs (a member list without its household is not useful on its own, so
// there is no separate standalone HouseholdMember list contract).
export const HouseholdItem = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  /// True for the single seeded household used while no auth module is
  /// installed. See src/lib/business/household.ts.
  isDemo: z.boolean(),
  members: z.array(HouseholdMemberItem),
});

export type HouseholdMemberItem = z.infer<typeof HouseholdMemberItem>;
export type HouseholdItem = z.infer<typeof HouseholdItem>;
