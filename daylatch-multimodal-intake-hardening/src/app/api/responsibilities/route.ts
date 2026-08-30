// @polsia:user-owned — REST transport for the Responsibility resource,
// scoped to the current (demo, until auth ships) household. See
// src/lib/business/household.ts and src/lib/business/responsibility.ts.
import 'server-only';
import { NextResponse } from 'next/server';
import { getDemoHousehold } from '@/lib/business/household';
import { createResponsibility, listResponsibilities } from '@/lib/business/responsibility';
import { ResponsibilityCreate, ResponsibilityList } from '@/lib/contracts/responsibility';

export const dynamic = 'force-dynamic';

function fieldErrorsFrom(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

export async function GET() {
  try {
    const household = await getDemoHousehold();
    const items = await listResponsibilities(household.id);
    return NextResponse.json(ResponsibilityList.parse({ items }));
  } catch {
    return NextResponse.json(
      { error: 'Could not load responsibilities right now.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ResponsibilityCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrorsFrom(parsed.error) }, { status: 400 });
  }

  try {
    const household = await getDemoHousehold();
    const created = await createResponsibility(household.id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Could not create that responsibility right now.' },
      { status: 500 },
    );
  }
}
