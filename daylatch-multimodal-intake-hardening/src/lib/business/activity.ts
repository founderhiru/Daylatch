// @polsia:user-owned — server-only activity ("household memory") logging.
// Deliberately a flat append-only log (Part 13 of the phase-2 brief: no
// event-sourcing architecture) — callers write one row per notable change.
import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { ActivityEventType } from '@/lib/contracts/activity';
import { prisma } from '@/lib/db';

// Accepts either the top-level prisma client or a transaction client so
// callers can log activity in the same transaction as the mutation it
// describes (e.g. status change + activity row committed together).
type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export interface LogActivityInput {
  householdId: string;
  responsibilityId?: string | null;
  /// Uses the zod-inferred contract type (not the generated Prisma enum) so
  /// this module type-checks even before `prisma generate` has produced the
  /// real model types — see prisma/schema/household.prisma's ActivityEventType
  /// enum, which is kept in sync BY HAND with this one.
  eventType: ActivityEventType;
  description: string;
}

export async function logActivity(input: LogActivityInput, client: PrismaOrTx = prisma) {
  return client.activity.create({
    data: {
      householdId: input.householdId,
      responsibilityId: input.responsibilityId ?? null,
      eventType: input.eventType,
      description: input.description,
    },
  });
}

export interface ActivityRow {
  id: string;
  householdId: string;
  responsibilityId: string | null;
  responsibilityTitle: string | null;
  eventType: ActivityEventType;
  description: string;
  createdAt: string;
}

/** Most recent activity for a household, newest first, capped for the UI. */
export async function listRecentActivity(householdId: string, limit = 30): Promise<ActivityRow[]> {
  const rows = await prisma.activity.findMany({
    where: { householdId },
    include: { responsibility: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map(
    (row: {
      id: string;
      householdId: string;
      responsibilityId: string | null;
      responsibility: { title: string } | null;
      eventType: ActivityEventType;
      description: string;
      createdAt: Date;
    }) => ({
      id: row.id,
      householdId: row.householdId,
      responsibilityId: row.responsibilityId,
      responsibilityTitle: row.responsibility?.title ?? null,
      eventType: row.eventType,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
    }),
  );
}
