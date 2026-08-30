// @polsia:user-owned — marketing-only visual. Illustrative only — no
// Household/Responsibility data is read here. Field names deliberately mirror
// src/lib/contracts/responsibility.ts so this mock and the real
// /dashboard (src/app/(custom)/dashboard/page.tsx) stay conceptually aligned,
// but this component must never be wired to /api/* — see migration analysis
// §12 (mock/demo data strategy).
import { cn } from '@/lib/utils';
import { PersonAvatar, StatusDot, type StatusTone } from '../daylatch-primitives';

type PreviewItem = {
  title: string;
  meta: string;
  owner?: string;
  status?: string;
};

function Row({ item, tone, muted }: { item: PreviewItem; tone: StatusTone; muted?: boolean }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/70">
      <span className="mt-1.5">
        <StatusDot tone={tone} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[13px] font-medium',
            muted ? 'text-muted-foreground line-through decoration-border' : 'text-foreground',
          )}
        >
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{item.meta}</p>
      </div>
      {item.owner ? (
        <span className="flex items-center gap-1.5 pt-0.5">
          <PersonAvatar name={item.owner} />
          <span className="hidden text-[11px] text-muted-foreground sm:inline">{item.owner}</span>
        </span>
      ) : null}
      {item.status ? (
        <span className="hidden pt-0.5 text-[11px] text-muted-foreground sm:inline">
          {item.status}
        </span>
      ) : null}
    </div>
  );
}

export function CommandCenterPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-float',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/80 bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-[5px] bg-primary" />
          <span className="text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase">
            Daylatch
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <PersonAvatar name="Mom" />
          <PersonAvatar name="Dad" />
          <PersonAvatar name="Ira" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-4 md:px-6">
        <p className="text-[12.5px] text-muted-foreground">Good afternoon</p>
        <h3 className="mt-1 font-display text-xl leading-snug font-semibold tracking-tight md:text-2xl">
          Your household has 5 things that need attention.
        </h3>

        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between px-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-foreground uppercase">
                <StatusDot tone="attention" /> Needs attention
              </p>
            </div>
            <div className="mt-1 divide-y divide-border/60">
              <Row
                tone="attention"
                item={{
                  title: 'School consent form',
                  meta: 'Due tomorrow · Signature required',
                  owner: 'Mom',
                }}
              />
              <Row
                tone="attention"
                item={{ title: 'Electricity bill', meta: '₹4,820 · Due Sep 5', owner: 'Dad' }}
              />
              <Row
                tone="attention"
                item={{
                  title: 'Car insurance renewal',
                  meta: '₹18,400 · Sep 14 · Needs decision',
                  owner: 'Dad',
                }}
              />
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 px-3 text-[11px] font-semibold tracking-wide text-foreground uppercase">
              <StatusDot tone="waiting" /> Waiting
            </p>
            <div className="mt-1 divide-y divide-border/60">
              <Row
                tone="waiting"
                item={{
                  title: 'Insurance provider',
                  meta: 'Response expected Sep 3',
                  status: 'Following up',
                }}
              />
              <Row
                tone="waiting"
                item={{
                  title: 'AC service appointment',
                  meta: 'Confirmation pending',
                  status: 'Chased once',
                }}
              />
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 px-3 text-[11px] font-semibold tracking-wide text-foreground uppercase">
              <StatusDot tone="handled" /> Recently handled
            </p>
            <div className="mt-1 divide-y divide-border/60">
              <Row tone="handled" muted item={{ title: 'School fee', meta: 'Paid Aug 22' }} />
              <Row
                tone="handled"
                muted
                item={{ title: 'Doctor appointment', meta: 'Confirmed for Aug 30' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/80 bg-surface px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 rounded-full border border-dashed border-input px-4 py-2.5">
          <span className="text-base leading-none text-primary">＋</span>
          <span className="text-[12.5px] text-muted-foreground">Send something to Daylatch</span>
        </div>
      </div>
    </div>
  );
}
