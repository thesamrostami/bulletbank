import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { atomicDeductCredits, refundCredits, insufficientCreditsResponse } from './rate-limit'

/** Minimal Supabase stub: only `rpc` is exercised by the credits layer. */
function makeSupabase(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('atomicDeductCredits', () => {
  it('calls the atomic RPC with the right cost, label and reference', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: true, balance: 97 }], error: null })
    await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite', 'job-42')

    expect(rpc).toHaveBeenCalledWith('deduct_credits_atomic', {
      p_user_id: 'user-1',
      p_cost: 3,
      p_action: 'cv_rewrite',
      p_description: 'CV generation',
      p_reference_id: 'job-42',
    })
  })

  it('passes null when no reference id is given', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: true, balance: 1 }], error: null })
    await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'fit_analysis')
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_reference_id: null })
  })

  it('returns success and the new balance when the RPC returns an array row', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: true, balance: 97 }], error: null })
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')
    expect(result).toEqual({ success: true, balance: 97, cost: 3 })
  })

  it('returns success and the new balance when the RPC returns a single object', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true, balance: 10 }, error: null })
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cover_letter')
    expect(result).toEqual({ success: true, balance: 10, cost: 2 })
  })

  it('reports failure with the current balance when credits are insufficient', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: false, balance: 1 }], error: null })
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')
    expect(result).toEqual({ success: false, balance: 1, cost: 3 })
  })

  it('fails closed when the RPC returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } })
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')
    expect(result).toEqual({ success: false, balance: 0, cost: 3 })
    expect(console.error).toHaveBeenCalled()
  })

  it('fails closed when the RPC throws', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network'))
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')
    expect(result).toEqual({ success: false, balance: 0, cost: 3 })
  })

  it('fails closed when the RPC returns no row', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const result = await atomicDeductCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')
    expect(result.success).toBe(false)
    expect(result.balance).toBe(0)
  })
})

describe('refundCredits', () => {
  it('calls the refund RPC with the same cost and a refund description', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: true }], error: null })
    await refundCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite', 'job-42')

    expect(rpc).toHaveBeenCalledWith('refund_credits_atomic', {
      p_user_id: 'user-1',
      p_cost: 3,
      p_action: 'cv_rewrite',
      p_description: 'Refund: CV generation failed',
      p_reference_id: 'job-42',
    })
  })

  it('never throws when the RPC returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(refundCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it('never throws when the RPC rejects', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network'))
    await expect(refundCredits(makeSupabase(rpc), 'user-1', 'cv_rewrite')).resolves.toBeUndefined()
  })

  it('logs when the user was not found', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ success: false }], error: null })
    await refundCredits(makeSupabase(rpc), 'ghost', 'cv_rewrite')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('user not found'), 'ghost')
  })
})

describe('insufficientCreditsResponse', () => {
  it('returns HTTP 402 with a structured body', async () => {
    const res = insufficientCreditsResponse({ success: false, balance: 1, cost: 3 }, 'cv_rewrite')
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body).toMatchObject({ insufficientCredits: true, balance: 1, cost: 3 })
    expect(body.error).toContain('CV generation')
    expect(body.error).toContain('costs 3 credits')
    expect(body.error).toContain('you have 1')
  })

  it('uses the singular "credit" when the cost is 1', async () => {
    const res = insufficientCreditsResponse({ success: false, balance: 0, cost: 1 }, 'fit_analysis')
    const body = await res.json()
    expect(body.error).toContain('costs 1 credit,')
  })
})
