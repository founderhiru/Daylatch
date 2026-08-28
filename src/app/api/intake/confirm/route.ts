// @polsia:user-owned — REST transport for turning a user-CONFIRMED intake
// draft into a real Responsibility. This is a NEW route, separate from
// /api/intake (which stays exactly as it was — see
// src/lib/contracts/intake-to-responsibility.ts for why this is a new
// contract rather than a change to the existing one).
//
// AI PROPOSES (POST /api/intake) -> HUMAN REVIEWS (client-side editing in
// IntakeWorkspace) -> HUMAN CONFIRMS (this endpoint is only called on an
// explicit user action) -> DAYLATCH SAVES.
import 'server-only';
import { NextResponse } from 'next/server';
import { getDemoHousehold } from '@/lib/business/household';
import { createResponsibilityFromIntake } from '@/lib/business/responsibility';
import { IntakeConfirm } from '@/lib/contracts/intake-to-responsibility';
import { ResponsibilityItem } from '@/lib/contracts/responsibility';

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = IntakeConfirm.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrorsFrom(parsed.error) }, { status: 400 });
  }

  try {
    const household = await getDemoHousehold();
    const created = await createResponsibilityFromIntake(household.id, parsed.data);
    return NextResponse.json(ResponsibilityItem.parse(created), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Could not save that as a household responsibility right now.' },
      { status: 500 },
    );
  }
}
