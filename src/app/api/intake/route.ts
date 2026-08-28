// @polsia:user-owned — REST transport for the anonymous Daylatch intake.
import 'server-only';

import { NextResponse } from 'next/server';
import { extractIntake } from '@/lib/business/intake';
import { INTAKE_SOURCE_MAX_LENGTH, IntakeCreate, IntakeResult } from '@/lib/contracts/intake';

export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 50_000;

function validationResponse(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) {
      errors[field] = message;
    }
  }
  return NextResponse.json({ errors }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          errors: {
            sourceText: `Keep the pasted message under ${INTAKE_SOURCE_MAX_LENGTH.toLocaleString()} characters.`,
          },
        },
        { status: 400 },
      );
    }
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { errors: { sourceText: 'Send a valid JSON request.' } },
      { status: 400 },
    );
  }

  const parsed = IntakeCreate.safeParse(body);
  if (!parsed.success) {
    return validationResponse(parsed.error);
  }

  try {
    const result = IntakeResult.parse(await extractIntake(parsed.data.sourceText));
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'We could not extract that message right now. Please try again.' },
      { status: 500 },
    );
  }
}
