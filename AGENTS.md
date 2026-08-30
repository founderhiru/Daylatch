# AGENTS.md — Daylatch

Read this before making changes. It describes what this repository actually
is today — not a template, not a Polsia-governed app. If anything here
conflicts with what you find in the code, the code wins; update this file.

## What Daylatch is

Daylatch is "the operating layer for your household" — a Next.js app that
turns pasted messages, bills, photos, and notes into organized, assigned
household responsibilities, using Claude for the understanding step.

## Stack (current, real)

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- Prisma 6 against standard PostgreSQL (Supabase in production; any Postgres
  works locally — see `.env.example`)
- Anthropic API (`@anthropic-ai/sdk`) called directly and exclusively from
  `src/lib/ai/client.ts` (server-only) — never call the SDK from anywhere
  else, and never expose `ANTHROPIC_API_KEY` to client code
- Vercel for hosting, no other infrastructure
- Biome (lint/format), Vitest (unit tests)

**Polsia is not part of this project.** There is no `.polsia/` directory, no
module system, no ownership-tier gate, no `.polsia/installed.json`. An
earlier version of this repo was built on the Polsia template and later
migrated off it — a few source comments still say "Polsia" as migration
history (e.g. `src/lib/ai/client.ts` noting it replaced Polsia's AI proxy);
those are historical notes, not live governance. Do not reintroduce Polsia,
and do not treat any surviving "Polsia" comment as an active instruction.

## Architecture rules that actually hold

- **No Server Actions.** All mutations go through `/api/*` route handlers.
  Client pages call them via `apiFetch` (`src/lib/api-client.ts`), passing a
  shared Zod schema from `src/lib/contracts/` to validate the response at
  runtime.
- **Contracts are the source of truth for wire shapes.** `src/lib/contracts/`
  holds Zod schemas imported by both client and server code — keep these
  modules client-importable (no `server-only` import, no `@prisma/client`
  import in them).
- **Business logic lives in `src/lib/business/`**, is `server-only`, and is
  the only code that talks to Prisma. Route handlers call business-logic
  functions; they don't query Prisma directly.
- **Deterministic logic is kept separate from I/O** so it can be unit-tested
  without a database or an LLM. Example: `src/lib/business/pulse-rules.ts`
  (pure counts/highlights) vs. `src/lib/business/pulse.ts` (the Prisma
  query that feeds it). Follow this split for new business logic.
- **AI is called through one abstraction**, `src/lib/ai/client.ts`
  (`chat`, `streamChat`, `generateObject`, `analyzeImage`). No UI or route
  handler talks to the Anthropic SDK directly — this is what keeps a future
  provider swap or model change a one-file edit.
- **AI output is never trusted without validation.** Every AI response gets
  parsed against a Zod contract (e.g. `IntakeResult.parse(...)`) before use.
  Unknown/uncertain values should come back as `null`, not fabricated —
  extraction prompts should explicitly instruct this and schemas should
  accept `null` for genuinely optional fields.
- **AI proposes, a human confirms, then the app persists.** Nothing from an
  AI extraction call is saved automatically — see the `/api/intake` →
  review UI → `/api/intake/confirm` flow.

## No authentication yet

There is no auth system in this repo — no session, no login, no
`NextAuth`/Supabase-Auth client, nothing. Every request resolves to a single
hardcoded demo household (`getDemoHousehold()` in
`src/lib/business/household.ts`), seeded idempotently on server boot
(`src/lib/seed.ts`, run once via `src/instrumentation.ts`). This is
deliberate "demo mode," not an oversight — the `/dashboard` UI carries a
visible notice about it. When real auth is added, `getDemoHousehold()` is
the seam to replace with a session-scoped household lookup; the shape of
everything downstream (contracts, business logic, UI) is designed to stay
the same.

## Data model

`prisma/schema/household.prisma` defines `Household`, `HouseholdMember`,
`Responsibility`, `Provider`, `Activity`. Two design points worth knowing
before touching the schema:

- `Responsibility.stage` (workflow position: received → understood →
  assigned → active → completed) is intentionally separate from "waiting"
  (`waitingFor`/`waitingSince`/`followUpAt`, a condition that can be true at
  any stage) and from "at risk" (never persisted — always computed on read,
  in `src/lib/business/risk.ts`). Don't collapse these back into one status
  field.
- `category` (intake/medium shape: email, bill, form, receipt, appointment,
  other) and `domain` (household life area: car, school, health, home,
  finance, travel, other) are different axes on purpose. `domain` is always
  explicitly human-set at confirmation time — never inferred by an
  additional AI call.

## Security

`next.config.ts` sets baseline security headers; `proxy.ts` sets a
per-request CSP with a nonce and `strict-dynamic`. Don't loosen the CSP to
accommodate a convenience (e.g. an external stylesheet) — load assets in a
way that fits the existing policy instead.

## Before you change something

1. Check whether it already exists. This repo has more built than a fresh
   read of a feature brief might suggest — search `src/` before adding a
   new file or route.
2. Prefer additive changes to existing contracts/routes over new ones,
   unless a comment or this file says otherwise.
3. Don't change the Prisma schema, the Vercel/Supabase setup, or the
   no-Server-Actions/contract-first pattern without a concrete reason.
4. Run `npm run typecheck`, `npm run lint`, and `npm run test` before
   calling something done. Report failing tests as pre-existing vs.
   introduced — don't paper over either kind.
