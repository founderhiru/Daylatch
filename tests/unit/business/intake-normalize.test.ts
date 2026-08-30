// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeIntakeRaw } from '@/lib/business/intake-normalize';
import { IntakeResult } from '@/lib/contracts/intake';

/** Runs a raw object through normalizeIntakeRaw and then IntakeResult.parse,
 * mirroring exactly what extractIntake/extractIntakeFromImage do — this is
 * the behavior that actually matters (a value the schema will accept). */
function normalizeAndParse(raw: unknown) {
  return IntakeResult.parse(normalizeIntakeRaw(raw));
}

describe('normalizeIntakeRaw', () => {
  it('defaults kind/priority/amount/confidence/suggestedOwnerId when the AI omits them', () => {
    const result = normalizeAndParse({
      summary: 'A school form needs one signature.',
      category: 'form',
      deadline: null,
      nextStep: 'Sign the form.',
      missingInformation: [],
    });
    expect(result.kind).toBe('information');
    expect(result.priority).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.suggestedOwnerId).toBeNull();
  });

  it('normalizes empty-string values to null instead of failing', () => {
    const result = normalizeAndParse({
      summary: 'A bill needs payment.',
      category: 'bill',
      kind: 'payment',
      deadline: '',
      nextStep: 'Pay the bill.',
      missingInformation: [],
      priority: '',
      amount: '',
      confidence: '',
    });
    expect(result.deadline).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it('coerces a numeric-string priority/amount into real numbers', () => {
    const result = normalizeAndParse({
      summary: 'Something happened.',
      category: 'other',
      kind: 'payment',
      deadline: null,
      nextStep: 'Do something.',
      missingInformation: [],
      priority: '3',
      amount: '3250',
      confidence: 'high',
    });
    expect(result.priority).toBe(3);
    expect(result.amount).toBe(3250);
    expect(result.confidence).toBe('high');
  });

  it('falls back to null for an out-of-range or invalid priority rather than clamping or guessing', () => {
    const result = normalizeAndParse({
      summary: 'x',
      category: 'other',
      kind: 'information',
      deadline: null,
      nextStep: 'x',
      missingInformation: [],
      priority: 7,
      amount: -50,
      confidence: 'extremely high',
    });
    expect(result.priority).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it('always forces suggestedOwnerId to null regardless of what raw JSON contains', () => {
    const result = normalizeAndParse({
      summary: 'x',
      category: 'other',
      kind: 'information',
      deadline: null,
      nextStep: 'x',
      missingInformation: [],
      suggestedOwnerId: 'sneaky-injected-id',
    });
    expect(result.suggestedOwnerId).toBeNull();
  });

  it('defaults missingInformation to an empty array if the AI returns something other than an array', () => {
    const result = normalizeAndParse({
      summary: 'x',
      category: 'other',
      kind: 'information',
      deadline: null,
      nextStep: 'x',
      missingInformation: 'not an array',
    });
    expect(result.missingInformation).toEqual([]);
  });

  it('handles a completely non-object raw value without throwing', () => {
    expect(() => normalizeIntakeRaw(null)).not.toThrow();
    expect(() => normalizeIntakeRaw('a plain string')).not.toThrow();
  });
});
