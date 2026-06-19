import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase-backed sliding-window rate limiter.
 *
 * The in-memory limiter in `request-rate-limit.ts` keeps state in a module-level
 * Map, which is ineffective on serverless platforms (Vercel) where each lambda
 * invocation may have a fresh memory space — the limit resets between requests.
 * This version persists state in the `rate_limit_log` table via an atomic RPC,
 * so the limit holds across instances. See migration 023_rate_limit_log.sql.
 *
 * Fail-open: if the DB call errors we allow the request, since a rate limiter
 * outage should not block legitimate traffic (credit deduction still gates cost).
 */
export async function checkRateLimitDb(
  supabase: SupabaseClient,
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; resetAt: number }> {
  try {
    const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
      p_key: key,
      p_limit: opts.limit,
      p_window_ms: opts.windowMs,
    })

    if (error) {
      console.error('[rate-limit-db] check_and_record_rate_limit error:', error.message)
      return { allowed: true, resetAt: Date.now() + opts.windowMs }
    }

    const row = Array.isArray(data) ? data[0] : data
    const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : Date.now() + opts.windowMs
    return { allowed: row?.allowed ?? true, resetAt }
  } catch (err) {
    console.error('[rate-limit-db] checkRateLimitDb exception:', err)
    return { allowed: true, resetAt: Date.now() + opts.windowMs }
  }
}
