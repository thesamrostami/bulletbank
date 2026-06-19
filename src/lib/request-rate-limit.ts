/**
 * DB-backed rate limiter and response helper.
 * Persists state in Supabase so limits hold across serverless instances.
 * See `src/lib/rate-limit-db.ts` for the underlying implementation.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimitDb } from './rate-limit-db'

export interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export async function checkRateLimitWithDb(
  supabase: SupabaseClient,
  key: string,
  opts: RateLimitOptions
): Promise<{ allowed: boolean; resetAt: number }> {
  return checkRateLimitDb(supabase, key, opts)
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { error: 'Too many requests. Please wait a moment before trying again.', code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  )
}
