// Typed, validated environment variables via @t3-oss/env-nextjs.
//
// Keeping a var under `server` (not `client`) is what keeps it out of the
// browser bundle — createEnv() only exposes `client`-declared keys to
// client code. Never move a secret like ANTHROPIC_API_KEY into `client`,
// and never prefix it NEXT_PUBLIC_. biome.json's `noRestrictedImports` rule
// separately blocks client files from importing server-only modules
// (@/lib/db, server-only, etc.) that might carry secrets transitively.

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Prisma is the database client. DATABASE_URL is a standard PostgreSQL
    // connection string, provided by whatever host/provider runs the
    // database (e.g. Supabase) — no platform-specific provisioning assumed.
    DATABASE_URL: z.string().url(),
    // Server-only. NEVER expose as NEXT_PUBLIC_ANTHROPIC_API_KEY — see
    // src/lib/ai/client.ts, the only module that reads this.
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    // Base for @/lib/api-client + proxy.ts connect-src. Default-empty
    // (unset) means same-origin `/api`; set only for an external API origin.
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
  // SKIP_ENV_VALIDATION=1 bypasses validation for envless builds (lint/CI/local).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
