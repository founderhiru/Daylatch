// @polsia:user-owned — the canonical Responsibility detail view (Phase
// 1.4). Deliberately answers only four questions per the approved brief:
// what is it, who owns it, when is it due, what happens next — plus one
// primary action (Mark complete). No activity/history embed here (Activity
// already has its own tab, Phase 1.6) — keeping this screen lean per "do
// not create a generic task-management UI."
//
// Reuses GET /api/responsibilities (the existing list endpoint — filtered
// to this id client-side) and PATCH /api/responsibilities/[id]. No new API
// route, no new contract, no backend change of any kind.
'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PersonAvatar,
  StatusChip,
  StatusDot,
  toneForResponsibility as toneFor,
} from '@/components/custom/daylatch-primitives';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { ResponsibilityItem, ResponsibilityList } from '@/lib/contracts/responsibility';

const DOMAIN_LABEL: Record<ResponsibilityItem['domain'], string> = {
  car: 'Car',
  school: 'School',
  health: 'Health',
  home: 'Home',
  finance: 'Finance',
  travel: 'Travel',
  other: 'Other',
};

function formatDue(dueAt: string | null): string {
  if (!dueAt) return 'No due date set';
  return new Date(dueAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function ResponsibilityDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<ResponsibilityItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items } = await apiFetch('/api/responsibilities', { schema: ResponsibilityList });
      const found = items.find((r) => r.id === params.id) ?? null;
      setItem(found);
      setNotFound(!found);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = async () => {
    if (!item) return;
    setIsCompleting(true);
    try {
      const updated = await apiFetch<ResponsibilityItem>(`/api/responsibilities/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: 'completed' }),
        schema: ResponsibilityItem,
      });
      setItem(updated);
      toast.success('Marked complete.');
    } catch {
      toast.error('Could not mark that complete right now.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <main className="container-page mx-auto max-w-lg py-8 pb-28 md:pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
      </Link>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="mt-6 h-24 rounded-xl" />
        </div>
      ) : notFound || !item ? (
        <p className="mt-8 text-[13px] text-muted-foreground">
          That responsibility couldn't be found. It may have been removed.
        </p>
      ) : (
        <div className="mt-6">
          {/* WHAT is it */}
          <div className="flex items-start gap-2.5">
            <span className="mt-2">
              <StatusDot tone={toneFor(item)} />
            </span>
            <div>
              <h1 className="font-display text-h4 leading-snug tracking-tight text-balance">
                {item.title}
              </h1>
              {item.description ? (
                <p className="mt-1.5 text-[13px] whitespace-pre-line text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
              {DOMAIN_LABEL[item.domain]}
            </span>
            {item.isAtRisk && item.stage !== 'completed' ? (
              <StatusChip tone="at_risk">At risk</StatusChip>
            ) : null}
            {item.stage === 'completed' ? <StatusChip tone="handled">Completed</StatusChip> : null}
          </div>

          <div className="mt-6 divide-y divide-border border-y border-border">
            {/* WHO owns it */}
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[12px] text-muted-foreground">Owner</span>
              {item.ownerName ? (
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  <PersonAvatar name={item.ownerName} /> {item.ownerName}
                </span>
              ) : (
                <span className="text-[13.5px] text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* WHEN is it due */}
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[12px] text-muted-foreground">Due</span>
              <span className="text-[13.5px] font-medium">{formatDue(item.dueAt)}</span>
            </div>

            {item.isWaiting ? (
              <div className="flex items-center justify-between py-3.5">
                <span className="text-[12px] text-muted-foreground">Waiting on</span>
                <span className="text-[13.5px] font-medium text-waiting">
                  {item.waitingFor ?? 'a reply'}
                </span>
              </div>
            ) : null}

            {item.providerName ? (
              <div className="flex items-center justify-between py-3.5">
                <span className="text-[12px] text-muted-foreground">Provider</span>
                <span className="text-[13.5px] font-medium">{item.providerName}</span>
              </div>
            ) : null}
          </div>

          {/* WHAT happens next */}
          {item.stage !== 'completed' ? (
            <div className="mt-6">
              <p className="text-[12px] text-muted-foreground">Next step</p>
              <p className="mt-1 text-[14px]">{item.nextStep ?? 'No next step recorded yet.'}</p>
            </div>
          ) : null}

          {/* Primary action */}
          {item.stage === 'completed' ? (
            <div className="mt-8 flex items-center gap-2 text-[13.5px] text-handled">
              <Check className="size-4" aria-hidden="true" /> Completed
            </div>
          ) : (
            <Button onClick={markComplete} disabled={isCompleting} className="mt-8 w-full">
              {isCompleting ? 'Marking complete…' : 'Mark complete'}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
