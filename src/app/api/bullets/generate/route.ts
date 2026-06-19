import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GENERATE_BULLETS_PROMPT } from '@/lib/prompts'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `bullet-gen:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { careerStory } = await req.json()
  if (!careerStory) return NextResponse.json({ error: 'Career story required', code: 'INVALID_INPUT' }, { status: 400 })

  creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_generation')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_generation')

  const prompt = GENERATE_BULLETS_PROMPT(careerStory)
  const message = await callClaude({
    system: prompt.system,
    userContent: prompt.user,
    maxTokens: 4096,
    temperature: 'creative',
  })

  const generated = parseAIJson<{
    summaries: Array<{ bullet_id: string; role_focus?: string; text: string }>
    highlights: Array<{ bullet_id: string; text: string; skill_tags?: string[]; has_metric?: boolean; metric_text?: string }>
    experience: Array<{ bullet_id: string; role_context?: string; text: string; skill_tags?: string[]; has_metric?: boolean; metric_text?: string }>
  }>(extractText(message))

  const rows = [
    ...generated.summaries.map((b) => ({
      user_id: user.id,
      bullet_id: b.bullet_id,
      type: 'summary',
      role_context: b.role_focus || null,
      text: b.text,
      skill_tags: [],
      has_metric: false,
      metric_text: null,
    })),
    ...generated.highlights.map((b) => ({
      user_id: user.id,
      bullet_id: b.bullet_id,
      type: 'highlight',
      role_context: null,
      text: b.text,
      skill_tags: b.skill_tags || [],
      has_metric: b.has_metric || false,
      metric_text: b.metric_text || null,
    })),
    ...generated.experience.map((b) => ({
      user_id: user.id,
      bullet_id: b.bullet_id,
      type: 'experience',
      role_context: b.role_context || null,
      text: b.text,
      skill_tags: b.skill_tags || [],
      has_metric: b.has_metric || false,
      metric_text: b.metric_text || null,
    })),
  ]

  const { error } = await supabase.from('bullet_bank').insert(rows)
  if (error) {
    // Refund: the user was charged but the bullets were never saved
    await refundCredits(supabase, user.id, 'bullet_generation').catch(() => {})
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ count: rows.length, bullets: rows })
  } catch (err) {
    console.error('[bullets/generate POST]', err)
    // Refund: covers AI call/parse failures after the deduction
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'bullet_generation').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
