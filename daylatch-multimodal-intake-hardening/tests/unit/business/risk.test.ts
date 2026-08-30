// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeIsAtRisk, getRiskReasons } from '@/lib/business/risk';

const NOW = new Date('2026-08-28T12:00:00.000Z');
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('getRiskReasons', () => {
  it('a completed responsibility is never at risk, regardless of other fields', () => {
    expect(
      getRiskReasons(
        { stage: 'completed', dueAt: days(-10), ownerId: null, waitingSince: days(-20) },
        NOW,
      ),
    ).toEqual([]);
  });

  it('flags an overdue responsibility', () => {
    expect(
      getRiskReasons({ stage: 'active', dueAt: days(-1), ownerId: 'm1', waitingSince: null }, NOW),
    ).toContain('overdue');
  });

  it('flags a responsibility due within 2 days as deadline_approaching, not overdue', () => {
    const reasons = getRiskReasons(
      { stage: 'active', dueAt: days(1), ownerId: 'm1', waitingSince: null },
      NOW,
    );
    expect(reasons).toContain('deadline_approaching');
    expect(reasons).not.toContain('overdue');
  });

  it('does not flag a responsibility due comfortably in the future', () => {
    expect(
      getRiskReasons({ stage: 'active', dueAt: days(10), ownerId: 'm1', waitingSince: null }, NOW),
    ).toEqual([]);
  });

  it('flags waitingSince 5+ days ago as waiting_too_long, independent of stage', () => {
    expect(
      getRiskReasons({ stage: 'active', dueAt: null, ownerId: 'm1', waitingSince: days(-5) }, NOW),
    ).toContain('waiting_too_long');
    expect(
      getRiskReasons({ stage: 'active', dueAt: null, ownerId: 'm1', waitingSince: days(-2) }, NOW),
    ).not.toContain('waiting_too_long');
  });

  it('does not flag waiting_too_long when not currently waiting (waitingSince is null)', () => {
    expect(
      getRiskReasons({ stage: 'active', dueAt: null, ownerId: 'm1', waitingSince: null }, NOW),
    ).not.toContain('waiting_too_long');
  });

  it('flags an unowned active/assigned responsibility', () => {
    expect(
      getRiskReasons({ stage: 'active', dueAt: null, ownerId: null, waitingSince: null }, NOW),
    ).toContain('unowned_and_active');
    expect(
      getRiskReasons({ stage: 'assigned', dueAt: null, ownerId: null, waitingSince: null }, NOW),
    ).toContain('unowned_and_active');
  });

  it('does not flag an unowned "received" responsibility (too early to expect an owner)', () => {
    expect(
      getRiskReasons({ stage: 'received', dueAt: null, ownerId: null, waitingSince: null }, NOW),
    ).not.toContain('unowned_and_active');
  });

  it('can report multiple simultaneous reasons, including waiting while active', () => {
    const reasons = getRiskReasons(
      { stage: 'active', dueAt: days(-3), ownerId: null, waitingSince: days(-6) },
      NOW,
    );
    expect(reasons).toEqual(
      expect.arrayContaining(['overdue', 'unowned_and_active', 'waiting_too_long']),
    );
  });
});

describe('computeIsAtRisk', () => {
  it('mirrors getRiskReasons emptiness', () => {
    expect(
      computeIsAtRisk({ stage: 'active', dueAt: days(30), ownerId: 'm1', waitingSince: null }, NOW),
    ).toBe(false);
    expect(
      computeIsAtRisk({ stage: 'active', dueAt: days(-1), ownerId: 'm1', waitingSince: null }, NOW),
    ).toBe(true);
  });
});
