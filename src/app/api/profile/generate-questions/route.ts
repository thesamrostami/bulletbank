import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const GENERATE_QUESTIONS_SYSTEM = `You are a career coach building someone's CV profile. Based on what was extracted from their documents, generate 4-8 targeted questions to fill the gaps.

Return ONLY valid JSON — an array:
[
  {
    "id": "q1",
    "field": "skills_core",
    "question": "What are your strongest technical skills — the ones you'd most confidently demonstrate in an interview?",
    "type": "tags",
    "placeholder": "Python, React, SQL...",
    "required": true
  }
]

type must be one of: "text", "textarea", "tags", "select"
field should reference the profile/CV field this answers

Generate questions ONLY for genuinely missing or thin areas. If they have rich work experience, don't ask about it again. Focus on:
- Missing skills breakdown (core vs proficient vs familiar)
- Missing achievements/impact from roles they listed
- Job search preferences (target roles, locations, work type)
- Career narrative (what they're aiming for)
- Anything that would make their bullets significantly stronger`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `profile-gen-questions:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { extractedData } = await req.json()
    const extractedStr = JSON.stringify(extractedData, null, 2).slice(0, 15000)

    const message = await callClaude({
      system: GENERATE_QUESTIONS_SYSTEM,
      userContent: `EXTRACTED DATA:\n${extractedStr}`,
      maxTokens: 2048,
      temperature: 'balanced',
    })

    const questions = parseAIJson(extractText(message))
    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[profile/generate-questions POST]', err)
    return NextResponse.json({ error: 'Failed to generate questions', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
