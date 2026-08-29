// @polsia:user-owned — REST transport for the current household. There is
// exactly one household while no auth module is installed — see
// src/lib/business/household.ts.
import 'server-only';
import { NextResponse } from 'next/server';
import { DEMO_HOUSEHOLD_NAME, getDemoHousehold } from '@/lib/business/household';
import { HouseholdItem } from '@/lib/contracts/household';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const household = await getDemoHousehold();
    const payload = HouseholdItem.parse({
      id: household.id,
      name: household.name,
      isDemo: household.name === DEMO_HOUSEHOLD_NAME,
      members: household.members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        role: m.role,
      })),
    });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Could not load the household right now.' }, { status: 500 });
  }
}
