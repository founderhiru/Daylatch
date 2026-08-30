// @polsia:user-owned — REST transport for the Household Pulse, scoped to
// the current (demo, until auth ships) household.
import 'server-only';
import { NextResponse } from 'next/server';
import { getDemoHousehold } from '@/lib/business/household';
import { computePulse } from '@/lib/business/pulse';
import { PulseSummary } from '@/lib/contracts/pulse';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const household = await getDemoHousehold();
    const summary = await computePulse(household.id);
    return NextResponse.json(PulseSummary.parse(summary));
  } catch {
    return NextResponse.json(
      { error: 'Could not compute the household pulse right now.' },
      { status: 500 },
    );
  }
}
