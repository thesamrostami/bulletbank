import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const SYSTEM = `You are a professional CV writer. Improve the bullet point using the additional information provided.

Return ONLY valid JSON — no markdown:
{ "improvedText": "the improved bullet point" }

Rules:
- Start with a strong action verb
- Be specific and concrete
- Keep to 1-2 lines
- Never invent metrics — only use numbers the user provided
- If no additional info was provided, improve the verb choice and sentence structure`

export async function POST(req: NextRequest) {
  // Outer try/catch: req.json() on a malformed body would otherwise throw unhandled
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `bullet-improve:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const raw = await req.json() as {
    bulletText: string
    question: string
    answer: string
    roleContext: string | null
  }

  if (typeof raw.bulletText !== 'string' || raw.bulletText.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const bulletText = (raw.bulletText ?? '').slice(0, 1000)
  const question = (raw.question ?? '').slice(0, 500)
  const answer = (raw.answer ?? '').slice(0, 1000)
  const roleContext = raw.roleContext ? raw.roleContext.slice(0, 200) : null

  const creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_rewrite')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_rewrite')

  const answerNote = !answer || answer.trim().length < 3 || /^(i don'?t know|n\/?a|none|no)$/i.test(answer.trim())
    ? `The user does not have additional information. Do NOT just swap the action verb. Instead:
- Extract the strongest implied outcome from the bullet itself
- Make the scope and impact more concrete using only what is already stated
- If the bullet mentions a deliverable, name it specifically
- If it mentions a process, show the result of that process
- Keep to 1-2 lines. Never fabricate metrics.`
    : `The user answered: "${answer}"`

  try {
    const message = await callClaude({
      system: SYSTEM,
      userContent: `ORIGINAL BULLET: ${bulletText}
ROLE CONTEXT: ${roleContext || 'standalone highlight'}
QUESTION ASKED: ${question}
${answerNote}`,
      maxTokens: 256,
      temperature: 'balanced',
    })

    const { improvedText } = parseAIJson<{ improvedText: string }>(extractText(message))
    return NextResponse.json({ improvedText })
  } catch {
    // Refund: the user was charged but the AI call/parse failed
    await refundCredits(supabase, user.id, 'bullet_rewrite').catch(() => {})
    return NextResponse.json({ error: 'Failed to generate improvement', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[bullets/improve POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
