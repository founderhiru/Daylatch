// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ResponsibilityCreate,
  ResponsibilityItem,
  ResponsibilityUpdate,
} from '@/lib/contracts/responsibility';

const validItem = {
  id: 'r1',
  householdId: 'h1',
  title: 'Car insurance renewal',
  description: null,
  category: 'bill' as const,
  domain: 'car' as const,
  ownerId: null,
  ownerName: null,
  providerId: null,
  providerName: null,
  stage: 'active' as const,
  priority: 2,
  nextStep: 'Review the quote.',
  dueAt: null,
  completedAt: null,
  amount: null,
  isWaiting: false,
  waitingFor: null,
  waitingSince: null,
  followUpAt: null,
  isAtRisk: false,
  sourceType: 'manual_entry' as const,
  sourceReference: null,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('ResponsibilityCreate', () => {
  it('accepts a minimal payload and applies defaults', () => {
    const result = ResponsibilityCreate.safeParse({ title: 'Pay the electricity bill' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('other');
      expect(result.data.domain).toBe('other');
      expect(result.data.priority).toBe(2);
      expect(result.data.sourceType).toBe('manual_entry');
    }
  });

  it('rejects an empty title', () => {
    expect(ResponsibilityCreate.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects an out-of-range priority', () => {
    expect(ResponsibilityCreate.safeParse({ title: 'x', priority: 4 }).success).toBe(false);
  });

  it('rejects an invalid domain', () => {
    expect(ResponsibilityCreate.safeParse({ title: 'x', domain: 'garage' }).success).toBe(false);
  });

  it('accepts every valid domain', () => {
    const domains = ['car', 'school', 'health', 'home', 'finance', 'travel', 'other'];
    for (const domain of domains) {
      expect(ResponsibilityCreate.safeParse({ title: 'x', domain }).success).toBe(true);
    }
  });

  it('rejects a dueAt that is not a valid ISO datetime with offset', () => {
    expect(ResponsibilityCreate.safeParse({ title: 'x', dueAt: 'next Tuesday' }).success).toBe(
      false,
    );
    expect(
      ResponsibilityCreate.safeParse({ title: 'x', dueAt: '2026-09-14T00:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('accepts an optional amount and rejects a negative one', () => {
    expect(ResponsibilityCreate.safeParse({ title: 'x', amount: 1200 }).success).toBe(true);
    expect(ResponsibilityCreate.safeParse({ title: 'x', amount: -5 }).success).toBe(false);
  });
});

describe('ResponsibilityUpdate', () => {
  it('accepts an empty object (route enforces "at least one field")', () => {
    expect(ResponsibilityUpdate.safeParse({}).success).toBe(true);
  });

  it('accepts explicitly unassigning an owner', () => {
    expect(ResponsibilityUpdate.safeParse({ ownerId: null }).success).toBe(true);
  });

  it('rejects an invalid stage value (status/at_risk/waiting are not stages)', () => {
    expect(ResponsibilityUpdate.safeParse({ stage: 'archived' }).success).toBe(false);
    expect(ResponsibilityUpdate.safeParse({ stage: 'waiting' }).success).toBe(false);
    expect(ResponsibilityUpdate.safeParse({ stage: 'at_risk' }).success).toBe(false);
  });

  it('accepts every valid stage', () => {
    const stages = ['received', 'understood', 'assigned', 'active', 'completed'];
    for (const stage of stages) {
      expect(ResponsibilityUpdate.safeParse({ stage }).success).toBe(true);
    }
  });

  it('accepts entering waiting with waitingFor and followUpAt', () => {
    expect(
      ResponsibilityUpdate.safeParse({
        isWaiting: true,
        waitingFor: 'Insurance provider',
        followUpAt: '2026-09-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('accepts leaving waiting with just isWaiting: false', () => {
    expect(ResponsibilityUpdate.safeParse({ isWaiting: false }).success).toBe(true);
  });

  it('accepts clearing the provider with providerName: null', () => {
    expect(ResponsibilityUpdate.safeParse({ providerName: null }).success).toBe(true);
  });

  it('rejects an empty-string providerName (use null to clear, omit to leave unchanged)', () => {
    expect(ResponsibilityUpdate.safeParse({ providerName: '' }).success).toBe(false);
  });
});

describe('ResponsibilityItem', () => {
  it('accepts a fully-formed persisted record', () => {
    expect(ResponsibilityItem.safeParse(validItem).success).toBe(true);
  });

  it('accepts a record with an active waiting condition', () => {
    expect(
      ResponsibilityItem.safeParse({
        ...validItem,
        isWaiting: true,
        waitingFor: 'Insurance provider',
        waitingSince: '2026-08-22T00:00:00.000Z',
        followUpAt: '2026-08-29T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects a record missing isAtRisk (server-computed, must be present)', () => {
    const { isAtRisk: _drop, ...withoutRisk } = validItem;
    expect(ResponsibilityItem.safeParse(withoutRisk).success).toBe(false);
  });

  it('rejects a record missing isWaiting (server-computed, must be present)', () => {
    const { isWaiting: _drop, ...withoutWaiting } = validItem;
    expect(ResponsibilityItem.safeParse(withoutWaiting).success).toBe(false);
  });

  it('rejects a record using the old `status` field name instead of `stage`', () => {
    const { stage: _drop, ...rest } = validItem;
    expect(ResponsibilityItem.safeParse({ ...rest, status: 'active' }).success).toBe(false);
  });
});
