// @polsia:user-owned — the Activity view (Phase 1.6): a simple chronological
// household history. Reuses GET /api/activity exactly as-is — no new API
// route, no new contract, no backend change. Deliberately lightweight, per
// "do not build an elaborate audit system UI."
'use client';

import { CheckCircle2, Clock3, FileText, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { type ActivityItem, ActivityList } from '@/lib/contracts/activity';

/** Small icon per event category — just enough to scan quickly, not a full
 * audit-log iconography system. */
const EVENT_ICON: Record<ActivityItem['eventType'], typeof Clock3> = {
  received: FileText,
  understood: FileText,
  assigned: UserRound,
  owner_changed: UserRound,
  stage_changed: Clock3,
  waiting_started: Clock3,
  waiting_ended: Clock3,
  note: FileText,
  completed: CheckCircle2,
};

function formatDay(createdAt: string): string {
  const date = new Date(createdAt);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActivityRow({ entry }: { entry: ActivityItem }) {
  const Icon = EVENT_ICON[entry.eventType];
  const body = (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <p className="text-[13px] leading-snug">
        {entry.description}
        {entry.responsibilityTitle && !entry.description.includes(entry.responsibilityTitle) ? (
          <span className="text-muted-foreground"> — {entry.responsibilityTitle}</span>
        ) : null}
      </p>
    </div>
  );

  if (entry.responsibilityId) {
    return (
      <Link href={`/responsibilities/${entry.responsibilityId}`} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    apiFetch('/api/activity', { schema: ActivityList })
      .then((result) => setItems(result.items))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  // Group into day buckets, preserving the server's newest-first order.
  const groups: { day: string; entries: ActivityItem[] }[] = [];
  for (const item of items) {
    const day = formatDay(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.entries.push(item);
    } else {
      groups.push({ day, entries: [item] });
    }
  }

  return (
    <main className="container-page mx-auto max-w-lg py-8 pb-28 md:pb-8">
      <h1 className="font-display text-h4 tracking-tight">Activity</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">What's happened in your household.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : loadError ? (
          <p className="text-[13px] text-muted-foreground">Could not load activity right now.</p>
        ) : items.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nothing has happened yet.</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.day}>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.day}
                </p>
                <div className="mt-2 divide-y divide-border/50">
                  {group.entries.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
