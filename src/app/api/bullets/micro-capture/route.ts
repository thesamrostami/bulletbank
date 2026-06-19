import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const SYSTEM = `You are a CV writer. Convert the rough achievement note into 1-3 polished CV bullet points.

Rules:
- Start each bullet with a strong action verb
- Include any metrics or numbers mentioned — do not invent them
- Be specific to what was actually described
- Each bullet on its own line, no bullet symbols, no numbering
- If the note is very short and vague, produce just 1 bullet
- Do NOT add generic filler bullets
- NEVER add metrics, percentages, team sizes, or revenue figures that are not explicitly stated in the original note
- NEVER embellish or exaggerate the scope of what was described
- If the note says "helped with X", the bullet should say "Contributed to X" — not "Led X" or "Spearheaded X"
- Preserve the actual scale of the achievement — do not upgrade "helped" to "led" or "contributed" to "drove"

Return ONLY the bullet lines — no explanation, no preamble, no formatting.`

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `bullet-capture:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { text: rawText, workExperienceId } = await req.json()
  const text = (rawText ?? '').slice(0, 3000)
  if (!text?.trim()) return NextResponse.json({ error: 'Text required', code: 'INVALID_INPUT' }, { status: 400 })

  // Charge after validation so invalid requests cost nothing
  creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_generation')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_generation')

  let roleContext = null
  if (workExperienceId) {
    const { data: we } = await supabase
      .from('work_experiences')
      .select('company, title')
      .eq('id', workExperienceId)
      .eq('user_id', user.id)
      .single()
    if (we) roleContext = `${we.title} at ${we.company}`
  }

  const userContent = `${roleContext ? `Role context: ${roleContext}\n\n` : ''}ACHIEVEMENT NOTE:\n${text.slice(0, 2000)}`

  const message = await callClaude({
    system: SYSTEM,
    userContent,
    maxTokens: 512,
    temperature: 'balanced',
  })

  const raw = extractText(message)
  const bulletTexts = raw.split('\n').map((l: string) => l.trim()).filter(Boolean)

  const rows = bulletTexts.map((bulletText: string, i: number) => ({
    user_id: user.id,
    bullet_id: `mc-${Date.now()}-${i}`,
    type: workExperienceId ? 'experience' : 'highlight',
    role_context: roleContext,
    work_experience_id: workExperienceId || null,
    text: bulletText,
    skill_tags: [],
    has_metric: /\d+%|\d+x|\d+ (hours?|days?|weeks?|months?|people|team|users?|clients?|£|\$)/i.test(bulletText),
    metric_text: null,
    source: 'micro_capture',
    times_used: 0,
  }))

  const { data: saved, error } = await supabase.from('bullet_bank').insert(rows).select()
  if (error) {
    // Refund: the user was charged but the bullets were never saved
    await refundCredits(supabase, user.id, 'bullet_generation').catch(() => {})
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ bullets: saved })
  } catch (err) {
    console.error('[bullets/micro-capture POST]', err)
    // Refund: covers AI call failures after the deduction
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'bullet_generation').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
