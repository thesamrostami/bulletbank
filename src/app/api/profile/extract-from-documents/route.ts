import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripPII } from '@/lib/strip-pii'
import { extractPdfText } from '@/lib/extract-pdf-text'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'

const EXTRACT_DOCS_SYSTEM = `Extract structured CV data from the documents provided. Only extract information you can see with confidence — leave everything else null/empty.

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
    "bio": null,
    "positioning_headline": null,
    "skills_core": [],
    "skills_proficient": [],
    "skills_familiar": [],
    "languages": [],
    "job_titles": [],
    "seniority": null,
    "years_experience": null
  },
  "workExperiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "employment_type": "Full-time",
      "location": null,
      "is_remote": false,
      "start_date": "2020-01",
      "end_date": "2023-06",
      "is_current": false,
      "description": "Role description if available"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "BSc Computer Science",
      "field_of_study": null,
      "start_date": "2016-09",
      "end_date": "2020-06",
      "is_current": false,
      "grade": null
    }
  ],
  "certifications": [],
  "projects": []
}

Dates should be in YYYY-MM format. If only year is known, use YYYY-01.
For skills, sort by apparent depth of experience.`

export async function POST(req: NextRequest) {
  // Tracked at function scope so the catch block can refund a charged-but-failed request
  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined
  const supabase = await createServerSupabaseClient()
  // Outer try/catch: req.json() on a malformed body would otherwise throw unhandled
  try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  userId = user.id

  const rl = await checkRateLimitWithDb(supabase, `extract-from-documents:${user.id}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Parse the body before charging — a malformed request should cost nothing
  const { textContents, pdfFiles } = await req.json() as {
    textContents: string[]
    pdfFiles: Array<{ name: string; base64: string }>
  }

  creditResult = await atomicDeductCredits(supabase, user.id, 'profile_extraction')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'profile_extraction')

  const pdfTexts: string[] = []
  for (const pdf of pdfFiles || []) {
    pdfTexts.push(await extractPdfText(pdf.base64))
  }

  const combinedText = stripPII(
    [...(textContents || []), ...pdfTexts].filter(Boolean).join('\n\n---\n\n')
  )

  try {
    const message = await callClaude({
      system: EXTRACT_DOCS_SYSTEM,
      userContent: combinedText ? `DOCUMENT TEXT:\n${combinedText}` : 'No document text provided.',
      maxTokens: 4096,
      temperature: 'deterministic',
    })

    const extracted = parseAIJson(extractText(message))
    return NextResponse.json({ extracted })
  } catch {
    // Refund: the user was charged but the AI call/parse failed
    await refundCredits(supabase, user.id, 'profile_extraction').catch(() => {})
    return NextResponse.json({ error: 'Failed to parse AI response', code: 'PARSE_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[profile/extract-from-documents POST]', err)
    // Refund: covers PDF-extraction failures after the deduction
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'profile_extraction').catch(() => {})
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
