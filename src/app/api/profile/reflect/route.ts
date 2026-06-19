import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { REFLECTION_PROMPT } from '@/lib/prompts'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  let creditResult: AtomicDeductResult | undefined
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | undefined
  let userId: string | undefined

  try {
    supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    userId = user.id

    const rl = await checkRateLimitWithDb(supabase, `reflect:${user.id}`, { limit: 10, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    creditResult = await atomicDeductCredits(supabase, user.id, 'chat_message')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'chat_message')

    const { messages } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n\n')

    const prompt = REFLECTION_PROMPT(conversationText)
    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 4096,
      temperature: 'deterministic',
    })

    const reflection = parseAIJson(extractText(message))

    await supabase
      .from('profiles')
      .update({ conversation_history: messages })
      .eq('user_id', user.id)

    return NextResponse.json(reflection)
  } catch (err) {
    console.error('[profile/reflect POST]', err)
    if (creditResult?.success && userId && supabase) {
      await refundCredits(supabase, userId, 'chat_message').catch(() => {})
    }
    if (err instanceof Error && err.message.startsWith('Failed to parse')) {
      return NextResponse.json({ error: 'Failed to parse AI response', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
