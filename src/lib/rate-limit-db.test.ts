import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimitDb } from './rate-limit-db'
import { checkRateLimitWithDb, rateLimitResponse } from './request-rate-limit'

function makeSupabase(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient
}

const opts = { limit: 10, windowMs: 60_000 }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('checkRateLimitDb', () => {
  it('calls the RPC with the key, limit and window', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, reset_at: null }], error: null })
    await checkRateLimitDb(makeSupabase(rpc), 'ip:1.2.3.4', opts)
    expect(rpc).toHaveBeenCalledWith('check_and_record_rate_limit', {
      p_key: 'ip:1.2.3.4',
      p_limit: 10,
      p_window_ms: 60_000,
    })
  })

  it('allows the request when the RPC says so', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, reset_at: null }], error: null })
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.allowed).toBe(true)
  })

  it('blocks the request and surfaces the reset time when over the limit', async () => {
    const resetAt = '2026-01-01T00:00:30Z'
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: false, reset_at: resetAt }], error: null })
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.allowed).toBe(false)
    expect(result.resetAt).toBe(new Date(resetAt).getTime())
  })

  it('handles a single-object RPC row', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { allowed: false, reset_at: '2026-01-01T00:01:00Z' }, error: null })
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.allowed).toBe(false)
  })

  it('defaults resetAt to now + window when the RPC omits it', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true }], error: null })
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.resetAt).toBe(Date.now() + opts.windowMs)
  })

  it('fails open when the RPC returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } })
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.allowed).toBe(true)
    expect(result.resetAt).toBe(Date.now() + opts.windowMs)
    expect(console.error).toHaveBeenCalled()
  })

  it('fails open when the RPC throws', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network'))
    const result = await checkRateLimitDb(makeSupabase(rpc), 'k', opts)
    expect(result.allowed).toBe(true)
  })
})

describe('checkRateLimitWithDb', () => {
  it('delegates to the DB-backed limiter', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: false, reset_at: '2026-01-01T00:00:10Z' }], error: null })
    const result = await checkRateLimitWithDb(makeSupabase(rpc), 'k', opts)
    expect(rpc).toHaveBeenCalledOnce()
    expect(result.allowed).toBe(false)
  })
})

describe('rateLimitResponse', () => {
  it('returns HTTP 429 with Retry-After in whole seconds, rounded up', async () => {
    const resetAt = Date.now() + 4_200
    const res = rateLimitResponse(resetAt)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('5')
    expect(res.headers.get('X-RateLimit-Reset')).toBe(String(resetAt))
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMITED')
  })
})
