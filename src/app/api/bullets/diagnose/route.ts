import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai-client'
import { parseAIJson, extractText } from '@/lib/parse-ai-json'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import type { BulletDiagnosis } from '@/types'

const SYSTEM = `You are a professional CV writer reviewing a single bullet point for quality.

Analyse the bullet and return ONLY valid JSON — no markdown:
{
  "weaknesses": ["specific issue 1", "specific issue 2"],
  "hasImprovementPotential": true,
  "question": "one targeted question to get missing information, or null if no question needed",
  "improvedVersion": "a directly improved version if possible without extra info, or null"
}

Rules:
- weaknesses: be specific. Not "lacks metric" but "No outcome stated — what happened as a result of this work?"
- hasImprovementPotential: false only if the bullet is genuinely as specific as it can be, or if improving it would require inventing information
- question: null if you can already improve it, or if there is genuinely nothing more to ask
- improvedVersion: null if you need the question answered first. If you CAN improve it from available context, do so directly.
- Never suggest adding fake metrics. If no metric is available, improve the action verb and specificity instead.
- If the bullet is actually fine (would score Good or Strong), set hasImprovementPotential to false and return ["This bullet is already well-written"] in weaknesses.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `bullet-diagnose:${user.id}`, { limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const raw = await req.json() as {
      bulletText: string
      roleContext: string | null
      skillTags: string[]
      metricText: string | null
    }

    if (typeof raw.bulletText !== 'string' || raw.bulletText.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const bulletText = (raw.bulletText ?? '').slice(0, 1000)
    const roleContext = raw.roleContext ? raw.roleContext.slice(0, 200) : null
    // Guard: a body without skillTags previously crashed on .length below
    const skillTags = Array.isArray(raw.skillTags) ? raw.skillTags : []
    const metricText = raw.metricText ? raw.metricText.slice(0, 200) : null

    const message = await callClaude({
      system: SYSTEM,
      userContent: `BULLET: ${bulletText}
ROLE CONTEXT: ${roleContext || 'standalone highlight'}
SKILL TAGS: ${skillTags.length > 0 ? skillTags.join(', ') : 'none'}
EXISTING METRIC: ${metricText || 'none'}`,
      maxTokens: 512,
      temperature: 'deterministic',
    })

    const diagnosis: BulletDiagnosis = parseAIJson(extractText(message))
    return NextResponse.json({ diagnosis })
  } catch (err) {
    console.error('[bullets/diagnose POST]', err)
    return NextResponse.json({ error: 'Failed to diagnose bullet', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
