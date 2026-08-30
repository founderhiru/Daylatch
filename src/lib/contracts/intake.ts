// @polsia:user-owned — shared zod contract for Daylatch intake extraction.
// Keep this module client-importable: zod only, no server-only imports.
import { z } from 'zod';

export const INTAKE_SOURCE_MAX_LENGTH = 12_000;
// Data URL size cap for image/PDF capture (~6MB of raw bytes once base64's
// ~33% overhead is accounted for) — generous enough for a phone photo or
// screenshot, small enough to stay well under typical serverless body
// limits without a separate upload/storage step.
export const INTAKE_IMAGE_MAX_LENGTH = 8_000_000;

export const IntakeCategory = z.enum(['email', 'bill', 'form', 'receipt', 'appointment', 'other']);

/// What KIND of thing this is, distinct from `category` (medium/shape) and
/// `domain` (household life area, chosen by the human — see
/// prisma/schema/household.prisma). This is the "is this even something to
/// act on?" classification the AI is well-placed to make from the text/image
/// alone, unlike domain (which needs household context it doesn't have).
export const IntakeKind = z.enum([
  'information',
  'event',
  'responsibility',
  'payment',
  'waiting_item',
  'renewal',
  'reference',
]);

export const IntakeConfidence = z.enum(['low', 'medium', 'high']);

export const IntakeCreate = z
  .object({
    sourceText: z.string().trim().max(INTAKE_SOURCE_MAX_LENGTH).optional().default(''),
    /// A data: URL (image/* or application/pdf) from the Scan/Upload capture
    /// paths. Mutually exclusive-ish with sourceText in practice (the route
    /// picks whichever branch applies), but both being present is allowed —
    /// sourceText is then treated as an optional caption for the image.
    imageDataUrl: z.string().trim().max(INTAKE_IMAGE_MAX_LENGTH).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceText.length === 0 && !data.imageDataUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourceText'],
        message: 'Give Daylatch something to work with.',
      });
    }
    if (
      data.imageDataUrl &&
      !data.imageDataUrl.startsWith('data:image/') &&
      !data.imageDataUrl.startsWith('data:application/pdf')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['imageDataUrl'],
        message: 'Unsupported file type.',
      });
    }
  });

// IMPORTANT: every field below is a plain, non-defaulted, non-preprocessed
// schema on purpose — src/lib/api-client.ts's apiFetch (framework-owned,
// not editable) types its `schema` option as `ZodType<T>`, which requires
// the schema's input and output types to be IDENTICAL. `.default()`,
// `.catch()`, and `.preprocess()` all make Zod's input type diverge from
// its output type (e.g. a defaulted field becomes optional on input but
// required on output), which breaks that assignability and fails
// typecheck at every apiFetch call site that uses this schema as a
// response validator. All normalization (empty-string-to-null, missing-
// field defaults, string-to-number coercion) therefore happens in plain
// JS in src/lib/business/intake.ts's normalizeIntakeRaw(), BEFORE the raw
// AI JSON ever reaches IntakeResult.parse() — this schema only validates
// an already-normalized shape.
export const IntakeResult = z.object({
  summary: z.string().trim().min(1).max(1_000),
  category: IntakeCategory,
  /// What KIND of thing this is — see IntakeKind's comment above. Always
  /// present after normalization (falls back to 'information').
  kind: IntakeKind,
  deadline: z.string().trim().min(1).max(120).nullable(),
  nextStep: z.string().trim().min(1).max(500),
  missingInformation: z.array(z.string().trim().min(1).max(240)).max(12),
  /// 1 (low) – 3 (high), matching Responsibility.priority. Null when the
  /// text/image gives no real signal — the confirm step falls back to the
  /// Responsibility model's own default (2) rather than the AI guessing.
  priority: z.number().int().min(1).max(3).nullable(),
  /// A plain number in the household's local currency, extracted only when
  /// explicitly stated (e.g. "₹3,250") — never estimated.
  amount: z.number().nonnegative().max(10_000_000).nullable(),
  confidence: IntakeConfidence.nullable(),
  /// NOT produced by the AI — the AI has no household context to suggest an
  /// owner from. Always null coming out of extraction; populated
  /// server-side by src/app/api/intake/route.ts using
  /// src/lib/business/owner-suggestion.ts before the response reaches the
  /// client. Present in this contract (rather than a separate response
  /// shape) so the review UI has one object to render.
  suggestedOwnerId: z.string().nullable(),
});

export type IntakeCreate = z.infer<typeof IntakeCreate>;
export type IntakeCategory = z.infer<typeof IntakeCategory>;
export type IntakeKind = z.infer<typeof IntakeKind>;
export type IntakeConfidence = z.infer<typeof IntakeConfidence>;
export type IntakeResult = z.infer<typeof IntakeResult>;
