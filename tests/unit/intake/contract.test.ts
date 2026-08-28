// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { INTAKE_SOURCE_MAX_LENGTH, IntakeCreate, IntakeResult } from '@/lib/contracts/intake';

describe('Daylatch intake contract', () => {
  it('accepts every supported category and a nullable deadline', () => {
    const categories = ['email', 'bill', 'form', 'receipt', 'appointment', 'other'] as const;

    for (const category of categories) {
      expect(
        IntakeResult.safeParse({
          summary: 'A school form needs one signature.',
          category,
          deadline: category === 'form' ? '2026-09-03' : null,
          nextStep: 'Sign the form and send it back.',
          missingInformation: [],
        }).success,
      ).toBe(true);
    }
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
    expect(
      IntakeResult.safeParse({
        summary: '',
        category: 'unknown',
        deadline: 'not important',
        nextStep: 'Do something',
        missingInformation: [],
      }).success,
    ).toBe(false);

    expect(
      IntakeResult.safeParse({
        summary: 'A bill needs payment.',
        category: 'bill',
        deadline: null,
        nextStep: 'Confirm the amount before paying.',
        missingInformation: ['x'.repeat(241)],
      }).success,
    ).toBe(false);
  });
});
