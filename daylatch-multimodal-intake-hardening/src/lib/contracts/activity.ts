// @polsia:user-owned — shared zod contract for the Activity (household
// memory timeline) resource. Read-only from the client's perspective —
// activity entries are written by server-side business logic
// (src/lib/business/activity.ts) as a side effect of other mutations, never
// posted directly by a client.
import { z } from 'zod';

export const ActivityEventType = z.enum([
  'received',
  'understood',
  'assigned',
  'stage_changed',
  'owner_changed',
  'waiting_started',
  'waiting_ended',
  'note',
  'completed',
]);

export const ActivityItem = z.object({
  id: z.string(),
  householdId: z.string(),
  responsibilityId: z.string().nullable(),
  responsibilityTitle: z.string().nullable(),
  eventType: ActivityEventType,
  description: z.string(),
  createdAt: z.string().datetime({ offset: true }),
});

export const ActivityList = z.object({
  items: z.array(ActivityItem),
});

export type ActivityEventType = z.infer<typeof ActivityEventType>;
export type ActivityItem = z.infer<typeof ActivityItem>;
export type ActivityList = z.infer<typeof ActivityList>;
