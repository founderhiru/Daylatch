// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ActivityItem } from '@/lib/contracts/activity';
import { IntakeConfirm } from '@/lib/contracts/intake-to-responsibility';
import { PulseSummary } from '@/lib/contracts/pulse';

describe('Activity contract', () => {
  it('accepts an entry with no linked responsibility', () => {
    expect(
      ActivityItem.safeParse({
        id: 'a1',
        householdId: 'h1',
        responsibilityId: null,
        responsibilityTitle: null,
        eventType: 'note',
        description: 'Household created.',
        createdAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('accepts the waiting_started / waiting_ended event types', () => {
    for (const eventType of ['waiting_started', 'waiting_ended']) {
      expect(
        ActivityItem.safeParse({
          id: 'a1',
          householdId: 'h1',
          responsibilityId: 'r1',
          responsibilityTitle: 'Car insurance renewal',
          eventType,
          description: 'x',
          createdAt: '2026-08-28T00:00:00.000Z',
        }).success,
      ).toBe(true);
    }
  });

  it('rejects the old status_changed event type (renamed to stage_changed)', () => {
    expect(
      ActivityItem.safeParse({
        id: 'a1',
        householdId: 'h1',
        responsibilityId: null,
        responsibilityTitle: null,
        eventType: 'status_changed',
        description: 'x',
        createdAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown eventType', () => {
    expect(
      ActivityItem.safeParse({
        id: 'a1',
        householdId: 'h1',
        responsibilityId: null,
        responsibilityTitle: null,
        eventType: 'deleted',
        description: 'x',
        createdAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('PulseSummary contract', () => {
  it('accepts an all-zero summary with no highlights', () => {
    expect(
      PulseSummary.safeParse({
        householdId: 'h1',
        attentionCount: 0,
        waitingCount: 0,
        upcomingCount: 0,
        atRiskCount: 0,
        completedCount: 0,
        highlights: [],
        computedAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('accepts specific highlight sentences', () => {
    expect(
      PulseSummary.safeParse({
        householdId: 'h1',
        attentionCount: 1,
        waitingCount: 1,
        upcomingCount: 0,
        atRiskCount: 1,
        completedCount: 0,
        highlights: [
          '"Passport renewal" has no owner.',
          '"AC service appointment" has been waiting 6 days.',
        ],
        computedAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects a missing highlights field (server always computes it)', () => {
    expect(
      PulseSummary.safeParse({
        householdId: 'h1',
        attentionCount: 0,
        waitingCount: 0,
        upcomingCount: 0,
        atRiskCount: 0,
        completedCount: 0,
        computedAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects negative counts', () => {
    expect(
      PulseSummary.safeParse({
        householdId: 'h1',
        attentionCount: -1,
        waitingCount: 0,
        upcomingCount: 0,
        atRiskCount: 0,
        completedCount: 0,
        highlights: [],
        computedAt: '2026-08-28T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('IntakeConfirm contract', () => {
  it('accepts a confirmed draft with no owner or provider selected, defaulting domain to other', () => {
    const result = IntakeConfirm.safeParse({
      summary: 'Car insurance renews Sep 14.',
      category: 'bill',
      deadline: 'Sep 14',
      nextStep: 'Review the renewal quote.',
      missingInformation: [],
      ownerId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('other');
    }
  });

  it('accepts an explicit domain and providerName', () => {
    expect(
      IntakeConfirm.safeParse({
        summary: 'Car insurance renews Sep 14.',
        category: 'bill',
        domain: 'car',
        deadline: 'Sep 14',
        nextStep: 'Review the renewal quote.',
        missingInformation: [],
        ownerId: null,
        providerName: 'Apex General Insurance',
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid domain', () => {
    expect(
      IntakeConfirm.safeParse({
        summary: 'x',
        category: 'other',
        domain: 'garage',
        deadline: null,
        nextStep: 'Do something',
        missingInformation: [],
      }).success,
    ).toBe(false);
  });

  it('rejects a confirm payload with an empty nextStep', () => {
    expect(
      IntakeConfirm.safeParse({
        summary: 'x',
        category: 'other',
        deadline: null,
        nextStep: '',
        missingInformation: [],
      }).success,
    ).toBe(false);
  });
});
