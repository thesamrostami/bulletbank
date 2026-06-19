import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'

const PROCESS_INTAKE_SYSTEM = `You are a world-class CV writer with expertise across all professional domains — healthcare, engineering, science, business analysis, sales, education, law, and technology. Using the extracted CV data and the candidate's answers to follow-up questions, generate a complete, polished profile.

Return ONLY valid JSON with this exact shape:
{
  "profile": {
    "full_name": null,
    "phone": null,
    "location_city": null,
    "location_country": null,
    "linkedin_url": null,
    "github_url": null,
    "portfolio_url": null,
    "bio": "2-3 sentence professional summary paragraph",
    "positioning_headline": "One compelling sentence positioning statement",
    "skills_core": ["skill1"],
    "skills_proficient": ["skill2"],
    "skills_familiar": ["skill3"],
    "languages": [],
    "job_titles": ["Target Role 1"],
    "seniority": "Mid-level",
    "years_experience": 5,
    "work_authorisation": null,
    "willing_to_relocate": false,
    "preferred_work_type": "Hybrid"
  },
  "workExperiences": [
    {
      "company": "Company",
      "title": "Title",
      "employment_type": "Full-time",
      "location": null,
      "is_remote": false,
      "start_date": "2020-01-01",
      "end_date": "2023-06-01",
      "is_current": false,
      "description": "Brief role summary",
      "order_index": 0,
      "bullets": [
        {
          "bullet_id": "e1",
          "type": "experience",
          "text": "Strong bullet point...",
          "skill_tags": ["tag1"],
          "has_metric": false,
          "metric_text": null,
          "role_context": "Company"
        }
      ]
    }
  ],
  "education": [
    {
      "institution": "University",
      "degree": "BSc",
      "field_of_study": "Computer Science",
      "start_date": "2016-09-01",
      "end_date": "2020-06-01",
      "is_current": false,
      "grade": null,
      "order_index": 0
    }
  ],
  "certifications": [],
  "projects": [],
  "summaryBullets": [
    {
      "bullet_id": "S1",
      "type": "summary",
      "text": "Summary variant...",
      "skill_tags": [],
      "has_metric": false,
      "metric_text": null,
      "role_context": null
    }
  ],
  "highlightBullets": [
    {
      "bullet_id": "k1",
      "type": "highlight",
      "text": "Key highlight bullet...",
      "skill_tags": ["tag"],
      "has_metric": true,
      "metric_text": "~10%",
      "role_context": null
    }
  ]
}

Rules:
- Generate 2-3 summary variants with different role focuses appropriate to this person's actual domain
- Generate 5-8 key highlight bullets (strongest cross-cutting achievements) using domain-appropriate action verbs and metrics
- Generate 3-5 experience bullets per work experience role using verbs appropriate to that role's domain
- job_titles must reflect realistic roles in the candidate's ACTUAL domain — do not suggest software engineering roles for medical/science/engineering professionals unless there is explicit evidence of a dual background
- seniority should be calibrated to the candidate's domain — a GP or consultant engineer with 5+ years is Senior, not Graduate
- Use domain-appropriate action verbs: healthcare (Treated, Managed, Diagnosed), science (Investigated, Analysed, Published), engineering (Designed, Engineered, Commissioned), business (Facilitated, Delivered, Negotiated), sales (Generated, Exceeded, Secured), tech (Built, Deployed, Architected)
- NEVER use tech startup language (shipped, iterated, scaled) for non-tech roles
- All dates must be full ISO dates: YYYY-MM-DD (use -01-01 or -01 if only year/month known)
- Seniority must be one of: Graduate, Mid-level, Senior, Lead, Head
- preferred_work_type must be one of: Remote, Hybrid, On-site, Flexible
- employment_type must be one of: Full-time, Part-time, Contract, Freelance, Internship, Apprenticeship, Volunteer`

export async function POST(req: NextRequest) {
  let creditResult: AtomicDeductResult | undefined
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | undefined
  let userId: string | undefined

  try {
    supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    userId = user.id

    const rl = await checkRateLimitWithDb(supabase, `process-intake:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { extractedData, questionAnswers } = await req.json() as {
      extractedData: {
        profile: Record<string, unknown>
        workExperiences: Array<Record<string, unknown>>
        education: Array<Record<string, unknown>>
        certifications: Array<Record<string, unknown>>
        projects: Array<Record<string, unknown>>
      }
      questionAnswers: Array<{ field: string; question: string; answer: string }>
    }

    if (!extractedData || typeof extractedData !== 'object' || Array.isArray(extractedData) || !Array.isArray(questionAnswers)) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Charge after validation so invalid requests cost nothing
    creditResult = await atomicDeductCredits(supabase, user.id, 'profile_extraction')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'profile_extraction')

    const answersText = questionAnswers
      .filter(a => a.answer?.trim())
      .map(a => `Q (${a.field}): ${a.question}\nA: ${a.answer.slice(0, 1000)}`)
      .join('\n\n')

    const userContent = `EXTRACTED CV DATA:
${JSON.stringify(extractedData, null, 2)}

CANDIDATE'S ANSWERS:
${answersText || 'No additional answers provided.'}`

    const message = await callClaude({
      system: PROCESS_INTAKE_SYSTEM,
      userContent,
      maxTokens: 8192,
      temperature: 'deterministic',
    })

    const processed = parseAIJson(extractText(message))
    return NextResponse.json({ processed })
  } catch (err) {
    console.error('[profile/process-intake POST]', err)
    if (creditResult?.success && userId && supabase) {
      await refundCredits(supabase, userId, 'profile_extraction').catch(() => {})
    }
    if (err instanceof Error && err.message.startsWith('Failed to parse')) {
      return NextResponse.json({ error: 'Failed to parse AI response', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
