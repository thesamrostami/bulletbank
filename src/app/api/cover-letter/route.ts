import { NextRequest } from 'next/server'
import { streamClaude } from '@/lib/ai-client'
import { COVER_LETTER_PROMPT, COVER_LETTER_REFINE_PROMPT } from '@/lib/prompts'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let creditAction: string | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `cover-letter:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await req.json()
  const { job, selectedBulletTexts, profile, ownCvText, refinementPrompt, previousCoverLetter } = body

  if (!job || typeof job !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Invalid job data', code: 'INVALID_INPUT' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const safeJob = {
    company: typeof job.company === 'string' ? job.company.slice(0, 200) : '',
    role: typeof job.role === 'string' ? job.role.slice(0, 200) : '',
    requirements: Array.isArray(job.requirements)
      ? job.requirements.slice(0, 30).map((r: unknown) => (typeof r === 'string' ? r.slice(0, 500) : ''))
      : [],
    raw_text: typeof job.raw_text === 'string' ? job.raw_text.slice(0, 3000) : undefined,
  }

  const isRefinement = typeof refinementPrompt === 'string' && refinementPrompt.trim().length > 0
    && typeof previousCoverLetter === 'string' && previousCoverLetter.trim().length > 0

  if (isRefinement) {
    const safeRefinementPrompt = refinementPrompt.trim().slice(0, 500)
    const safePreviousCoverLetter = previousCoverLetter.slice(0, 4000)

    const safeProfile = {
      bio: profile?.bio ?? null,
      positioning_headline: profile?.positioning_headline ?? null,
      skills_core: profile?.skills_core ?? [],
    }

    creditResult = await atomicDeductCredits(supabase, user.id, 'cover_letter_refine')
    creditAction = 'cover_letter_refine'
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'cover_letter_refine')

    const prompt = COVER_LETTER_REFINE_PROMPT(
      safePreviousCoverLetter,
      safeRefinementPrompt,
      { ...safeJob, raw_text: typeof body.rawText === 'string' ? body.rawText.slice(0, 2000) : safeJob.raw_text },
      safeProfile,
      Array.isArray(selectedBulletTexts) ? selectedBulletTexts.slice(0, 10) : undefined,
    )

    const stream = await streamClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 1024,
      temperature: 'balanced',
    })

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        // Mid-stream failures refund — same pattern as profile/chat
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('[cover-letter refine stream]', err)
          await refundCredits(supabase, user.id, 'cover_letter_refine').catch(() => {})
          controller.enqueue(encoder.encode('\nAn error occurred. Please try again.'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  }

  // Validate before charging — a 400 here previously cost the user 2 credits
  if (!ownCvText) {
    if (!Array.isArray(selectedBulletTexts) || selectedBulletTexts.length === 0 || selectedBulletTexts.length > 20) {
      return new Response(
        JSON.stringify({ error: 'No bullets selected. Please select at least one bullet before generating.', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  creditResult = await atomicDeductCredits(supabase, user.id, 'cover_letter')
  creditAction = 'cover_letter'
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'cover_letter')

  const safeProfile = {
    bio: profile?.bio ?? null,
    positioning_headline: profile?.positioning_headline ?? null,
    skills_core: profile?.skills_core ?? [],
  }

  const prompt = COVER_LETTER_PROMPT(safeJob, selectedBulletTexts || [], safeProfile, ownCvText)

  const stream = await streamClaude({
    system: prompt.system,
    userContent: prompt.user,
    maxTokens: 1024,
    temperature: 'creative',
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      // Mid-stream failures refund — same pattern as profile/chat
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        console.error('[cover-letter stream]', err)
        await refundCredits(supabase, user.id, 'cover_letter').catch(() => {})
        controller.enqueue(encoder.encode('\nAn error occurred. Please try again.'))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
  } catch (err) {
    console.error('[cover-letter POST]', err)
    // Refund: the user was charged but the stream never started
    if (creditResult?.success && creditAction && userId) {
      await refundCredits(supabase, userId, creditAction).catch(() => {})
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
