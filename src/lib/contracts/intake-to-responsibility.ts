// @polsia:user-owned — bridges the existing, unmodified intake extraction
// (src/lib/contracts/intake.ts / src/lib/business/intake.ts /
// src/app/api/intake) to the new Responsibility domain model. This is a NEW
// contract rather than a change to IntakeResult, per Part 11 of the phase-2
// brief: "do not change the existing contract unless absolutely necessary."
//
// Flow: paste -> AI understands (existing, unchanged) -> user reviews the
// IntakeResult draft (existing, unchanged) -> user explicitly confirms ->
// POST here -> a real Responsibility row is created. The AI's output is
// never saved automatically.
import { z } from 'zod';
import { IntakeCategory } from './intake';
import { ResponsibilityCategory, ResponsibilityDomain } from './responsibility';

// The intake and responsibility category vocabularies are intentionally
// identical today (email/bill/form/receipt/appointment/other). Assert that at
// module load rather than relying on eyeballing two separate enum
// declarations staying in sync over time.
const intakeCategories = [...IntakeCategory.options].sort();
const responsibilityCategories = [...ResponsibilityCategory.options].sort();
if (JSON.stringify(intakeCategories) !== JSON.stringify(responsibilityCategories)) {
  throw new Error(
    'IntakeCategory and ResponsibilityCategory have drifted apart — update the mapping in ' +
      'src/lib/business/responsibility.ts (createResponsibilityFromIntake) before shipping.',
  );
}

export const IntakeConfirm = z.object({
  /// The (possibly user-edited) draft from POST /api/intake. Re-validated
  /// here rather than trusted, since the user may have edited any field.
  summary: z.string().trim().min(1).max(1_000),
  category: IntakeCategory,
  /// Household-life-area, explicitly picked by the human at confirmation
  /// time (never inferred by an additional AI call — see
  /// prisma/schema/household.prisma's ResponsibilityDomain comment).
  /// Defaults to 'other' so the contract stays robust, but the confirmation
  /// UI always renders the selector so the value is a deliberate choice,
  /// not a hidden default.
  domain: ResponsibilityDomain.default('other'),
  /// Free-text deadline phrase from the AI extraction (e.g. "Sep 14") — NOT
  /// necessarily an ISO date, so it is not written to Responsibility.dueAt
  /// automatically. It is preserved in the description so nothing is lost;
  /// dueAt stays user-set (don't fake automation for unimplemented states —
  /// the app cannot safely parse arbitrary deadline phrases into a firm
  /// date without risking a wrong renewal/deadline date).
  deadline: z.string().trim().max(120).nullable(),
  nextStep: z.string().trim().min(1).max(500),
  missingInformation: z.array(z.string().trim().min(1).max(240)).max(12),
  /// Optional explicit owner assignment at confirmation time.
  ownerId: z.string().trim().min(1).nullable().optional(),
  /// Optional explicit provider name at confirmation time — get-or-create
  /// by name (src/lib/business/responsibility.ts); never silently inferred.
  providerName: z.string().trim().min(1).max(120).optional(),
});

export type IntakeConfirm = z.infer<typeof IntakeConfirm>;
