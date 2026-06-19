import type { SupabaseClient } from '@supabase/supabase-js'
import { getCreditCost, getCreditLabel } from './plans'

export interface AtomicDeductResult {
  success: boolean
  balance: number
  cost: number
}

/**
 * Atomically checks and deducts credits in a single Postgres UPDATE.
 * Fail-closed: any DB error returns { success: false } to prevent free access.
 */
export async function atomicDeductCredits(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  referenceId?: string
): Promise<AtomicDeductResult> {
  const cost = getCreditCost(action)

  try {
    const { data, error } = await supabase.rpc('deduct_credits_atomic', {
      p_user_id: userId,
      p_cost: cost,
      p_action: action,
      p_description: getCreditLabel(action),
      p_reference_id: referenceId ?? null,
    })

    if (error) {
      console.error('[credits] deduct_credits_atomic error:', error.message)
      return { success: false, balance: 0, cost }
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      success: row?.success ?? false,
      balance: row?.balance ?? 0,
      cost,
    }
  } catch (err) {
    console.error('[credits] atomicDeductCredits exception:', err)
    return { success: false, balance: 0, cost }
  }
}

export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  referenceId?: string
): Promise<void> {
  const cost = getCreditCost(action)
  try {
    const { data, error } = await supabase.rpc('refund_credits_atomic', {
      p_user_id: userId,
      p_cost: cost,
      p_action: action,
      p_description: `Refund: ${getCreditLabel(action)} failed`,
      p_reference_id: referenceId ?? null,
    })

    if (error) {
      console.error('[credits] refund_credits_atomic error:', error.message)
    } else {
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.success) {
        console.error('[credits] refund_credits_atomic: user not found. userId:', userId)
      }
    }
  } catch (err) {
    console.error('[credits] refundCredits exception:', err)
  }
}

export function insufficientCreditsResponse(result: AtomicDeductResult, action: string) {
  const label = getCreditLabel(action)
  return Response.json(
    {
      error: `Not enough credits for ${label}. This action costs ${result.cost} credit${result.cost !== 1 ? 's' : ''}, but you have ${result.balance}. Buy more credits to continue.`,
      insufficientCredits: true,
      balance: result.balance,
      cost: result.cost,
    },
    { status: 402 }
  )
}
