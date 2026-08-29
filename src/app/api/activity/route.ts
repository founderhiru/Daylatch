// @polsia:user-owned — REST transport for the household activity timeline,
// scoped to the current (demo, until auth ships) household. Read-only:
// activity rows are written as a side effect of other mutations (see
// src/lib/business/activity.ts), never posted directly here.
import 'server-only';
import { NextResponse } from 'next/server';
import { listRecentActivity } from '@/lib/business/activity';
import { getDemoHousehold } from '@/lib/business/household';
import { ActivityList } from '@/lib/contracts/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const household = await getDemoHousehold();
    const items = await listRecentActivity(household.id);
    return NextResponse.json(ActivityList.parse({ items }));
  } catch {
    return NextResponse.json({ error: 'Could not load activity right now.' }, { status: 500 });
  }
}
