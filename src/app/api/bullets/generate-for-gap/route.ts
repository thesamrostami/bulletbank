import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const SYSTEM = `You are a CV writer helping a candidate address a skill gap in a job application.

Generate 1-3 bullets that:
1. Address the requirement as directly as possible using what the candidate does have
2. Use transferable experience — if they have adjacent skills, frame them toward this requirement
3. Never fabricate experience they don't have
4. If there is genuinely no relevant experience, generate ONE honest bullet that positions their closest transferable skill

Return ONLY valid JSON — array of bullet objects:
[
  {
    "text": "The full bullet text",
    "skill_tags": ["relevant", "tags"],
    "has_metric": false,
    "metric_text": null,
    "confidence": "high | medium | low",
    "note": "One sentence explaining how this addresses the gap"
  }
]

confidence levels:
- high: candidate clearly has relevant experience that maps to this requirement
- medium: candidate has adjacent experience that partially addresses this
- low: this is a stretch — the bullet uses transferable skills but the gap remains real`

export async function POST(req: NextRequest) {
  // Outer try/catch: req.json() on a malformed body would otherwise throw unhandled
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `bullet-gen-gap:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { gapRequirement, jobRole, jobCompany, userExperienceNote, userContext } = await req.json() as {
    gapRequirement: string
    jobRole: string
    jobCompany: string
    userExperienceNote?: string | null
    userContext: {
      workHistory: Array<{ company: string; title: string; description: string | null }>
      skills_core: string[]
      skills_proficient: string[]
    }
  }

  if (!gapRequirement || !jobRole) {
    return NextResponse.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, { status: 400 })
  }

  // Guard: a missing userContext would crash on .workHistory after the user was charged
  const safeContext = {
    workHistory: Array.isArray(userContext?.workHistory) ? userContext.workHistory : [],
    skills_core: Array.isArray(userContext?.skills_core) ? userContext.skills_core : [],
    skills_proficient: Array.isArray(userContext?.skills_proficient) ? userContext.skills_proficient : [],
  }

  // Charge after validation so invalid requests cost nothing
  const creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_generation')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_generation')

  const noteSection = userExperienceNote
    ? `\nThe candidate has shared this about their experience with this requirement:\n"${userExperienceNote}"\nUse this as the primary basis for the bullet(s) — this is first-hand context.\n`
    : ''

  const userContent = `The candidate is applying for: ${jobRole} at ${jobCompany}
The job requires: ${gapRequirement}
The candidate does not have a direct bullet for this skill.
${noteSection}
Candidate background:
Work history: ${JSON.stringify(safeContext.workHistory.slice(0, 5))}
Core skills: ${safeContext.skills_core.join(', ')}
Proficient skills: ${safeContext.skills_proficient.join(', ')}`

  try {
    const message = await callClaude({
      system: SYSTEM,
      userContent,
      maxTokens: 1024,
      temperature: 'balanced',
    })

    const bullets = parseAIJson(extractText(message))
    return NextResponse.json({ bullets })
  } catch (err) {
    console.error('[generate-for-gap]', err)
    // Refund: the user was charged but the AI call/parse failed
    await refundCredits(supabase, user.id, 'bullet_generation').catch(() => {})
    return NextResponse.json({ error: 'Generation failed', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[generate-for-gap POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
