import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateBulletArray } from '@/lib/validate-ai-output'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const SYSTEM = `You are an expert CV writer with knowledge across all professional domains. Generate 4-5 strong bullet points for the role described.

Return ONLY valid JSON — no markdown, no explanation:
[
  {
    "text": "Strong action verb + achievement + impact/metric",
    "skill_tags": ["tag1", "tag2"],
    "has_metric": false,
    "metric_text": null
  }
]

Rules:
- Detect the professional domain from the role title and description (healthcare, engineering, science, business, sales, technology, etc.)
- Use domain-appropriate action verbs:
  Healthcare/Medical: Treated, Managed, Diagnosed, Delivered, Coordinated, Assessed, Conducted
  Science/Research: Investigated, Conducted, Analysed, Developed, Optimised, Characterised
  Engineering: Designed, Engineered, Commissioned, Optimised, Specified, Integrated, Tested
  Business/BA: Facilitated, Elicited, Delivered, Negotiated, Mapped, Streamlined, Modelled
  Sales: Generated, Exceeded, Managed, Converted, Expanded, Negotiated, Secured
  Technology: Built, Deployed, Architected, Implemented, Automated, Reduced, Integrated
- Include metrics ONLY if the description explicitly contains numbers, percentages, or measurable outcomes. If no numbers are present in the description, set has_metric to false and write the bullet WITHOUT any percentages, counts, dollar amounts, or fabricated figures
- NEVER invent team sizes, revenue figures, percentage improvements, or user counts
- NEVER use tech startup language (shipped, iterated, scaled) for non-tech roles
- Keep bullets to 1-2 lines, punchy and specific
- Vary the focus: core achievement, team/leadership, business impact, process improvement`

export async function POST(req: NextRequest) {
  // Outer try/catch: req.json() on a malformed body would otherwise throw unhandled
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `bullet-gen-exp:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { workExperienceId, company, title, description: rawDescription, employmentType } = await req.json() as {
    workExperienceId: string
    company: string
    title: string
    description?: string
    employmentType?: string
  }
  const description = rawDescription?.slice(0, 2000)

  const { data: exp } = await supabase
    .from('work_experiences')
    .select('id')
    .eq('id', workExperienceId)
    .eq('user_id', user.id)
    .single()

  if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const creditResult = await atomicDeductCredits(supabase, user.id, 'bullet_generation')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'bullet_generation')

  const userContent = `ROLE: ${title} at ${company} (${employmentType || 'Full-time'})
${description ? `DESCRIPTION:\n${description}` : ''}`

  try {
    const message = await callClaude({
      system: SYSTEM,
      userContent,
      maxTokens: 1024,
      temperature: 'creative',
    })

    const bullets = parseAIJson(extractText(message))
    validateBulletArray(bullets)
    return NextResponse.json({ bullets })
  } catch (err) {
    console.error('[bullets/generate-for-experience]', err)
    // Refund: the user was charged but the AI call/parse failed
    await refundCredits(supabase, user.id, 'bullet_generation').catch(() => {})
    if (err instanceof Error && (err.message.startsWith('Failed to parse') || err.message.startsWith('AI returned'))) {
      return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to parse AI response', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[bullets/generate-for-experience POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
