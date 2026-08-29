// @polsia:user-owned — deploy-time database seed. You OWN this file.
//
// seed() runs once when the server boots (via the framework-owned
// src/instrumentation.ts), on the Node server, AFTER the schema is applied. Use it
// for reference/lookup data your app needs to exist BEFORE the first request:
// plans, categories, feature defaults, a first admin row, etc. Read/write the DB
// through the Prisma singleton in @/lib/db (server startup — there is no request,
// so this does NOT go through /api).
//
// RULES — this runs on EVERY deploy/boot, possibly more than once, possibly on more
// than one instance at the same time:
//   1. Make every write IDEMPOTENT — upsert (`where` + `create` + `update`) or
//      `createMany({ ..., skipDuplicates: true })`, NEVER a bare `create`/`insert`.
//   2. Keep it fast and small — it runs before the server serves traffic.
//   3. NOT for recurring work (that's polsia.toml `[[crons]]`) or per-user/
//      request-time logic (that's an /api route handler). There is no request here.
//
// The template ships an empty seed (a no-op). Fill in the body when your app needs
// it; leave it empty to keep seeding off. Don't delete the file — instrumentation.ts
// imports it.
export async function seed(): Promise<void> {
  // Demo/development household — see src/lib/business/household.ts. No auth
  // module is installed yet, so this is the ONE household every anonymous
  // request reads/writes against; it is NOT production user data and must
  // never be presented as such (the /dashboard UI carries its own explicit
  // demo-mode notice). This is a SEPARATE dataset from the purely-visual
  // mock in src/components/custom/marketing/command-center-preview.tsx,
  // which never touches the database.
  const { prisma } = await import('@/lib/db');
  const { DEMO_HOUSEHOLD_NAME } = await import('@/lib/business/household');

  const household = await prisma.household.upsert({
    where: { name: DEMO_HOUSEHOLD_NAME },
    create: { name: DEMO_HOUSEHOLD_NAME },
    update: {},
  });

  const [dad, mom] = await Promise.all(
    [
      { displayName: 'Dad', role: 'Dad' },
      { displayName: 'Mom', role: 'Mom' },
      { displayName: 'Child', role: 'Child' },
    ].map((member) =>
      prisma.householdMember.upsert({
        where: {
          householdId_displayName: { householdId: household.id, displayName: member.displayName },
        },
        create: { ...member, householdId: household.id },
        update: { role: member.role },
      }),
    ),
  );
if (!dad || !mom) {
  throw new Error('Failed to create demo household members');
}
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // Provider get-or-create, mirroring src/lib/business/responsibility.ts's
  // resolveProviderId — kept inline here since seed.ts runs before any
  // request and shouldn't import route-adjacent business logic just for
  // this one lookup.
  const insurer = await prisma.provider.upsert({
    where: { name: 'Apex General Insurance' },
    create: { name: 'Apex General Insurance', domain: 'car' },
    update: {},
  });
  const broadband = await prisma.provider.upsert({
    where: { name: 'CityNet Broadband' },
    create: { name: 'CityNet Broadband', domain: 'home' },
    update: {},
  });
    if (!dad || !mom) {
  throw new Error('Failed to create demo household members');
}

  const demoResponsibilities = [
    {
      title: 'Car insurance renewal',
      description: 'Policy MH-02-8841 renewal quote of ₹18,400.',
      category: 'bill' as const,
      domain: 'car' as const,
      ownerId: dad!.id,
      providerId: insurer.id,
      stage: 'active' as const,
      priority: 3,
      nextStep: 'Review the renewal quote and confirm.',
      dueAt: daysFromNow(17),
      sourceType: 'manual_entry' as const,
    },
    {
      title: 'School consent form',
      description: 'Signature required for the field trip.',
      category: 'form' as const,
      domain: 'school' as const,
      ownerId: mom.id,
      stage: 'active' as const,
      priority: 3,
      nextStep: 'Sign and return the form.',
      dueAt: daysFromNow(1),
      sourceType: 'manual_entry' as const,
    },
    {
      title: 'Electricity payment',
      description: '₹4,820 due this cycle.',
      category: 'bill' as const,
      domain: 'home' as const,
      // Intentionally unassigned + active — demonstrates the
      // "unowned_and_active" risk rule and the matching Pulse highlight.
      ownerId: null,
      stage: 'active' as const,
      priority: 2,
      nextStep: 'Pay before the due date.',
      dueAt: daysFromNow(8),
      sourceType: 'manual_entry' as const,
    },
    {
      title: 'AC service appointment',
      description: 'Requested a service slot from the AC service centre.',
      category: 'appointment' as const,
      domain: 'home' as const,
      ownerId: mom.id,
      // Waiting is a CONDITION, not a stage (north-star correction) — stage
      // stays 'active' while waitingSince/waitingFor carry the condition.
      // waitingSince is backdated 6 days to demonstrate the
      // "waiting_too_long" at-risk rule (5-day threshold) and its matching
      // Pulse highlight in the seeded demo data.
      stage: 'active' as const,
      waitingFor: 'AC service centre',
      waitingSince: daysAgo(6),
      followUpAt: daysFromNow(1),
      priority: 2,
      nextStep: 'Follow up with the service centre.',
      dueAt: null,
      sourceType: 'manual_entry' as const,
    },
    {
      title: 'Internet renewal (Aug)',
      description: 'Annual plan renewed.',
      category: 'bill' as const,
      domain: 'home' as const,
      ownerId: dad.id,
      providerId: broadband.id,
      amount: 1200,
      stage: 'completed' as const,
      priority: 1,
      nextStep: null,
      dueAt: null,
      sourceType: 'manual_entry' as const,
    },
    {
      title: "Child's doctor appointment (Aug)",
      description: 'Routine check-up, confirmed and attended.',
      category: 'appointment' as const,
      domain: 'health' as const,
      ownerId: mom.id,
      stage: 'completed' as const,
      priority: 1,
      nextStep: null,
      dueAt: null,
      sourceType: 'manual_entry' as const,
    },
  ];

  for (const item of demoResponsibilities) {
    const { title, ...rest } = item;
    await prisma.responsibility.upsert({
      where: { householdId_title: { householdId: household.id, title } },
      create: {
        title,
        householdId: household.id,
        ...rest,
        completedAt: rest.stage === 'completed' ? new Date() : null,
      },
      update: {},
    });
  }
}
