import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import type { BulletBank, WorkExperience, Education, Certification, Project } from '@/types'

interface OnboardingPayload {
  profile: Record<string, unknown>
  workExperiences: Array<Partial<WorkExperience> & { bullets?: Partial<BulletBank>[] }>
  education: Partial<Education>[]
  certifications: Partial<Certification>[]
  projects: Partial<Project>[]
  summaryBullets: Partial<BulletBank>[]
  highlightBullets: Partial<BulletBank>[]
}

const ALLOWED_EDU_FIELDS = [
  'institution', 'degree', 'field_of_study', 'start_date',
  'end_date', 'is_current', 'grade', 'description',
]

const ALLOWED_CERT_FIELDS = [
  'name', 'issuing_organisation', 'issue_date', 'expiry_date',
  'no_expiry', 'credential_id', 'credential_url',
]

const ALLOWED_PROJECT_FIELDS = [
  'name', 'description', 'url', 'repo_url', 'tech_stack',
  'start_date', 'end_date', 'is_ongoing', 'highlight',
]

const ALLOWED_PROFILE_FIELDS = [
  'full_name', 'phone', 'location_city', 'location_country',
  'linkedin_url', 'portfolio_url', 'website_url', 'additional_links',
  'job_search_locations', 'work_authorisation', 'willing_to_relocate',
  'preferred_work_type', 'bio', 'positioning_headline',
  'skills_core', 'skills_proficient', 'skills_familiar', 'languages',
  'job_titles', 'seniority', 'years_experience', 'experience',
]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `save-onboarding:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const payload: OnboardingPayload = await req.json()
    const { profile, workExperiences, education, certifications, projects, summaryBullets, highlightBullets } = payload

    // 1. Upsert profile
    const safeProfile: Record<string, unknown> = {}
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (field in profile) safeProfile[field] = profile[field]
    }

    // The AI extraction prompts still emit github_url; fold it into additional_links
    // so an extracted GitHub link isn't silently dropped by the allowlist above
    if (typeof profile.github_url === 'string' && profile.github_url) {
      const links = Array.isArray(safeProfile.additional_links)
        ? (safeProfile.additional_links as Array<{ label?: string; url?: string }>)
        : []
      if (!links.some(l => l.url === profile.github_url)) {
        safeProfile.additional_links = [...links, { label: 'GitHub', url: profile.github_url }]
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { ...safeProfile, user_id: user.id, onboarding_complete: true, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (profileError) {
      console.error('[save-onboarding DB_ERROR]', profileError)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    // 2. Batch insert work experiences, capture returned IDs in order
    const expIdMap: Record<number, string> = {}
    if (workExperiences.length > 0) {
      const expRows = workExperiences.map((exp, i) => ({
        user_id: user.id,
        company: exp.company,
        title: exp.title,
        employment_type: exp.employment_type || 'Full-time',
        location: exp.location ?? null,
        is_remote: exp.is_remote ?? false,
        start_date: exp.start_date ?? new Date().toISOString().split('T')[0],
        end_date: exp.end_date ?? null,
        is_current: exp.is_current ?? false,
        description: exp.description ?? null,
        order_index: i,
      }))

      const { data: insertedExps, error: expError } = await supabase
        .from('work_experiences')
        .insert(expRows)
        .select('id')

      if (expError) {
        console.error('[save-onboarding DB_ERROR]', expError)
        return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
      }

      insertedExps?.forEach((row, i) => { expIdMap[i] = row.id })
    }

    // 3. Batch insert education
    if (education.length > 0) {
      const eduRows = education.map((edu, i) => {
        const safe: Record<string, unknown> = {}
        for (const field of ALLOWED_EDU_FIELDS) {
          if (field in edu) safe[field] = (edu as Record<string, unknown>)[field]
        }
        return { ...safe, user_id: user.id, order_index: i }
      })
      const { error } = await supabase.from('education').insert(eduRows)
      if (error) {
        console.error('[save-onboarding DB_ERROR]', error)
        return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
      }
    }

    // 4. Batch insert certifications
    if (certifications.length > 0) {
      const certRows = certifications.map((cert, i) => {
        const safe: Record<string, unknown> = {}
        for (const field of ALLOWED_CERT_FIELDS) {
          if (field in cert) safe[field] = (cert as Record<string, unknown>)[field]
        }
        return { ...safe, user_id: user.id, order_index: i }
      })
      const { error } = await supabase.from('certifications').insert(certRows)
      if (error) {
        console.error('[save-onboarding DB_ERROR]', error)
        return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
      }
    }

    // 5. Batch insert projects
    if (projects.length > 0) {
      const projRows = projects.map((proj, i) => {
        const safe: Record<string, unknown> = {}
        for (const field of ALLOWED_PROJECT_FIELDS) {
          if (field in proj) safe[field] = (proj as Record<string, unknown>)[field]
        }
        return { ...safe, user_id: user.id, order_index: i }
      })
      const { error } = await supabase.from('projects').insert(projRows)
      if (error) {
        console.error('[save-onboarding DB_ERROR]', error)
        return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
      }
    }

    // 6. Batch insert all bullets with FK mappings
    const expBullets = workExperiences.flatMap((exp, i) =>
      (exp.bullets || []).map(b => ({ ...b, work_experience_id: expIdMap[i] ?? null }))
    )

    const allBullets: Partial<BulletBank>[] = [...summaryBullets, ...highlightBullets, ...expBullets]

    if (allBullets.length > 0) {
      const bulletRows = allBullets.map(b => ({
        user_id: user.id,
        bullet_id: b.bullet_id,
        type: (['summary', 'highlight', 'experience', 'project'] as const).includes(b.type as 'summary') ? b.type : 'experience',
        text: b.text,
        skill_tags: b.skill_tags ?? [],
        has_metric: b.has_metric ?? false,
        metric_text: b.metric_text ?? null,
        source: 'onboarding',
        role_context: b.role_context ?? null,
        work_experience_id: b.work_experience_id ?? null,
        project_id: b.project_id ?? null,
        times_used: 0,
      }))

      const { error } = await supabase.from('bullet_bank').insert(bulletRows)
      if (error) {
        console.error('[save-onboarding DB_ERROR]', error)
        return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, bulletCount: allBullets.length })
  } catch (err) {
    console.error('[save-onboarding]', err)
    return NextResponse.json({ error: 'Failed to save onboarding data', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
