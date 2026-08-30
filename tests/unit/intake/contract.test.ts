// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { INTAKE_SOURCE_MAX_LENGTH, IntakeCreate, IntakeResult } from '@/lib/contracts/intake';

function validResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    summary: 'A school form needs one signature.',
    category: 'form',
    kind: 'responsibility',
    deadline: null,
    nextStep: 'Sign the form and send it back.',
    missingInformation: [],
    priority: 2,
    amount: null,
    confidence: 'medium',
    suggestedOwnerId: null,
    ...overrides,
  };
}

describe('Daylatch intake contract', () => {
  it('accepts every supported category and kind', () => {
    const categories = ['email', 'bill', 'form', 'receipt', 'appointment', 'other'] as const;
    for (const category of categories) {
      expect(IntakeResult.safeParse(validResult({ category })).success).toBe(true);
    }

    const kinds = [
      'information',
      'event',
      'responsibility',
      'payment',
      'waiting_item',
      'renewal',
      'reference',
    ] as const;
    for (const kind of kinds) {
      expect(IntakeResult.safeParse(validResult({ kind })).success).toBe(true);
    }
  });

  it('accepts a fully-null optional-signal result (nothing extractable beyond the basics)', () => {
    expect(
      IntakeResult.safeParse(
        validResult({ priority: null, amount: null, confidence: null, deadline: null }),
      ).success,
    ).toBe(true);
  });

  it('rejects missing, oversized, and malformed source text', () => {
    expect(IntakeCreate.safeParse({}).success).toBe(false);
    expect(IntakeCreate.safeParse({ sourceText: '   ' }).success).toBe(false);
    expect(
      IntakeCreate.safeParse({ sourceText: 'x'.repeat(INTAKE_SOURCE_MAX_LENGTH + 1) }).success,
    ).toBe(false);
    expect(IntakeCreate.safeParse({ sourceText: 42 }).success).toBe(false);
  });

  it('rejects malformed extraction results', () => {
    expect(IntakeResult.safeParse(validResult({ summary: '', category: 'unknown' })).success).toBe(
      false,
    );
    expect(
      IntakeResult.safeParse(validResult({ missingInformation: ['x'.repeat(241)] })).success,
    ).toBe(false);
    // kind is required in this contract — an object missing it entirely is
    // not a valid IntakeResult (normalization/defaulting happens upstream
    // in src/lib/business/intake.ts's normalizeIntakeRaw, not here).
    const { kind: _kind, ...withoutKind } = validResult();
    expect(IntakeResult.safeParse(withoutKind).success).toBe(false);
    // Likewise: this schema does not coerce or normalize — an empty string
    // for a nullable field is not itself valid; that conversion happens in
    // normalizeIntakeRaw before this schema ever sees the value.
    expect(IntakeResult.safeParse(validResult({ deadline: '' })).success).toBe(false);
    expect(IntakeResult.safeParse(validResult({ priority: '3' })).success).toBe(false);
  });

  it('accepts an image capture request and rejects one with neither text nor image', () => {
    expect(IntakeCreate.safeParse({ imageDataUrl: 'data:image/png;base64,AAAA' }).success).toBe(
      true,
    );
    expect(IntakeCreate.safeParse({ sourceText: '', imageDataUrl: undefined }).success).toBe(false);
    expect(IntakeCreate.safeParse({ imageDataUrl: 'data:text/plain;base64,AAAA' }).success).toBe(
      false,
    );
  });
});
