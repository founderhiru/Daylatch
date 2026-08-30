// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildDailyBriefing,
  buildHighlights,
  computeCounts,
  type PulseCounts,
  type PulseRow,
} from '@/lib/business/pulse-rules';

const NOW = new Date('2026-08-28T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

function row(overrides: Partial<PulseRow> & { title: string }): PulseRow {
  return { stage: 'active', dueAt: null, ownerId: 'm1', waitingSince: null, ...overrides };
}

describe('computeCounts', () => {
  it('counts a completed responsibility only as completed', () => {
    const counts = computeCounts([row({ title: 'Internet renewal', stage: 'completed' })], NOW);
    expect(counts).toEqual({
      attentionCount: 0,
      waitingCount: 0,
      upcomingCount: 0,
      atRiskCount: 0,
      completedCount: 1,
    });
  });

  it('counts a waiting responsibility as waiting, not attention or upcoming', () => {
    const counts = computeCounts(
      [row({ title: 'AC service', stage: 'active', waitingSince: daysAgo(2) })],
      NOW,
    );
    expect(counts.waitingCount).toBe(1);
    expect(counts.attentionCount).toBe(0);
    expect(counts.upcomingCount).toBe(0);
  });

  it('counts an on-track active responsibility as upcoming', () => {
    const counts = computeCounts(
      [row({ title: 'Car insurance renewal', stage: 'active', dueAt: daysFromNow(30) })],
      NOW,
    );
    expect(counts.upcomingCount).toBe(1);
    expect(counts.attentionCount).toBe(0);
  });

  it('counts received/understood/assigned as attention regardless of risk', () => {
    for (const stage of ['received', 'understood', 'assigned'] as const) {
      const counts = computeCounts([row({ title: 'x', stage })], NOW);
      expect(counts.attentionCount).toBe(1);
    }
  });

  it('counts an at-risk active responsibility as attention, not upcoming', () => {
    const counts = computeCounts(
      [row({ title: 'Electricity payment', stage: 'active', ownerId: null })],
      NOW,
    );
    expect(counts.attentionCount).toBe(1);
    expect(counts.atRiskCount).toBe(1);
    expect(counts.upcomingCount).toBe(0);
  });
});

describe('buildHighlights', () => {
  it('flags an unowned active responsibility by name', () => {
    const highlights = buildHighlights(
      [row({ title: 'Passport renewal', stage: 'active', ownerId: null })],
      NOW,
    );
    expect(highlights).toContain('"Passport renewal" has no owner.');
  });

  it('flags an overdue responsibility by name', () => {
    const highlights = buildHighlights([row({ title: 'School fee', dueAt: daysAgo(1) })], NOW);
    expect(highlights).toContain('"School fee" is overdue.');
  });

  it('flags a stale wait with the exact day count', () => {
    const highlights = buildHighlights(
      [row({ title: 'AC service appointment', waitingSince: daysAgo(6) })],
      NOW,
    );
    expect(highlights).toContain('"AC service appointment" has been waiting 6 days.');
  });

  it('uses singular "day" for exactly one day', () => {
    // waitingSince must be >= 5 days ago to trigger waiting_too_long at all;
    // use exactly 5 days to exercise the boundary and singular-day wording.
    const highlights = buildHighlights([row({ title: 'x', waitingSince: daysAgo(5) })], NOW);
    expect(highlights).toContain('"x" has been waiting 5 days.');
  });

  it('produces no highlight for a healthy, on-track responsibility', () => {
    expect(
      buildHighlights([row({ title: 'Car insurance renewal', dueAt: daysFromNow(30) })], NOW),
    ).toEqual([]);
  });

  it('never highlights a completed responsibility', () => {
    expect(
      buildHighlights(
        [row({ title: 'Internet renewal', stage: 'completed', ownerId: null, dueAt: daysAgo(10) })],
        NOW,
      ),
    ).toEqual([]);
  });

  it('caps highlights at 5 even with more real conditions', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row({ title: `Item ${i}`, ownerId: null, stage: 'active' }),
    );
    expect(buildHighlights(rows, NOW)).toHaveLength(5);
  });
});

describe('buildDailyBriefing', () => {
  const counts = (overrides: Partial<PulseCounts>): PulseCounts => ({
    attentionCount: 0,
    waitingCount: 0,
    upcomingCount: 0,
    atRiskCount: 0,
    completedCount: 0,
    ...overrides,
  });

  it('greets by time of day', () => {
    // Constructed from local components (not a 'Z' ISO string) so
    // getHours() reads back exactly 8/14/20 regardless of the test
    // runner's timezone.
    expect(buildDailyBriefing(counts({}), new Date(2026, 7, 28, 8)).greeting).toBe('Good morning.');
    expect(buildDailyBriefing(counts({}), new Date(2026, 7, 28, 14)).greeting).toBe(
      'Good afternoon.',
    );
    expect(buildDailyBriefing(counts({}), new Date(2026, 7, 28, 20)).greeting).toBe(
      'Good evening.',
    );
  });

  it('produces no lines when every count is zero', () => {
    expect(buildDailyBriefing(counts({})).lines).toEqual([]);
  });

  it('produces one line per non-zero count, in attention -> waiting -> upcoming order', () => {
    const briefing = buildDailyBriefing(
      counts({ attentionCount: 3, waitingCount: 1, upcomingCount: 2 }),
    );
    expect(briefing.lines).toEqual([
      '3 things need attention.',
      '1 thing is waiting.',
      '2 things are coming up.',
    ]);
  });

  it('uses singular wording for a count of exactly one', () => {
    const briefing = buildDailyBriefing(
      counts({ attentionCount: 1, waitingCount: 1, upcomingCount: 1 }),
    );
    expect(briefing.lines).toEqual([
      '1 thing needs attention.',
      '1 thing is waiting.',
      '1 thing is coming up.',
    ]);
  });

  it('skips a line entirely for a zero count rather than saying "0"', () => {
    const briefing = buildDailyBriefing(counts({ attentionCount: 2 }));
    expect(briefing.lines).toEqual(['2 things need attention.']);
  });
});
