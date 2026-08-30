// @polsia:user-owned — shared zod contract for the Responsibility resource,
// the central Daylatch domain object (a household obligation, not a simple
// task). Keep this module client-importable: zod only, no server-only
// imports, no `@prisma/client` import — the enums here are the source of
// truth for the wire format and are kept in sync BY HAND with the Prisma
// enums of the same name in prisma/schema/household.prisma.
//
// North-star correction applied here: `status` is gone. `stage` is the
// linear workflow position; `waiting`/`at-risk` are CONDITIONS that can be
// true at any stage, never stage values themselves (see the module-level
// comment in prisma/schema/household.prisma for the full rationale).
import { z } from 'zod';

export const ResponsibilityStage = z.enum([
  'received',
  'understood',
  'assigned',
  'active',
  'completed',
]);

export const ResponsibilityCategory = z.enum([
  'email',
  'bill',
  'form',
  'receipt',
  'appointment',
  'other',
]);

/// Household-life-area classification, distinct from `category` (the
/// intake/medium classification) — see prisma/schema/household.prisma.
export const ResponsibilityDomain = z.enum([
  'car',
  'school',
  'health',
  'home',
  'finance',
  'travel',
  'other',
]);

export const ResponsibilitySourceType = z.enum([
  'pasted_text',
  'manual_entry',
  'email',
  'whatsapp',
  'document_upload',
  'calendar_event',
  'voice',
]);

// Write shape: fields a client may submit to create a responsibility.
export const ResponsibilityCreate = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1_000).optional(),
  category: ResponsibilityCategory.default('other'),
  domain: ResponsibilityDomain.default('other'),
  ownerId: z.string().trim().min(1).nullable().optional(),
  /// Get-or-create by name (see src/lib/business/provider.ts). Never a raw
  /// providerId from the client — there is no provider-listing endpoint to
  /// pick one from yet, so free-text name is the only sane input surface.
  providerName: z.string().trim().min(1).max(120).optional(),
  priority: z.number().int().min(1).max(3).default(2),
  nextStep: z.string().trim().max(500).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  amount: z.number().nonnegative().max(10_000_000).optional(),
  sourceType: ResponsibilitySourceType.default('manual_entry'),
  sourceReference: z.string().trim().max(200).optional(),
});

// Fields a client may PATCH after creation. Every field optional; at least
// one must be present (enforced by the route, not the schema, so a single
// shared shape can serve narrower updates like "just change stage").
//
// Waiting is entered/exited via `isWaiting` + optional `waitingFor`/
// `followUpAt` — never by setting `waitingSince` directly. `waitingSince` is
// system-managed (src/lib/business/responsibility.ts sets it the moment
// `isWaiting` flips true, and clears the whole waiting group the moment it
// flips false) so it reliably answers "since when" instead of drifting on
// every unrelated edit.
export const ResponsibilityUpdate = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1_000).nullable().optional(),
  category: ResponsibilityCategory.optional(),
  domain: ResponsibilityDomain.optional(),
  ownerId: z.string().trim().min(1).nullable().optional(),
  /// null clears the provider; a string upserts-by-name and links it;
  /// undefined leaves the provider unchanged.
  providerName: z.string().trim().min(1).max(120).nullable().optional(),
  stage: ResponsibilityStage.optional(),
  priority: z.number().int().min(1).max(3).optional(),
  nextStep: z.string().trim().max(500).nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  amount: z.number().nonnegative().max(10_000_000).nullable().optional(),
  isWaiting: z.boolean().optional(),
  waitingFor: z.string().trim().max(120).nullable().optional(),
  followUpAt: z.string().datetime({ offset: true }).nullable().optional(),
});

// Read shape: persisted record returned by the server, including the
// server-computed `isAtRisk` flag (see src/lib/business/risk.ts) so the
// client never has to re-derive risk logic.
export const ResponsibilityItem = z.object({
  id: z.string(),
  householdId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: ResponsibilityCategory,
  domain: ResponsibilityDomain,
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  providerId: z.string().nullable(),
  providerName: z.string().nullable(),
  stage: ResponsibilityStage,
  priority: z.number().int(),
  nextStep: z.string().nullable(),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  amount: z.number().nullable(),
  isWaiting: z.boolean(),
  waitingFor: z.string().nullable(),
  waitingSince: z.string().datetime({ offset: true }).nullable(),
  followUpAt: z.string().datetime({ offset: true }).nullable(),
  isAtRisk: z.boolean(),
  sourceType: ResponsibilitySourceType,
  sourceReference: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

// GET response envelope.
export const ResponsibilityList = z.object({
  items: z.array(ResponsibilityItem),
});

export type ResponsibilityStage = z.infer<typeof ResponsibilityStage>;
export type ResponsibilityCategory = z.infer<typeof ResponsibilityCategory>;
export type ResponsibilityDomain = z.infer<typeof ResponsibilityDomain>;
export type ResponsibilitySourceType = z.infer<typeof ResponsibilitySourceType>;
export type ResponsibilityCreate = z.infer<typeof ResponsibilityCreate>;
export type ResponsibilityUpdate = z.infer<typeof ResponsibilityUpdate>;
export type ResponsibilityItem = z.infer<typeof ResponsibilityItem>;
export type ResponsibilityList = z.infer<typeof ResponsibilityList>;
