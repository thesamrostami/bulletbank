import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ANALYSE_PROFILE_PROMPT } from '@/lib/prompts'
import { stripPII } from '@/lib/strip-pii'
import { extractPdfText } from '@/lib/extract-pdf-text'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `analyse:${user.id}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Parse the body before charging — a malformed request should cost nothing
  const { rawText, fileContents, pdfFiles } = await req.json() as {
    rawText: string
    fileContents: string[]
    pdfFiles: Array<{ name: string; base64: string }>
  }

  creditResult = await atomicDeductCredits(supabase, user.id, 'profile_extraction')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'profile_extraction')

  const pdfTexts: string[] = []
  for (const pdf of pdfFiles || []) {
    pdfTexts.push(await extractPdfText(pdf.base64))
  }

  const combinedText = stripPII(
    [rawText, ...(fileContents || []), ...pdfTexts].filter(Boolean).join('\n\n---\n\n')
  )

  const prompt = ANALYSE_PROFILE_PROMPT(combinedText)
  const message = await callClaude({
    system: prompt.system,
    userContent: prompt.user,
    maxTokens: 4096,
    temperature: 'deterministic',
  })

  try {
    const result = parseAIJson(extractText(message))
    return NextResponse.json(result)
  } catch {
    await refundCredits(supabase, user.id, 'profile_extraction').catch(() => {})
    return NextResponse.json({ error: 'Failed to parse AI response', code: 'PARSE_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[profile/analyse POST]', err)
    // Refund: covers PDF-extraction and AI-call failures after the deduction
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'profile_extraction').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
