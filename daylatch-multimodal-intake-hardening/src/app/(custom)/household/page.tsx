// @polsia:user-owned — the Household view (Phase 1.5): "Who has what?" — not
// an administration page. Reuses GET /api/household and
// GET /api/responsibilities exactly as-is; no new API route, no new
// contract, no backend change.
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  PersonAvatar,
  StatusDot,
  toneForResponsibility,
} from '@/components/custom/daylatch-primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { HouseholdItem } from '@/lib/contracts/household';
import { type ResponsibilityItem, ResponsibilityList } from '@/lib/contracts/responsibility';

function formatDue(dueAt: string | null): string | null {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ResponsibilityLine({ item }: { item: ResponsibilityItem }) {
  const due = formatDue(item.dueAt);
  return (
    <Link
      href={`/responsibilities/${item.id}`}
      className="flex items-center gap-2.5 border-b border-border/50 py-2.5 last:border-0"
    >
      <StatusDot tone={toneForResponsibility(item)} />
      <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>
      {due ? <span className="shrink-0 text-[11.5px] text-muted-foreground">{due}</span> : null}
    </Link>
  );
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<HouseholdItem | null>(null);
  const [responsibilities, setResponsibilities] = useState<ResponsibilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [householdRes, responsibilitiesRes] = await Promise.all([
        apiFetch('/api/household', { schema: HouseholdItem }),
        apiFetch('/api/responsibilities', { schema: ResponsibilityList }),
      ]);
      setHousehold(householdRes);
      setResponsibilities(responsibilitiesRes.items);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unassigned = responsibilities.filter((r) => r.ownerId === null && r.stage !== 'completed');

  return (
    <main className="container-page mx-auto max-w-lg py-8 pb-28 md:pb-8">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : loadError ? (
        <p className="text-[13px] text-muted-foreground">
          Could not load your household right now.
        </p>
      ) : (
        <>
          <h1 className="font-display text-h4 tracking-tight">{household?.name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Who has what, at a glance.</p>

          <div className="mt-6 space-y-6">
            {(household?.members ?? []).map((member) => {
              const owned = responsibilities.filter((r) => r.ownerId === member.id);
              const active = owned.filter((r) => r.stage !== 'completed');
              return (
                <section key={member.id}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <PersonAvatar name={member.displayName} className="size-7" />
                      <span className="text-[14px] font-medium">{member.displayName}</span>
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {active.length} active
                    </span>
                  </div>
                  <div className="mt-2">
                    {active.length === 0 ? (
                      <p className="py-2 text-[12.5px] text-muted-foreground">
                        Nothing on their plate right now.
                      </p>
                    ) : (
                      active.map((item) => <ResponsibilityLine key={item.id} item={item} />)
                    )}
                  </div>
                </section>
              );
            })}

            {unassigned.length > 0 ? (
              <section>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-attention">Unassigned</span>
                  <span className="text-[11.5px] text-muted-foreground">{unassigned.length}</span>
                </div>
                <div className="mt-2">
                  {unassigned.map((item) => (
                    <ResponsibilityLine key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}
