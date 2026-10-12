import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { extractText, parseAIJson } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { REVIEW_PACK_PROMPT } from '@/lib/prompts'

interface ReviewPack {
  summary: string
  themes: Array<{ title: string; bullets: string[]; narrative: string }>
  suggested_talking_points: string[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `review-pack:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await req.json()
  const from = body.from
  const to = body.to
  const emphasis = typeof body.emphasis === 'string' ? body.emphasis.slice(0, 1000).trim() : ''

  if (typeof from !== 'string' || typeof to !== 'string' || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'Invalid date range', code: 'INVALID_INPUT' }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: 'Start date must be before end date', code: 'INVALID_INPUT' }, { status: 400 })
  }

  const { data: bullets, error: bulletsError } = await supabase
    .from('bullet_bank')
    .select('text, created_at, role_context, has_metric, metric_text')
    .eq('user_id', user.id)
    .gte('created_at', from)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: true })
    .limit(150)

  if (bulletsError) {
    console.error('[review-pack] bullets query failed:', bulletsError.message)
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }
  if (!bullets || bullets.length === 0) {
    return NextResponse.json({ error: 'No achievements logged in this date range', code: 'NO_BULLETS' }, { status: 400 })
  }

  // Optional role/company context from the current work experience
  const { data: currentWe } = await supabase
    .from('work_experiences')
    .select('company, title')
    .eq('user_id', user.id)
    .eq('is_current', true)
    .order('order_index')
    .limit(1)
    .maybeSingle()

  // Charge after validation so invalid requests cost nothing
  creditResult = await atomicDeductCredits(supabase, user.id, 'review_pack')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'review_pack')

  const prompt = REVIEW_PACK_PROMPT(
    bullets,
    { role: currentWe?.title ?? null, company: currentWe?.company ?? null },
    emphasis || undefined,
  )

  const message = await callClaude({
    system: prompt.system,
    userContent: prompt.user,
    maxTokens: 4096,
    temperature: 'balanced',
  })

  const pack = parseAIJson<ReviewPack>(extractText(message))
  if (!pack?.summary || !Array.isArray(pack.themes) || pack.themes.length === 0) {
    // Malformed AI output — throw into the catch so the charge is refunded
    throw new Error('AI returned an unexpected shape')
  }

  return NextResponse.json({ pack, bulletCount: bullets.length })
  } catch (err) {
    console.error('[review-pack POST]', err)
    // Refund: covers AI call failures after the deduction
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'review_pack').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
