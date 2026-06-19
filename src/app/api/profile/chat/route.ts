import { NextRequest } from 'next/server'
import { streamClaude } from '@/lib/ai-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CAREER_COACH_SYSTEM_PROMPT } from '@/lib/prompts'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { stripPII } from '@/lib/strip-pii'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function POST(req: NextRequest) {
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), { status: 401, headers: JSON_HEADERS })
    }
    userId = user.id

    const rl = await checkRateLimitWithDb(supabase, `chat:${user.id}`, { limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    creditResult = await atomicDeductCredits(supabase, user.id, 'chat_message')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'chat_message')

    const { messages, context } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      context: string
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      await refundCredits(supabase, user.id, 'chat_message')
      return new Response(JSON.stringify({ error: 'Invalid messages', code: 'INVALID_INPUT' }), { status: 400, headers: JSON_HEADERS })
    }
    const safeMsgs = messages.slice(-20).map(m => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
    }))
    const safeContext = typeof context === 'string' ? stripPII(context.slice(0, 8000)) : ''

    const systemPrompt = safeContext
      ? `${CAREER_COACH_SYSTEM_PROMPT}\n\nAdditional context from uploaded documents:\n${safeContext}`
      : CAREER_COACH_SYSTEM_PROMPT

    const stream = await streamClaude({
      system: systemPrompt,
      messages: safeMsgs,
      maxTokens: 2048,
      temperature: 'creative',
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('[profile/chat stream]', err)
          await refundCredits(supabase, user.id, 'chat_message')
          controller.enqueue(encoder.encode('\nAn error occurred. Please try again.'))
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('[profile/chat POST]', err)
    if (creditResult?.success && userId) {
      const supabase = await createServerSupabaseClient()
      await refundCredits(supabase, userId, 'chat_message').catch(() => {})
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
}
