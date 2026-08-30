// @polsia:user-owned — REST transport for the anonymous Daylatch intake.
import 'server-only';

import { NextResponse } from 'next/server';
import { getDemoHousehold } from '@/lib/business/household';
import { extractIntake, extractIntakeFromImage } from '@/lib/business/intake';
import { getSuggestedOwnerId } from '@/lib/business/owner-suggestion';
import {
  INTAKE_IMAGE_MAX_LENGTH,
  INTAKE_SOURCE_MAX_LENGTH,
  IntakeCreate,
  IntakeResult,
  type IntakeResult as IntakeResultType,
} from '@/lib/contracts/intake';

export const dynamic = 'force-dynamic';

// Text and image bodies have very different size needs (a data: URL for a
// phone photo dwarfs any pasted message) — sized to comfortably cover
// INTAKE_IMAGE_MAX_LENGTH plus JSON framing overhead, not just the text cap.
const MAX_REQUEST_BYTES = INTAKE_IMAGE_MAX_LENGTH + 500_000;

/** Fills in the one field extraction never produces itself — see the
 * suggestedOwnerId comment in src/lib/contracts/intake.ts. Errors here are
 * swallowed to a null suggestion rather than failing the whole request: a
 * missing suggestion is a minor UX loss, not a reason to lose the AI's
 * actual extraction. */
async function withSuggestedOwner(result: IntakeResultType): Promise<IntakeResultType> {
  try {
    const household = await getDemoHousehold();
    const suggestedOwnerId = await getSuggestedOwnerId(household.id, result.category);
    return { ...result, suggestedOwnerId };
  } catch {
    return result;
  }
}

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
            sourceText: `Keep the pasted message under ${INTAKE_SOURCE_MAX_LENGTH.toLocaleString()} characters, or the photo/file under ~6MB.`,
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

  const { sourceText, imageDataUrl } = parsed.data;

    try {
    const result = imageDataUrl
      ? IntakeResult.parse(await extractIntakeFromImage(imageDataUrl, sourceText))
      : IntakeResult.parse(await extractIntake(sourceText));
    return NextResponse.json(await withSuggestedOwner(result), { status: 200 });
  } catch (error) {
    console.error('[api/intake] extraction failed:', error);
    return NextResponse.json(
      {
        error: imageDataUrl
          ? 'Daylatch could not read that image yet. Please try again.'
          : 'We could not extract that message right now. Please try again.',
      },
      { status: 500 },
    );
  }
}
