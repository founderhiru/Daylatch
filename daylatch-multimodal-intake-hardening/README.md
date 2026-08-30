# Daylatch

The operating layer for your household — a Next.js + Prisma app that turns
pasted messages, bills, and notes into organized, assigned household
responsibilities.

This app no longer depends on Polsia. It's a standard Next.js application:
GitHub → Vercel → Next.js → Prisma → PostgreSQL, with Claude (Anthropic API)
for the intake-understanding feature.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- Prisma 6 + PostgreSQL (any standard Postgres — Supabase, Neon, a local
  instance, etc.)
- Anthropic API (`@anthropic-ai/sdk`) for AI-assisted intake extraction
- shadcn/ui primitive set, Biome (lint/format), Vitest (tests)

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values for local
development:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Standard PostgreSQL connection string. |
| `ANTHROPIC_API_KEY` | For the intake/capture feature | Server-only — get one at https://console.anthropic.com/. Never prefix this `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | No (defaults to `http://localhost:3000`) | The app's own public origin, used for canonical URLs and metadata. |

`typecheck`, `lint`, and `test` don't need any of these set. `dev` and
`build` validate them unless you set `SKIP_ENV_VALIDATION=1`.

## Local development

```bash
npm install
npx prisma generate      # regenerates the Prisma client; also runs automatically via postinstall
npx prisma db push       # applies the schema to your database (see "Database" below)
npm run dev
```

Other useful commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Database

Prisma is the only database layer — there's no ORM alternative or raw SQL
scattered around. The schema lives in `prisma/schema/` (`_base.prisma` for
the datasource/generator, `household.prisma` for the actual models).

**There's no automatic migration step wired into the build or deploy
process.** That's deliberate: automatically running a schema-changing
command against a real database on every deploy is exactly the kind of
thing that can silently drop or alter data. Instead, apply schema changes
yourself, deliberately, whenever the schema actually changes:

```bash
npx prisma db push
```

(This project hasn't generated real Prisma migrations yet — `db push` is
the right tool for now. Once the schema stabilizes and you want proper
migration history, switch to `npx prisma migrate dev` locally and
`npx prisma migrate deploy` in production.)

## Deploying to Vercel

No Vercel-specific configuration file is needed — Vercel auto-detects
Next.js and runs `npm install` (which triggers `prisma generate` via
`postinstall`) followed by `next build`.

1. Import this repository into Vercel.
2. Set `DATABASE_URL` and `ANTHROPIC_API_KEY` (and `NEXT_PUBLIC_APP_URL`
   once you have a real domain) in the Vercel project's Environment
   Variables settings. Never commit real values for these — `.gitignore`
   already blocks every `.env*` file except `.env.example`.
3. Before the first deploy (and after any schema change), run
   `npx prisma db push` yourself against the production `DATABASE_URL` —
   see "Database" above for why this isn't automated.
4. Deploy.

## Directory guide

```text
.
├── prisma/
│   ├── schema/_base.prisma           Datasource + generator
│   └── schema/household.prisma       Household/Responsibility/Activity/Provider models
├── src/
│   ├── app/
│   │   ├── page.tsx                  Marketing homepage (/)
│   │   ├── (custom)/
│   │   │   ├── try/                  Desktop intake tool
│   │   │   ├── capture/              Mobile capture flow
│   │   │   ├── dashboard/            Household command center
│   │   │   ├── household/            "Who has what?" view
│   │   │   ├── responsibilities/[id]/ Responsibility detail
│   │   │   └── activity/             Household activity history
│   │   ├── api/                      Route handlers (intake, responsibilities, pulse, activity, household)
│   │   ├── health/route.ts           Health check endpoint
│   │   └── layout.tsx                Root layout
│   ├── components/
│   │   ├── ui/                       shadcn primitives
│   │   ├── custom/                   App-specific components (nav, marketing sections, mobile shell)
│   │   └── theme-provider.tsx
│   ├── lib/
│   │   ├── ai/client.ts              Anthropic API client (chat/streamChat/generateObject)
│   │   ├── business/                 Domain logic (intake, responsibility, pulse, risk, activity)
│   │   ├── contracts/                Shared Zod schemas (client + server)
│   │   ├── db.ts                     Prisma singleton
│   │   ├── env.ts                    Typed environment validation
│   │   └── seed.ts                   Idempotent demo-data seed
│   └── instrumentation.ts            Runs the seed once on server boot
├── tests/unit/                       Vitest unit tests
├── next.config.ts                    Next config and security headers
└── proxy.ts                          CSP nonce + middleware chain
```

## Security headers

`next.config.ts` sets baseline response headers (`Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`). `proxy.ts` sets a per-request Content
Security Policy with a nonce and `strict-dynamic` on `script-src`.

## Data plane

Client pages call `/api/*` route handlers through `apiFetch`
(`src/lib/api-client.ts`), passing a shared Zod schema (from
`src/lib/contracts/`) to validate the response at runtime. There are no
Server Actions — all mutations go through route handlers.

## License

MIT. See [LICENSE](./LICENSE).
