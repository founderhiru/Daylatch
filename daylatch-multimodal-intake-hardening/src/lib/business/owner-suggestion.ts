// @polsia:user-owned — server-only Prisma query feeding the pure rule in
// owner-suggestion-rules.ts (same split as pulse.ts/pulse-rules.ts).
import 'server-only';
import { suggestOwnerFromHistory } from '@/lib/business/owner-suggestion-rules';
import type { ResponsibilityCategory } from '@/lib/contracts/responsibility';
import { prisma } from '@/lib/db';

export { suggestOwnerFromHistory } from '@/lib/business/owner-suggestion-rules';

/**
 * Queries this household's past responsibilities in the given category and
 * applies {@link suggestOwnerFromHistory}. Returns null immediately (no
 * query needed) for a household with no history at all in practice — the
 * query itself is cheap and always run, since "no rows" and "no majority"
 * both correctly resolve to null anyway.
 */
export async function getSuggestedOwnerId(
  householdId: string,
  category: ResponsibilityCategory,
): Promise<string | null> {
  const rows: Array<{ ownerId: string | null }> = await prisma.responsibility.findMany({
    where: { householdId, category },
    select: { ownerId: true },
  });
  return suggestOwnerFromHistory(rows.map((row) => row.ownerId));
}
