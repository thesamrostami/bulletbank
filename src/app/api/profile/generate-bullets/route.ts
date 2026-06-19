import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { GENERATE_BULLETS_PROMPT } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `profile-gen-bullets:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { rawText, clarifyingAnswers, profileData } = await req.json() as {
      rawText: string
      clarifyingAnswers: Record<string, string>
      profileData: {
        jobTitles: string[]
        skills: string[]
        yearsExperience: number
        seniority: string
        summary: string
      }
    }

    const answersText = Object.entries(clarifyingAnswers)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `Q: ${k}\nA: ${v}`)
      .join('\n\n')

    const careerStory = [
      rawText,
      answersText && `ADDITIONAL CONTEXT FROM CLARIFYING QUESTIONS:\n${answersText}`,
      `TARGET ROLES: ${profileData.jobTitles.join(', ')}`,
      `SKILLS: ${profileData.skills.join(', ')}`,
      `SENIORITY: ${profileData.seniority} | YEARS EXPERIENCE: ${profileData.yearsExperience}`,
      `CAREER SUMMARY: ${profileData.summary}`,
    ].filter(Boolean).join('\n\n')

    const prompt = GENERATE_BULLETS_PROMPT(careerStory)

    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 8096,
      temperature: 'creative',
    })

    const generated = parseAIJson(extractText(message))
    return NextResponse.json(generated)
  } catch (err) {
    console.error('[profile/generate-bullets POST]', err)
    return NextResponse.json({ error: 'Failed to generate bullets', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
