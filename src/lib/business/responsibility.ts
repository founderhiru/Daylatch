// @polsia:user-owned — server-only Responsibility domain logic: mapping
// Prisma rows to the shared Zod contract, CRUD helpers, provider
// get-or-create, deterministic waiting transitions, and the
// intake-confirmation -> Responsibility bridge. Route handlers under
// src/app/api/responsibilities/** call these; they never talk to Prisma
// directly.
import 'server-only';
import { logActivity } from '@/lib/business/activity';
import { computeIsAtRisk } from '@/lib/business/risk';
import type { IntakeConfirm } from '@/lib/contracts/intake-to-responsibility';
import type {
  ResponsibilityCategory,
  ResponsibilityCreate,
  ResponsibilityDomain,
  ResponsibilityItem,
  ResponsibilitySourceType,
  ResponsibilityStage,
  ResponsibilityUpdate,
} from '@/lib/contracts/responsibility';
import { prisma } from '@/lib/db';

/**
 * Row shape consumed by {@link toResponsibilityItem}, spelled out explicitly
 * rather than imported from `@prisma/client` so this module type-checks even
 * before `prisma generate` has produced the real model types (see the
 * implementation notes on the sandboxed build environment). Field-for-field
 * matches the `Responsibility` model in prisma/schema/household.prisma; once
 * generated, the real Prisma row type is structurally compatible with this.
 */
export interface ResponsibilityRow {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  category: ResponsibilityCategory;
  domain: ResponsibilityDomain;
  ownerId: string | null;
  owner: { displayName: string } | null;
  providerId: string | null;
  provider: { name: string } | null;
  stage: ResponsibilityStage;
  priority: number;
  nextStep: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  amount: unknown; // Prisma.Decimal once generated — normalized in toResponsibilityItem
  waitingFor: string | null;
  waitingSince: Date | null;
  followUpAt: Date | null;
  sourceType: ResponsibilitySourceType;
  sourceReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Normalizes a Prisma `Decimal | number | string | null` into a plain
 * number for the wire contract, or null. Written defensively since the
 * exact runtime shape of `amount` depends on the generated Prisma client. */
function toAmountNumber(amount: unknown): number | null {
  if (amount === null || amount === undefined) return null;
  if (typeof amount === 'number') return amount;
  // Prisma.Decimal and similar wrapper types implement toString(); avoid a
  // hard dependency on the generated Decimal class.
  const parsed = Number(String(amount));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Maps a Prisma row (with `owner`/`provider` included) to the wire contract shape. */
export function toResponsibilityItem(
  row: ResponsibilityRow,
  now: Date = new Date(),
): ResponsibilityItem {
  return {
    id: row.id,
    householdId: row.householdId,
    title: row.title,
    description: row.description,
    category: row.category,
    domain: row.domain,
    ownerId: row.ownerId,
    ownerName: row.owner?.displayName ?? null,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    stage: row.stage,
    priority: row.priority,
    nextStep: row.nextStep,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    amount: toAmountNumber(row.amount),
    isWaiting: row.waitingSince !== null,
    waitingFor: row.waitingFor,
    waitingSince: row.waitingSince ? row.waitingSince.toISOString() : null,
    followUpAt: row.followUpAt ? row.followUpAt.toISOString() : null,
    isAtRisk: computeIsAtRisk(
      { stage: row.stage, dueAt: row.dueAt, ownerId: row.ownerId, waitingSince: row.waitingSince },
      now,
    ),
    sourceType: row.sourceType,
    sourceReference: row.sourceReference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const RESPONSIBILITY_INCLUDE = {
  owner: { select: { displayName: true } },
  provider: { select: { name: true } },
} as const;

/** Get-or-create a Provider by name. Never a CRM — just enough to link a
 * responsibility to a consistent provider identity for future memory
 * queries ("what provider did we use?"). */
async function resolveProviderId(providerName: string | undefined | null): Promise<string | null> {
  if (!providerName) return null;
  const provider = await prisma.provider.upsert({
    where: { name: providerName },
    create: { name: providerName },
    update: {},
  });
  return provider.id;
}

export async function listResponsibilities(householdId: string): Promise<ResponsibilityItem[]> {
  const rows: ResponsibilityRow[] = await prisma.responsibility.findMany({
    where: { householdId },
    include: RESPONSIBILITY_INCLUDE,
    orderBy: [{ stage: 'asc' }, { dueAt: 'asc' }],
  });
  const now = new Date();
  return rows.map((row) => toResponsibilityItem(row, now));
}

export async function createResponsibility(
  householdId: string,
  input: ResponsibilityCreate,
): Promise<ResponsibilityItem> {
  const providerId = await resolveProviderId(input.providerName);

  const created: ResponsibilityRow = await prisma.responsibility.create({
    data: {
      householdId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      domain: input.domain,
      ownerId: input.ownerId ?? null,
      providerId,
      priority: input.priority,
      nextStep: input.nextStep ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      amount: input.amount ?? null,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference ?? null,
      stage: 'received',
    },
    include: RESPONSIBILITY_INCLUDE,
  });

  await logActivity({
    householdId,
    responsibilityId: created.id,
    eventType: 'received',
    description: `"${created.title}" was added to the household.`,
  });

  return toResponsibilityItem(created);
}

/**
 * Plain update-data shape for `prisma.responsibility.update`, spelled out
 * explicitly rather than using the generated `Prisma.ResponsibilityUpdateInput`
 * namespace member (unavailable before `prisma generate` runs — see the
 * module header). Structurally compatible with the real generated type.
 */
interface ResponsibilityUpdateData {
  title?: string;
  description?: string | null;
  category?: ResponsibilityCategory;
  domain?: ResponsibilityDomain;
  priority?: number;
  nextStep?: string | null;
  dueAt?: Date | null;
  amount?: number | null;
  stage?: ResponsibilityStage;
  completedAt?: Date;
  owner?: { connect: { id: string } } | { disconnect: true };
  provider?: { connect: { id: string } } | { disconnect: true };
  waitingFor?: string | null;
  waitingSince?: Date | null;
  followUpAt?: Date | null;
}

export async function updateResponsibility(
  householdId: string,
  responsibilityId: string,
  input: ResponsibilityUpdate,
): Promise<ResponsibilityItem | null> {
  const existing: {
    stage: ResponsibilityStage;
    ownerId: string | null;
    waitingSince: Date | null;
  } | null = await prisma.responsibility.findFirst({
    where: { id: responsibilityId, householdId },
    select: { stage: true, ownerId: true, waitingSince: true },
  });
  if (!existing) return null;

  const data: ResponsibilityUpdateData = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.category !== undefined) data.category = input.category;
  if (input.domain !== undefined) data.domain = input.domain;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.nextStep !== undefined) data.nextStep = input.nextStep;
  if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.stage !== undefined) {
    data.stage = input.stage;
    if (input.stage === 'completed') data.completedAt = new Date();
  }
  if (input.ownerId !== undefined) {
    data.owner = input.ownerId ? { connect: { id: input.ownerId } } : { disconnect: true };
  }
  if (input.providerName !== undefined) {
    const providerId = await resolveProviderId(input.providerName ?? undefined);
    data.provider = providerId ? { connect: { id: providerId } } : { disconnect: true };
  }

  // Deterministic waiting transition — the ONLY place waitingSince is ever
  // written. Entering waiting (false/absent -> true) stamps `now`;
  // unrelated edits in the same request never touch it. Leaving waiting
  // (true -> false) clears the whole group atomically so no stale
  // waitingFor/followUpAt can linger once the condition ends.
  const wasWaiting = existing.waitingSince !== null;
  if (input.isWaiting === true && !wasWaiting) {
    data.waitingSince = new Date();
    if (input.waitingFor !== undefined) data.waitingFor = input.waitingFor;
    if (input.followUpAt !== undefined)
      data.followUpAt = input.followUpAt ? new Date(input.followUpAt) : null;
  } else if (input.isWaiting === false && wasWaiting) {
    data.waitingSince = null;
    data.waitingFor = null;
    data.followUpAt = null;
  } else if (wasWaiting) {
    // Already waiting and not being toggled off — allow refining
    // waitingFor/followUpAt without resetting waitingSince.
    if (input.waitingFor !== undefined) data.waitingFor = input.waitingFor;
    if (input.followUpAt !== undefined)
      data.followUpAt = input.followUpAt ? new Date(input.followUpAt) : null;
  }

  const updated: ResponsibilityRow = await prisma.responsibility.update({
    where: { id: responsibilityId },
    data,
    include: RESPONSIBILITY_INCLUDE,
  });

  // Log the specific, human-readable change rather than a generic "updated"
  // entry — this is what makes the activity timeline actually useful.
  if (input.stage !== undefined && input.stage !== existing.stage) {
    await logActivity({
      householdId,
      responsibilityId,
      eventType: input.stage === 'completed' ? 'completed' : 'stage_changed',
      description: `Stage changed from "${existing.stage}" to "${input.stage}".`,
    });
  }
  if (input.ownerId !== undefined && input.ownerId !== existing.ownerId) {
    await logActivity({
      householdId,
      responsibilityId,
      eventType: 'owner_changed',
      description: input.ownerId
        ? `Owner changed to ${updated.owner?.displayName ?? 'a household member'}.`
        : 'Owner removed — now unassigned.',
    });
  }
  if (input.isWaiting === true && !wasWaiting) {
    await logActivity({
      householdId,
      responsibilityId,
      eventType: 'waiting_started',
      description: input.waitingFor ? `Now waiting on ${input.waitingFor}.` : 'Marked as waiting.',
    });
  } else if (input.isWaiting === false && wasWaiting) {
    await logActivity({
      householdId,
      responsibilityId,
      eventType: 'waiting_ended',
      description: 'No longer waiting.',
    });
  }

  return toResponsibilityItem(updated);
}

/**
 * Paste -> AI understands -> user reviews -> user explicitly confirms
 * (including domain, and optionally owner/provider) -> Daylatch saves.
 * Called only from the confirmation endpoint, never automatically from the
 * intake extraction itself — the AI's raw output is never persisted without
 * this explicit step.
 */
export async function createResponsibilityFromIntake(
  householdId: string,
  confirm: IntakeConfirm,
): Promise<ResponsibilityItem> {
  const missing =
    confirm.missingInformation.length > 0
      ? `\n\nStill needed: ${confirm.missingInformation.join('; ')}.`
      : '';
  // The free-text `deadline` is preserved in the description rather than
  // parsed into `dueAt` — see the contract's comment on why an unparsed
  // phrase like "next Tuesday" is not safely convertible to a firm date.
  const deadlineNote = confirm.deadline ? `\n\nMentioned deadline: ${confirm.deadline}.` : '';

  const providerId = await resolveProviderId(confirm.providerName);

  const created: ResponsibilityRow = await prisma.responsibility.create({
    data: {
      householdId,
      title: confirm.summary.slice(0, 120),
      description: `${confirm.summary}${deadlineNote}${missing}`,
      category: confirm.category,
      domain: confirm.domain,
      ownerId: confirm.ownerId ?? null,
      providerId,
      nextStep: confirm.nextStep,
      sourceType: 'pasted_text',
      stage: 'understood',
    },
    include: RESPONSIBILITY_INCLUDE,
  });

  await logActivity({
    householdId,
    responsibilityId: created.id,
    eventType: 'understood',
    description: `Daylatch understood a pasted message as "${created.title}".`,
  });

  return toResponsibilityItem(created);
}
