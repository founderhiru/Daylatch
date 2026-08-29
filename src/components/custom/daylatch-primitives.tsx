// @polsia:user-owned — Daylatch-specific design primitives. These compose the
// existing shadcn baseline (Badge/Avatar/Button in src/components/ui/**) and
// the tokens declared in src/app/custom-style.css rather than duplicating a
// second component system. Ported in spirit from the Lovable reference
// (home-harmony-layer/src/components/daylatch/primitives.tsx) — see the
// migration analysis for the token-mapping rationale.
import { Slot } from '@radix-ui/react-slot';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Section({
  id,
  children,
  className,
  bare = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Skip the default hairline top-border + vertical rhythm (for hero/full-bleed sections). */
  bare?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(!bare && 'section border-t border-hairline', bare && 'py-0', className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'left',
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 font-display text-h2 tracking-tight text-balance">{title}</h2>
      {body ? <p className="mt-4 text-body leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}

/**
 * Household-responsibility status tones. `at_risk` is distinct from
 * `attention` — see src/lib/business/risk.ts for the deterministic rules that
 * produce it. Keep this union in sync with the Responsibility status/derived
 * risk vocabulary in src/lib/contracts/responsibility.ts.
 */
export type StatusTone = 'attention' | 'waiting' | 'handled' | 'at_risk' | 'neutral';

/**
 * The shared tone rule for a Responsibility, used consistently across Home,
 * Responsibility Detail, and Household. Kept here rather than duplicated per
 * page — this is presentation logic (which color a responsibility shows as),
 * not a domain rule; the actual at-risk/waiting computation lives server-side
 * in src/lib/business/risk.ts and arrives pre-computed on the contract.
 */
export function toneForResponsibility(item: {
  stage: string;
  isAtRisk: boolean;
  isWaiting: boolean;
}): StatusTone {
  if (item.stage === 'completed') return 'handled';
  if (item.isAtRisk) return 'at_risk';
  if (item.isWaiting) return 'waiting';
  if (item.stage === 'received' || item.stage === 'understood' || item.stage === 'assigned') {
    return 'attention';
  }
  return 'neutral';
}

const toneMap: Record<StatusTone, { dot: string; chip: string }> = {
  attention: { dot: 'bg-attention', chip: 'bg-attention-soft text-attention' },
  waiting: { dot: 'bg-waiting', chip: 'bg-waiting-soft text-waiting' },
  handled: { dot: 'bg-handled', chip: 'bg-handled-soft text-handled' },
  at_risk: { dot: 'bg-at-risk', chip: 'bg-at-risk-soft text-at-risk' },
  neutral: { dot: 'bg-muted-foreground', chip: 'bg-muted text-muted-foreground' },
};

export function StatusDot({ tone }: { tone: StatusTone }) {
  return <span className={cn('size-1.5 shrink-0 rounded-full', toneMap[tone].dot)} />;
}

export function StatusChip({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full border-transparent px-2.5 py-1 text-[11px] font-medium shadow-none',
        toneMap[tone].chip,
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function PersonAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Avatar className={cn('size-5 ring-1 ring-border', className)}>
      <AvatarFallback className="bg-secondary text-[9px] font-semibold text-secondary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Rounded, full-bleed marketing CTA. Wraps children in a <Slot> so it can
 * either render an in-page anchor or a Next.js <Link> per the nav
 * convention ("use <Button asChild> wrapping <Link>, never a raw styled <a>").
 * Usage: <CtaButton asChild><Link href="/try">Try Daylatch</Link></CtaButton>
 */
export function CtaButton({
  children,
  variant = 'primary',
  asChild = false,
  className,
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  asChild?: boolean;
  className?: string;
}) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-card hover:-translate-y-px hover:bg-primary/92'
          : 'border border-border bg-surface-raised text-foreground hover:border-foreground/25 hover:bg-secondary',
        className,
      )}
    >
      {children}
    </Comp>
  );
}
