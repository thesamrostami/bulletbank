import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { UpdateExtractResult } from '@/types'
import { stripPII } from '@/lib/strip-pii'
import { extractPdfText } from '@/lib/extract-pdf-text'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { atomicDeductCredits, insufficientCreditsResponse, refundCredits } from '@/lib/rate-limit'
import type { AtomicDeductResult } from '@/lib/rate-limit'

const UPDATE_EXTRACT_SYSTEM = `You are analysing new career information provided by a user to update their existing profile.

Your job:
1. Identify anything NEW that is not already in the existing profile
2. Identify any UPDATES to existing entries (same company, new information about that role)
3. Do NOT repeat or re-extract things already in the profile
4. Extract structured data for each new item
5. Flag anything you cannot confidently categorise

Return ONLY valid JSON matching this shape — no markdown:
{
  "newWorkExperiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "employment_type": "Full-time",
      "location": null,
      "is_remote": false,
      "start_date": "2024-01-01",
      "end_date": null,
      "is_current": true,
      "description": null
    }
  ],
  "newEducation": [],
  "newCertifications": [
    {
      "name": "Cert Name",
      "issuing_organisation": "AWS",
      "issue_date": "2024-03-01",
      "expiry_date": null,
      "no_expiry": false
    }
  ],
  "newProjects": [],
  "newSkills": [
    { "skill": "Kubernetes", "suggestedLevel": "proficient" }
  ],
  "updatesToExisting": [
    {
      "type": "work_experience",
      "existingId": "",
      "existingLabel": "Company | Title | dates",
      "suggestedChanges": { "description": "new info about this role" }
    }
  ],
  "unclassified": ["any text that couldn't be structured"]
}

Dates must be ISO YYYY-MM-DD format. If only year/month known, use YYYY-MM-01.
For updatesToExisting, leave existingId as empty string — the client will map by label.
Only include items you are confident about.`

interface ExistingProfileSummary {
  workExperiences: Array<{ company: string; title: string; start_date: string; end_date: string | null }>
  education: Array<{ institution: string; degree: string | null }>
  certifications: Array<{ name: string; issuing_organisation: string | null }>
  skills: { core: string[]; proficient: string[]; familiar: string[] }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  let creditResult: AtomicDeductResult | undefined
  let userId: string | undefined

  try {
    const rl = await checkRateLimitWithDb(supabase, `update-extract:${user.id}`, { limit: 10, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    userId = user.id

    const { newText: rawNewText, fileContents: rawFileContents, pdfFiles, existingProfile } = await req.json() as {
      newText: string
      fileContents: string[]
      pdfFiles: Array<{ name: string; base64: string }>
      existingProfile: ExistingProfileSummary
    }

    if (!existingProfile || typeof existingProfile !== 'object' ||
        !Array.isArray(existingProfile.workExperiences)) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Charge after validation so invalid requests cost nothing
    creditResult = await atomicDeductCredits(supabase, user.id, 'profile_extraction')
    if (!creditResult.success) return insufficientCreditsResponse(creditResult, 'profile_extraction')

    const newText = rawNewText?.slice(0, 10000) ?? ''
    const fileContents = (rawFileContents || []).map((f: string) => f.slice(0, 10000))

    const pdfTexts: string[] = []
    for (const pdf of pdfFiles || []) {
      pdfTexts.push(await extractPdfText(pdf.base64))
    }

    const existingWorkStr = existingProfile.workExperiences
      .map(e => `- ${e.company} | ${e.title} | ${e.start_date} – ${e.end_date || 'present'}`)
      .join('\n') || '(none)'

    const existingEduStr = existingProfile.education
      .map(e => `- ${e.institution}${e.degree ? ` | ${e.degree}` : ''}`)
      .join('\n') || '(none)'

    const existingCertStr = existingProfile.certifications
      .map(e => `- ${e.name}${e.issuing_organisation ? ` | ${e.issuing_organisation}` : ''}`)
      .join('\n') || '(none)'

    const existingSkillStr = [
      existingProfile.skills.core.length ? `Core: ${existingProfile.skills.core.join(', ')}` : '',
      existingProfile.skills.proficient.length ? `Proficient: ${existingProfile.skills.proficient.join(', ')}` : '',
      existingProfile.skills.familiar.length ? `Familiar: ${existingProfile.skills.familiar.join(', ')}` : '',
    ].filter(Boolean).join('\n') || '(none)'

    const combinedText = stripPII([newText, ...(fileContents || []), ...pdfTexts].filter(Boolean).join('\n\n---\n\n'))

    const userContent = `EXISTING PROFILE SUMMARY:
Work experiences:
${existingWorkStr}

Education:
${existingEduStr}

Certifications:
${existingCertStr}

Skills:
${existingSkillStr}

NEW INFORMATION PROVIDED:
${combinedText}`

    const message = await callClaude({
      system: UPDATE_EXTRACT_SYSTEM,
      userContent,
      maxTokens: 4096,
      temperature: 'deterministic',
    })

    const result: UpdateExtractResult = parseAIJson(extractText(message))
    return NextResponse.json({ result })
  } catch (err) {
    if (creditResult?.success && userId) {
      await refundCredits(supabase, userId, 'profile_extraction').catch(() => {})
    }
    if (err instanceof Error && err.message.startsWith('Failed to parse')) {
      return NextResponse.json({ error: 'Failed to parse AI response', code: 'PARSE_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
