import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const SYSTEM = `You are a CV writer. Rewrite the bullet point to better match the job requirements provided.

Rules:
- Keep the same factual achievement — do NOT invent new metrics or claims
- Adjust the emphasis, framing, and keywords to match the role
- Keep the same approximate length
- Start with a strong action verb
- Return ONLY the rewritten bullet text — no explanation, no quotes, no preamble`

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `bullet-rewrite:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { bulletText, jobRole, jobCompany, requirements } = await req.json() as {
    bulletText: string
    jobRole: string
    jobCompany: string
    requirements: string[]
  }

  if (!bulletText || !jobRole) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_rewrite')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_rewrite')

  const message = await callClaude({
    system: SYSTEM,
    userContent: `ORIGINAL BULLET: ${bulletText}

JOB: ${jobRole} at ${jobCompany}
KEY REQUIREMENTS: ${(requirements ?? []).slice(0, 8).join(', ')}`,
    maxTokens: 256,
    temperature: 'balanced',
  })

  const rewrittenText = extractText(message) || bulletText

  return NextResponse.json({ rewrittenText })
  } catch (err) {
    console.error('[bullets/rewrite-for-role POST]', err)
    // Refund: the user was charged but the AI call failed
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'bullet_rewrite').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
