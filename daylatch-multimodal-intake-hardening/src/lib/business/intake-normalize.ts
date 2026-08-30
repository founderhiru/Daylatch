// @polsia:user-owned — pure normalization of raw AI JSON into the shape
// IntakeResult validates. Deliberately separated from
// src/lib/business/intake.ts (which calls the AI) so this logic — plain JS,
// no I/O, no LLM — is directly unit-testable, same pattern as
// pulse-rules.ts/pulse.ts and owner-suggestion-rules.ts/owner-suggestion.ts.

const VALID_KINDS = new Set([
  'information',
  'event',
  'responsibility',
  'payment',
  'waiting_item',
  'renewal',
  'reference',
]);
const VALID_CONFIDENCE = new Set(['low', 'medium', 'high']);

/** Turns a common LLM JSON quirk — an empty string standing in for "unknown"
 * — into null. */
function emptyStringToNull(value: unknown): unknown {
  return typeof value === 'string' && value.trim().length === 0 ? null : value;
}

function toNullableInt(value: unknown, min: number, max: number): number | null {
  const normalized = emptyStringToNull(value);
  if (normalized === null || normalized === undefined) return null;
  const n = typeof normalized === 'number' ? normalized : Number(normalized);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded >= min && rounded <= max ? rounded : null;
}

function toNullableNonNegativeNumber(value: unknown): number | null {
  const normalized = emptyStringToNull(value);
  if (normalized === null || normalized === undefined) return null;
  const n = typeof normalized === 'number' ? normalized : Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toNullableEnum(value: unknown, valid: Set<string>): string | null {
  const normalized = emptyStringToNull(value);
  return typeof normalized === 'string' && valid.has(normalized) ? normalized : null;
}

/**
 * Normalizes raw, untrusted AI JSON into exactly the shape IntakeResult
 * expects, before it's ever handed to `.parse()`. This is where every
 * "AI omitted the field" / "AI returned an empty string instead of null" /
 * "AI returned '3' instead of 3" case gets resolved with plain JS — see the
 * comment on IntakeResult in src/lib/contracts/intake.ts for why this can't
 * live in the Zod schema itself (apiFetch requires input===output typing).
 * suggestedOwnerId is always forced to null here regardless of what the raw
 * JSON contains — the AI is never asked for it and never has the household
 * context to answer it; only src/app/api/intake/route.ts is allowed to set
 * a real value, after extraction.
 */
export function normalizeIntakeRaw(raw: unknown): unknown {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    summary: obj.summary,
    category: obj.category,
    kind: toNullableEnum(obj.kind, VALID_KINDS) ?? 'information',
    deadline: emptyStringToNull(obj.deadline) ?? null,
    nextStep: obj.nextStep,
    missingInformation: Array.isArray(obj.missingInformation) ? obj.missingInformation : [],
    priority: toNullableInt(obj.priority, 1, 3),
    amount: toNullableNonNegativeNumber(obj.amount),
    confidence: toNullableEnum(obj.confidence, VALID_CONFIDENCE),
    suggestedOwnerId: null,
  };
}
