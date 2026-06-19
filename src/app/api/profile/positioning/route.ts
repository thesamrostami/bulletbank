import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { POSITIONING_PROMPT } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `profile-positioning:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { profileData } = await req.json() as {
      profileData: {
        jobTitles: string[]
        skills: string[]
        yearsExperience: number
        seniority: string
        summary: string
        strengths?: Array<{ strength: string; evidence: string }>
        careerNarrative?: string
      }
    }

    const profileText = [
      `TARGET ROLES: ${profileData.jobTitles.join(', ')}`,
      `SKILLS: ${profileData.skills.join(', ')}`,
      `SENIORITY: ${profileData.seniority} | YEARS: ${profileData.yearsExperience}`,
      `SUMMARY: ${profileData.summary}`,
      profileData.careerNarrative ? `CAREER NARRATIVE: ${profileData.careerNarrative}` : '',
      profileData.strengths?.length ? `STRENGTHS:\n${profileData.strengths.map(s => `- ${s.strength}: ${s.evidence}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n')

    const prompt = POSITIONING_PROMPT(profileText)

    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 1024,
      temperature: 'deterministic',
    })

    const positioning = parseAIJson<{ positioningHeadline?: string }>(extractText(message))

    await supabase
      .from('profiles')
      .update({ positioning_headline: positioning.positioningHeadline })
      .eq('user_id', user.id)

    return NextResponse.json(positioning)
  } catch (err) {
    console.error('[profile/positioning POST]', err)
    return NextResponse.json({ error: 'Failed to generate positioning', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
