// @polsia:user-owned — Daylatch's real dashboard. Everything here is driven
// by /api/* + apiFetch, per the existing data-plane rule (no Server
// Actions, no direct Prisma access from this client component). This is
// explicitly DEMO MODE: no auth module is installed yet, so every visitor
// sees the same single seeded household — see src/lib/business/household.ts.
// Do not remove the demo-mode notice below until a real auth module
// installs and this route is wired to a real session.
//
// North-star update: the header now leads with a deterministic HOUSEHOLD
// STATE sentence + specific highlights (from /api/pulse) instead of only a
// count — the goal is "what is happening in my household," not "here are my
// tasks." The existing four-group layout is preserved underneath it.
'use client';

import { AlertTriangle, CheckCircle2, Clock3, Sparkles, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PersonAvatar,
  StatusChip,
  StatusDot,
  type StatusTone,
  toneForResponsibility,
} from '@/components/custom/daylatch-primitives';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { type ActivityItem, ActivityList } from '@/lib/contracts/activity';
import { HouseholdItem } from '@/lib/contracts/household';
import { PulseSummary } from '@/lib/contracts/pulse';
import { ResponsibilityItem, ResponsibilityList } from '@/lib/contracts/responsibility';
import { cn } from '@/lib/utils';

const DOMAIN_LABEL: Record<ResponsibilityItem['domain'], string> = {
  car: 'Car',
  school: 'School',
  health: 'Health',
  home: 'Home',
  finance: 'Finance',
  travel: 'Travel',
  other: 'Other',
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function OwnerControl({
  item,
  members,
  onChanged,
}: {
  item: ResponsibilityItem;
  members: HouseholdItem['members'];
  onChanged: (updated: ResponsibilityItem) => void;
}) {
  const assign = async (ownerId: string | null) => {
    try {
      const updated = await apiFetch<ResponsibilityItem>(`/api/responsibilities/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ownerId }),
        schema: ResponsibilityItem,
      });
      onChanged(updated);
      toast.success(ownerId ? 'Owner updated.' : 'Marked unassigned.');
    } catch {
      toast.error('Could not update the owner right now.');
    }
  };

  return (
    <Select
      value={item.ownerId ?? 'unassigned'}
      onValueChange={(v) => assign(v === 'unassigned' ? null : v)}
    >
      <SelectTrigger className="h-7 w-[132px] border-none bg-transparent px-2 text-[11.5px] shadow-none">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** WHAT / WHO / WHEN / STATE / NEXT STEP up front; WAITING FOR, FOLLOW-UP,
 * AT RISK, SOURCE, DOMAIN, PROVIDER only render when actually present —
 * progressive disclosure rather than a cluttered fixed card shape. */
function ResponsibilityRow({
  item,
  members,
  onChanged,
}: {
  item: ResponsibilityItem;
  members: HouseholdItem['members'];
  onChanged: (updated: ResponsibilityItem) => void;
}) {
  const tone = toneForResponsibility(item);
  const due = formatDate(item.dueAt);
  const followUp = formatDate(item.followUpAt);

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border/70 bg-surface-raised p-3.5">
      <span className="mt-1.5">
        <StatusDot tone={tone} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-medium">{item.title}</p>
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {DOMAIN_LABEL[item.domain]}
          </span>
          {item.isAtRisk && item.stage !== 'completed' ? (
            <StatusChip tone="at_risk">At risk</StatusChip>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {item.nextStep ?? 'No next step recorded yet.'}
          {due ? ` · Due ${due}` : ''}
          {item.providerName ? ` · ${item.providerName}` : ''}
        </p>
        {item.isWaiting ? (
          <p className="mt-1 text-[11.5px] text-waiting">
            Waiting on {item.waitingFor ?? 'a reply'}
            {followUp ? ` · Follow up ${followUp}` : ''}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        {item.ownerName ? <PersonAvatar name={item.ownerName} /> : null}
        <OwnerControl item={item} members={members} onChanged={onChanged} />
      </div>
    </div>
  );
}

/** Lighter-weight row for the mobile HOME list — same data, same
 * StatusDot/OwnerControl/PersonAvatar as the desktop ResponsibilityRow, but
 * a plain divider instead of a bordered card box, per "avoid excessive
 * borders/cards" for the mobile product surface. */
function MobileResponsibilityRow({
  item,
  members,
  onChanged,
}: {
  item: ResponsibilityItem;
  members: HouseholdItem['members'];
  onChanged: (updated: ResponsibilityItem) => void;
}) {
  const tone = toneForResponsibility(item);
  const due = formatDate(item.dueAt);

  return (
    <div className="flex items-start gap-3 border-b border-border/50 py-3 last:border-0">
      <span className="mt-1.5">
        <StatusDot tone={tone} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/responsibilities/${item.id}`} className="block">
          <p className="truncate text-[13.5px] font-medium">{item.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {item.nextStep ?? 'No next step recorded yet.'}
            {due ? ` · Due ${due}` : ''}
          </p>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.ownerName ? <PersonAvatar name={item.ownerName} /> : null}
        <OwnerControl item={item} members={members} onChanged={onChanged} />
      </div>
    </div>
  );
}

/** A priority bucket on the mobile HOME list. Renders nothing when empty —
 * an empty section header would just add visual noise ("less information,
 * better organized"). */
function MobileHomeSection({
  title,
  tone,
  items,
  members,
  onChanged,
}: {
  title: string;
  tone: StatusTone;
  items: ResponsibilityItem[];
  members: HouseholdItem['members'];
  onChanged: (updated: ResponsibilityItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-foreground uppercase">
        <StatusDot tone={tone} /> {title}
      </p>
      <div className="mt-1">
        {items.map((item) => (
          <MobileResponsibilityRow
            key={item.id}
            item={item}
            members={members}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}

function GroupCard({
  title,
  tone,
  items,
  members,
  emptyLabel,
  onChanged,
}: {
  title: string;
  tone: StatusTone;
  items: ResponsibilityItem[];
  members: HouseholdItem['members'];
  emptyLabel: string;
  onChanged: (updated: ResponsibilityItem) => void;
}) {
  return (
    <Card className="border-border/80 bg-surface-raised shadow-card">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <StatusDot tone={tone} /> {title}
        </CardTitle>
        <Badge variant="outline" className="rounded-full text-[11px]">
          {items.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          items.map((item) => (
            <ResponsibilityRow key={item.id} item={item} members={members} onChanged={onChanged} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PulseTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: StatusTone;
}) {
  const badgeClass: Record<StatusTone, string> = {
    attention: 'bg-attention-soft text-attention',
    waiting: 'bg-waiting-soft text-waiting',
    handled: 'bg-handled-soft text-handled',
    at_risk: 'bg-at-risk-soft text-at-risk',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          badgeClass[tone],
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-xl font-semibold tracking-tight">{value}</p>
        <p className="text-[11.5px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Deterministic, data-derived household-state sentence — never a canned
 * string. Mirrors the counts already computed server-side in Pulse. */
function householdStateSentence(pulse: PulseSummary): string {
  const total = pulse.attentionCount + pulse.waitingCount + pulse.atRiskCount;
  if (total === 0) {
    return 'Your household is fully on track.';
  }
  if (pulse.atRiskCount > 0) {
    return `Your household needs a look — ${pulse.atRiskCount} ${pulse.atRiskCount === 1 ? 'thing is' : 'things are'} at risk.`;
  }
  return 'Your household is mostly on track.';
}

export default function DashboardPage() {
  const [household, setHousehold] = useState<HouseholdItem | null>(null);
  const [pulse, setPulse] = useState<PulseSummary | null>(null);
  const [responsibilities, setResponsibilities] = useState<ResponsibilityItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(false);
    try {
      const [householdRes, pulseRes, responsibilitiesRes, activityRes] = await Promise.all([
        apiFetch('/api/household', { schema: HouseholdItem }),
        apiFetch('/api/pulse', { schema: PulseSummary }),
        apiFetch('/api/responsibilities', { schema: ResponsibilityList }),
        apiFetch('/api/activity', { schema: ActivityList }),
      ]);
      setHousehold(householdRes);
      setPulse(pulseRes);
      setResponsibilities(responsibilitiesRes.items);
      setActivity(activityRes.items);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleChanged = (updated: ResponsibilityItem) => {
    setResponsibilities((current) => current.map((r) => (r.id === updated.id ? updated : r)));
    // Owner/stage/waiting changes can shift pulse counts, highlights, and
    // at-risk membership — re-derive from the server rather than
    // approximating client-side.
    apiFetch('/api/pulse', { schema: PulseSummary })
      .then(setPulse)
      .catch(() => undefined);
  };

  const needsAttention = responsibilities.filter(
    (r) => r.stage !== 'completed' && !r.isWaiting && (r.isAtRisk || r.stage !== 'active'),
  );
  const waiting = responsibilities.filter((r) => r.isWaiting);
  const upcoming = responsibilities.filter(
    (r) => r.stage === 'active' && !r.isAtRisk && !r.isWaiting,
  );
  const recentlyHandled = responsibilities
    .filter((r) => r.stage === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // --- Mobile HOME priority buckets (Phase 1.2) ---
  // Presentation-only re-slicing of the SAME `responsibilities` array above —
  // no new API call, no new domain rule. Mutually exclusive and evaluated in
  // priority order (overdue first) so a mobile visitor sees one clean list
  // instead of the four-column desktop grid. "Things needing the current
  // user" is intentionally NOT implemented: there is no authenticated user
  // yet (see the demo-mode notice below), and faking one would misattribute
  // ownership — this section returns once a real auth module exists.
  const isOverdue = (r: ResponsibilityItem) =>
    r.stage !== 'completed' && r.dueAt !== null && new Date(r.dueAt).getTime() < Date.now();
  const mobileOverdue = responsibilities.filter((r) => isOverdue(r));
  const mobileUnassigned = responsibilities.filter(
    (r) => r.stage !== 'completed' && r.ownerId === null && !isOverdue(r),
  );
  const mobileNeedsAttention = needsAttention.filter((r) => !isOverdue(r) && !(r.ownerId === null));
  const mobileUpcoming = upcoming;
  const mobileWaiting = waiting;

  const members = household?.members ?? [];

  return (
    <main className="container-page section-lg mx-auto">
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-[12.5px] text-primary">
        <strong className="font-semibold">Demo mode.</strong> No authentication is installed yet, so
        this shows one shared demo household ({household?.name ?? 'loading…'}), not a private
        account. Everything below is real, persisted data — just not access-controlled yet.
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] text-muted-foreground">Good afternoon</p>
          <h1 className="mt-1 font-display text-h3 tracking-tight">
            {isLoading
              ? 'Loading your household…'
              : pulse
                ? householdStateSentence(pulse)
                : 'Household state unavailable.'}
          </h1>
          {!isLoading && pulse && pulse.highlights.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {pulse.highlights.map((h) => (
                <li key={h} className="text-[12.5px] text-muted-foreground">
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {members.map((m) => (
            <PersonAvatar key={m.id} name={m.displayName} className="size-8" />
          ))}
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load the household dashboard. This usually means the database isn't reachable in
          this environment yet (no <code>DATABASE_URL</code> or migrations not applied) — see the
          implementation notes for how to finish setup.
        </p>
      ) : isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {['pulse-1', 'pulse-2', 'pulse-3', 'pulse-4', 'pulse-5'].map((key) => (
            <Skeleton key={key} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 hidden gap-3 sm:grid-cols-2 md:grid lg:grid-cols-5">
            <PulseTile
              icon={AlertTriangle}
              label="Needs attention"
              value={pulse?.attentionCount ?? 0}
              tone="attention"
            />
            <PulseTile
              icon={Clock3}
              label="Waiting"
              value={pulse?.waitingCount ?? 0}
              tone="waiting"
            />
            <PulseTile
              icon={Sparkles}
              label="Upcoming"
              value={pulse?.upcomingCount ?? 0}
              tone="neutral"
            />
            <PulseTile
              icon={AlertTriangle}
              label="At risk"
              value={pulse?.atRiskCount ?? 0}
              tone="at_risk"
            />
            <PulseTile
              icon={CheckCircle2}
              label="Completed"
              value={pulse?.completedCount ?? 0}
              tone="handled"
            />
          </div>

          {/* Mobile HOME: a single, priority-ordered list (Phase 1.2) — see
              the bucket computation above. Hidden at md+ where the existing,
              already-approved four-column grid below takes over unchanged. */}
          <div className="mt-6 space-y-5 md:hidden">
            <MobileHomeSection
              title="Overdue"
              tone="at_risk"
              items={mobileOverdue}
              members={members}
              onChanged={handleChanged}
            />
            <MobileHomeSection
              title="Unassigned"
              tone="attention"
              items={mobileUnassigned}
              members={members}
              onChanged={handleChanged}
            />
            <MobileHomeSection
              title="Needs attention"
              tone="attention"
              items={mobileNeedsAttention}
              members={members}
              onChanged={handleChanged}
            />
            <MobileHomeSection
              title="Upcoming"
              tone="neutral"
              items={mobileUpcoming}
              members={members}
              onChanged={handleChanged}
            />
            <MobileHomeSection
              title="Waiting"
              tone="waiting"
              items={mobileWaiting}
              members={members}
              onChanged={handleChanged}
            />
            {responsibilities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12.5px] text-muted-foreground">
                Nothing here yet — tap “+” to add something to your household.
              </p>
            ) : null}
          </div>

          <div className="mt-6 hidden gap-4 md:grid lg:grid-cols-2">
            <GroupCard
              title="Needs attention"
              tone="attention"
              items={needsAttention}
              members={members}
              emptyLabel="Nothing needs a decision right now."
              onChanged={handleChanged}
            />
            <GroupCard
              title="Waiting"
              tone="waiting"
              items={waiting}
              members={members}
              emptyLabel="Not waiting on anyone right now."
              onChanged={handleChanged}
            />
            <GroupCard
              title="Upcoming"
              tone="neutral"
              items={upcoming}
              members={members}
              emptyLabel="Nothing scheduled ahead yet."
              onChanged={handleChanged}
            />
            <GroupCard
              title="Recently handled"
              tone="handled"
              items={recentlyHandled}
              members={members}
              emptyLabel="Nothing completed yet."
              onChanged={handleChanged}
            />
          </div>

          <Card className="mt-6 hidden border-border/80 bg-surface-raised shadow-card md:block">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
                <UserRound className="size-3.5" aria-hidden="true" /> Household memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex gap-3 text-[12.5px]">
                      <span className="w-16 shrink-0 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>
                        {entry.description}
                        {entry.responsibilityTitle ? (
                          <span className="text-muted-foreground">
                            {' '}
                            — {entry.responsibilityTitle}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
