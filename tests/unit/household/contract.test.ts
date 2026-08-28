// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HouseholdItem, HouseholdMemberItem } from '@/lib/contracts/household';

describe('Household contract', () => {
  it('accepts a member with a null role', () => {
    expect(
      HouseholdMemberItem.safeParse({ id: 'm1', displayName: 'Dad', role: null }).success,
    ).toBe(true);
  });

  it('rejects a member missing displayName', () => {
    expect(HouseholdMemberItem.safeParse({ id: 'm1', role: 'Dad' }).success).toBe(false);
  });

  it('accepts a household with an empty member list', () => {
    expect(
      HouseholdItem.safeParse({ id: 'h1', name: 'The Test Household', isDemo: true, members: [] })
        .success,
    ).toBe(true);
  });

  it('rejects a household with a malformed member', () => {
    expect(
      HouseholdItem.safeParse({
        id: 'h1',
        name: 'The Test Household',
        isDemo: true,
        members: [{ id: 'm1' }],
      }).success,
    ).toBe(false);
  });
});
