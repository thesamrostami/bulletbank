import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateCvRewrite } from '@/lib/validate-ai-output'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { REWRITE_CV_FOR_ROLE_PROMPT, REWRITE_CV_REFINE_PROMPT } from '@/lib/prompts'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { stripPII } from '@/lib/strip-pii'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  let mainCreditResult: AtomicDeductResult | undefined

  try {
  const rl = await checkRateLimitWithDb(supabase, `cv-rewrite:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await req.json() as { jobId: string; mode: 'bank' | 'cv'; refinementPrompt?: string; previousRewrite?: string }
  const { jobId, mode, refinementPrompt, previousRewrite } = body

  const isRefinement = typeof refinementPrompt === 'string' && refinementPrompt.trim().length > 0
    && typeof previousRewrite === 'string' && previousRewrite.trim().length > 0

  // 'cv' mode (rewrite against an uploaded CV text) is reserved for future use;
  // the current UI always sends mode: 'bank'.
  if (!jobId || (!isRefinement && !['bank', 'cv'].includes(mode))) {
    return NextResponse.json({ error: 'Missing or invalid fields', code: 'INVALID_INPUT' }, { status: 400 })
  }

  if (isRefinement) {
    const safeRefinementPrompt = refinementPrompt.trim().slice(0, 500)
    const safePreviousRewrite = previousRewrite.slice(0, 12000)

    // Validate the job exists before charging — don't bill for a 404
    const { data: job } = await supabase
      .from('jobs')
      .select('role, company, raw_text, requirements')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found', code: 'NOT_FOUND' }, { status: 404 })

    const creditResult = await atomicDeductCredits(supabase, user.id, 'cv_refine', jobId)
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'cv_refine')

    const { data: bullets } = await supabase
      .from('bullet_bank')
      .select('bullet_id, text, type')
      .eq('user_id', user.id)
      .limit(50)

    const bulletBankStr = (bullets || [])
      .map(b => `[${b.bullet_id}] (${b.type}): ${b.text}`)
      .join('\n')

    try {
      const prompt = REWRITE_CV_REFINE_PROMPT(
        safePreviousRewrite,
        safeRefinementPrompt,
        { role: job.role, company: job.company, rawText: job.raw_text || undefined, requirements: job.requirements || [] },
        bulletBankStr,
      )

      const message = await callClaude({
        system: prompt.system,
        userContent: prompt.user,
        maxTokens: 6144,
        temperature: 'balanced',
      })

      const parsed = parseAIJson(extractText(message))
      return NextResponse.json(parsed)
    } catch (err) {
      console.error('[cv/rewrite-for-role refinement]', err)
      // Refund: the user was charged but the AI call/parse failed
      await refundCredits(supabase, user.id, 'cv_refine', jobId).catch(() => {})
      if (err instanceof Error && err.message.startsWith('Failed to parse')) {
        return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
      }
      return NextResponse.json({ error: 'AI refinement failed', code: 'INTERNAL_ERROR' }, { status: 500 })
    }
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, role, company, raw_text, requirements, fit_analysis, own_cv_text')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (!job.raw_text && !job.requirements?.length) {
    return NextResponse.json({ error: 'Job has no description to tailor against', code: 'INVALID_INPUT' }, { status: 422 })
  }

  const [profileRes, weRes, bulletRes, eduRes, certRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('bio, positioning_headline, experience, skills_core, skills_proficient, skills_familiar')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('work_experiences')
      .select('id, company, title, start_date, end_date, is_current')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('bullet_bank')
      .select('bullet_id, text, type, skill_tags, has_metric, metric_text, work_experience_id, role_context')
      .eq('user_id', user.id),
    supabase
      .from('education')
      .select('institution, degree, field_of_study')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('certifications')
      .select('name, issuing_organisation')
      .eq('user_id', user.id),
  ])

  const profile = profileRes.data
  const workExperiences = weRes.data || []
  const allBullets = bulletRes.data || []
  const education = eduRes.data || []
  const certifications = certRes.data || []

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Charge only after all validation passed — failures above cost the user nothing
  mainCreditResult = await atomicDeductCredits(supabase, user.id, 'cv_rewrite', jobId)
  if (!mainCreditResult.success) return insufficientCreditsResponse(mainCreditResult, 'cv_rewrite')

  const careerStory = mode === 'cv' && job.own_cv_text
    ? `UPLOADED CV TEXT:\n${stripPII(job.own_cv_text.slice(0, 3000))}\n\n${profile.experience || ''}`
    : profile.experience

  const fitAnalysis = job.fit_analysis as { archetype?: string; gaps?: string[] } | null

  const flatBullets = allBullets.map(b => ({
    bullet_id: b.bullet_id,
    text: b.text,
    type: b.type,
    work_experience_id: b.work_experience_id || null,
    role_context: b.role_context || null,
    skill_tags: b.skill_tags || [],
    has_metric: b.has_metric,
    metric_text: b.metric_text,
  }))

  const prompt = REWRITE_CV_FOR_ROLE_PROMPT(
    {
      role: job.role,
      company: job.company,
      rawText: job.raw_text || job.requirements?.join('\n') || '',
      requirements: job.requirements || [],
      archetype: fitAnalysis?.archetype,
      gaps: fitAnalysis?.gaps,
    },
    {
      bio: profile.bio,
      positioning_headline: profile.positioning_headline,
      careerStory,
      skills_core: profile.skills_core || [],
      skills_proficient: profile.skills_proficient || [],
      skills_familiar: profile.skills_familiar || [],
    },
    workExperiences,
    flatBullets,
    education,
    certifications
  )

  try {
    const message = await callClaude({
      system: prompt.system,
      userContent: prompt.user,
      maxTokens: 6144,
      temperature: 'deterministic',
    })

    const parsed = parseAIJson(extractText(message))
    validateCvRewrite(parsed)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[cv/rewrite-for-role]', err)
    if (mainCreditResult?.success) {
      await refundCredits(supabase, user.id, 'cv_rewrite', jobId).catch(() => {})
    }
    if (err instanceof Error && (err.message.startsWith('Failed to parse') || err.message.startsWith('AI output missing'))) {
      return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'AI rewrite failed', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[cv/rewrite-for-role outer]', err)
    // Refund if the user was charged but an error escaped the inner handlers
    if (mainCreditResult?.success) {
      await refundCredits(supabase, user.id, 'cv_rewrite').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
