// @polsia:user-owned — shared zod contract for Daylatch intake extraction.
// Keep this module client-importable: zod only, no server-only imports.
import { z } from 'zod';

export const INTAKE_SOURCE_MAX_LENGTH = 12_000;

export const IntakeCategory = z.enum(['email', 'bill', 'form', 'receipt', 'appointment', 'other']);

export const IntakeCreate = z.object({
  sourceText: z
    .string()
    .trim()
    .min(1, 'Paste something to get started.')
    .max(INTAKE_SOURCE_MAX_LENGTH, 'Keep the pasted message under 12,000 characters.'),
});

export const IntakeResult = z.object({
  summary: z.string().trim().min(1).max(1_000),
  category: IntakeCategory,
  deadline: z.string().trim().min(1).max(120).nullable(),
  nextStep: z.string().trim().min(1).max(500),
  missingInformation: z.array(z.string().trim().min(1).max(240)).max(12),
});

export type IntakeCreate = z.infer<typeof IntakeCreate>;
export type IntakeCategory = z.infer<typeof IntakeCategory>;
export type IntakeResult = z.infer<typeof IntakeResult>;
