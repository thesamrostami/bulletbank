import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `credits-balance:${user.id}`, { limit: 120, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance, plan')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      balance: profile?.credit_balance ?? 0,
      plan: profile?.plan ?? 'free',
    })
  } catch (err) {
    console.error('[credits/balance GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
