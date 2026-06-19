import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { validateExtractedJob } from '@/lib/validate-ai-output'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import type { ExtractedJob } from '@/types'

const IMAGE_EXTRACT_SYSTEM = `You are a job application intelligence system. Extract structured information from this job posting screenshot with high accuracy.

Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{
  "company": "Company name",
  "role": "Job title as written in the posting",
  "location": "City, Country or Remote or Hybrid",
  "requirements": ["requirement 1", "requirement 2", ...],
  "raw_text": ""
}

Requirements extraction rules:
- Include both must-have and nice-to-have, but ORDER them: must-haves first, nice-to-haves last
- Prefix nice-to-haves with "Nice to have: "
- Keep each requirement concise (max 10 words)
- Capture: technical skills, tools, years of experience, soft skills, domain knowledge, certifications
- Max 15 requirements total
- Do NOT duplicate; collapse similar items`

export async function POST(req: NextRequest) {
  // Outer try/catch: formData() on a malformed body would otherwise throw unhandled
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimitWithDb(supabase, `extract-image:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Validate FIRST — don't charge for bad requests
  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const validTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid image type. Use PNG, JPG, or WebP.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 400 })
  }

  // THEN charge
  const creditResult = await atomicDeductCredits(supabase, user.id, 'job_extraction')
  if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'job_extraction')

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/png' | 'image/jpeg' | 'image/webp'

    const message = await callClaude({
      system: IMAGE_EXTRACT_SYSTEM,
      userContent: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Extract the job posting information from this image.' },
      ],
      maxTokens: 1024,
      temperature: 'deterministic',
    })

    const extracted = parseAIJson<ExtractedJob>(extractText(message))
    validateExtractedJob(extracted)
    extracted.raw_text = ''

    return NextResponse.json({ extracted })
  } catch (err) {
    console.error('[extract-job-image]', err)
    // Refund: the user was charged but the AI call/parse failed
    await refundCredits(supabase, user.id, 'job_extraction').catch(() => {})
    if (err instanceof Error && err.message.startsWith('AI output missing')) {
      return NextResponse.json({ error: 'AI returned invalid structure — please retry', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Extraction failed', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  } catch (err) {
    console.error('[extract-job-image POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
