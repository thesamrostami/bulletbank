import { NextRequest, NextResponse } from 'next/server'
import { EXTRACT_JOB_PROMPT } from '@/lib/prompts'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateExtractedJob } from '@/lib/validate-ai-output'
import { scrapeJobPage } from '@/lib/scraper'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { validateJobUrl } from '@/lib/validate-url'
import type { ExtractedJob } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `extract-url:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Tracked outside the try so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined

  try {
    const { url } = await req.json()
    const urlCheck = validateJobUrl(url)
    if (!urlCheck.ok) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 })
    }

    let pageText: string
    try {
      pageText = await scrapeJobPage(url)
    } catch {
      return NextResponse.json(
        { error: 'Could not read that page. Please paste the job description below.', pastePrompt: true },
        { status: 422 }
      )
    }

    creditResult = await atomicDeductCredits(supabase, user.id, 'job_extraction')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'job_extraction')

    const prompt = EXTRACT_JOB_PROMPT(pageText)
    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 1024,
      temperature: 'deterministic',
    })

    const extracted = parseAIJson<ExtractedJob>(extractText(message))
    validateExtractedJob(extracted)
    extracted.raw_text = pageText.slice(0, 8000)

    return NextResponse.json({ extracted })
  } catch (err) {
    console.error('[extract-job]', err)
    // Refund: the user was charged but the AI call/parse failed
    if (creditResult?.success) {
      await refundCredits(supabase, user.id, 'job_extraction').catch(() => {})
    }
    if (err instanceof Error && err.message.startsWith('AI output missing')) {
      return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Extraction failed', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
