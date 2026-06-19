import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateRankedBullets } from '@/lib/validate-ai-output'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { RANK_BULLETS_PROMPT } from '@/lib/prompts'
import type { RoleArchetype } from '@/types'

export async function POST(req: NextRequest) {
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `bullet-rank:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { jobText, requirements, bulletType, archetype } = await req.json() as {
    jobText?: string
    requirements?: string[]
    bulletType?: string
    archetype?: RoleArchetype
  }

  let query = supabase.from('bullet_bank').select('*').eq('user_id', user.id)
  if (bulletType) query = query.eq('type', bulletType)

  const { data: bullets, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bullets?.length) return NextResponse.json({ ranked: [] })

  const jobContext =
    requirements && requirements.length > 0
      ? `JOB REQUIREMENTS (structured list):\n${(requirements as string[]).map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : `JOB DESCRIPTION:\n${jobText}`

  const prompt = RANK_BULLETS_PROMPT(
    jobContext,
    bullets.map((b) => ({
      bullet_id: b.bullet_id,
      id: b.id,
      text: b.text,
      type: b.type,
      role_context: b.role_context,
    })),
    archetype
  )

  const message = await callClaude({
    system: prompt.system,
    userContent: prompt.user,
    maxTokens: 2048,
    temperature: 'deterministic',
  })

  const scores = parseAIJson<Array<{ id: string; bullet_id: string; score: number; reasoning: string; recommend: boolean }>>(extractText(message))
  validateRankedBullets(scores)

  const ranked = scores
    .map((s) => ({
      bullet: bullets.find((b) => b.id === s.id)!,
      score: s.score,
      reasoning: s.reasoning,
      recommend: s.recommend ?? (s.score >= 70),
    }))
    .filter((r) => r.bullet)
    .sort((a, b) => b.score - a.score)

  return NextResponse.json({ ranked })
  } catch (err) {
    console.error('[bullets/rank POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
