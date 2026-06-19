import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateFitAnalysis } from '@/lib/validate-ai-output'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FIT_ANALYSIS_PROMPT } from '@/lib/prompts'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import type { ExtractedJob } from '@/types'

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    userId = user.id

    const rl = await checkRateLimitWithDb(supabase, `analyse-fit:${user.id}`, { limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()
    const { jobData, forceRegenerate }: { jobData: ExtractedJob & { raw_text?: string; id?: string }; forceRegenerate?: boolean } = body

    if (!jobData?.requirements?.length) {
      return NextResponse.json({ error: 'No requirements provided', code: 'INVALID_INPUT' }, { status: 400 })
    }

    // Check cache before calling AI — cached responses are free
    if (jobData.id && !forceRegenerate) {
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('fit_score, fit_analysis')
        .eq('id', jobData.id)
        .eq('user_id', user.id)
        .single()

      if (existingJob?.fit_analysis) {
        return NextResponse.json({
          fit_score: existingJob.fit_score,
          ...existingJob.fit_analysis,
        })
      }
    }

    // Cache miss or force-regenerate — charge and call AI
    creditResult = await atomicDeductCredits(supabase, user.id, 'fit_analysis')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'fit_analysis')

    const [profileRes, workRes, bulletRes] = await Promise.all([
      supabase.from('profiles')
        .select('skills_core, skills_proficient, skills_familiar, job_titles, seniority, years_experience')
        .eq('user_id', user.id)
        .single(),
      supabase.from('work_experiences')
        .select('company, title, description')
        .eq('user_id', user.id),
      supabase.from('bullet_bank')
        .select('text')
        .eq('user_id', user.id)
        .limit(30),
    ])

    const profile = profileRes.data
    const workExperiences = workRes.data || []
    const bullets = bulletRes.data || []

    const promptProfile = {
      skills_core: profile?.skills_core || [],
      skills_proficient: profile?.skills_proficient || [],
      skills_familiar: profile?.skills_familiar || [],
      seniority: profile?.seniority || null,
      years_experience: profile?.years_experience || null,
      job_titles: profile?.job_titles || [],
      workHistory: workExperiences.map((w) => ({
        company: w.company,
        title: w.title,
        description: w.description,
      })),
      bulletTexts: bullets.map((b) => b.text),
    }

    const prompt = FIT_ANALYSIS_PROMPT(promptProfile, jobData.requirements, {
      company: jobData.company,
      role: jobData.role,
      raw_text: jobData.raw_text || null,
    })

    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 1024,
      temperature: 'deterministic',
    })

    const result = parseAIJson(extractText(message))
    validateFitAnalysis(result)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[analyse-fit]', err)
    // Refund: the user was charged but the AI call/parse failed
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'fit_analysis').catch(() => {})
    }
    if (err instanceof Error && err.message.startsWith('AI output missing')) {
      return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
