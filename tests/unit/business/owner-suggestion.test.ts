// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { suggestOwnerFromHistory } from '@/lib/business/owner-suggestion-rules';

describe('suggestOwnerFromHistory', () => {
  it('returns null with no history', () => {
    expect(suggestOwnerFromHistory([])).toBeNull();
  });

  it('returns null when every past instance was unassigned', () => {
    expect(suggestOwnerFromHistory([null, null, null])).toBeNull();
  });

  it('returns null with only a single past instance for an owner', () => {
    expect(suggestOwnerFromHistory(['mom'])).toBeNull();
  });

  it('suggests the clear majority owner once there are at least two instances', () => {
    expect(suggestOwnerFromHistory(['mom', 'mom'])).toBe('mom');
    expect(suggestOwnerFromHistory(['mom', 'mom', 'dad'])).toBe('mom');
  });

  it('returns null on a tie rather than guessing', () => {
    expect(suggestOwnerFromHistory(['mom', 'mom', 'dad', 'dad'])).toBeNull();
  });

  it('ignores nulls mixed in with real history', () => {
    expect(suggestOwnerFromHistory(['mom', null, 'mom', null])).toBe('mom');
  });
});
