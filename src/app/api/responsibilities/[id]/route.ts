// @polsia:user-owned — REST transport for updating a single Responsibility
// (status transitions, owner assignment, etc.), scoped to the current
// (demo, until auth ships) household.
import 'server-only';
import { NextResponse } from 'next/server';
import { getDemoHousehold } from '@/lib/business/household';
import { updateResponsibility } from '@/lib/business/responsibility';
import { ResponsibilityUpdate } from '@/lib/contracts/responsibility';

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ResponsibilityUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrorsFrom(parsed.error) }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ errors: { result: 'Nothing to update.' } }, { status: 400 });
  }

  try {
    const household = await getDemoHousehold();
    const updated = await updateResponsibility(household.id, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Responsibility not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Could not update that responsibility right now.' },
      { status: 500 },
    );
  }
}
