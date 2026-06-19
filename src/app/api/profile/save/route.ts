import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { BulletBank } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { profile, bullets } = await req.json() as {
      profile: {
        bio?: string
        skills?: string[]
        skills_core?: string[]
        experience?: string
        job_titles?: string[]
        seniority?: string
        years_experience?: number
      }
      bullets: Partial<BulletBank>[]
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        bio: profile.bio,
        skills_core: profile.skills_core || profile.skills || [],
        experience: profile.experience,
        job_titles: profile.job_titles || [],
        seniority: profile.seniority,
        years_experience: profile.years_experience,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('[profile/save DB_ERROR]', profileError)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    const rows = bullets.map((b) => ({
      user_id: user.id,
      bullet_id: b.bullet_id,
      type: b.type,
      role_context: b.role_context || null,
      work_experience_id: b.work_experience_id || null,
      project_id: b.project_id || null,
      text: b.text,
      skill_tags: b.skill_tags || [],
      has_metric: b.has_metric || false,
      metric_text: b.metric_text || null,
    }))

    const { error: bulletsError } = await supabase
      .from('bullet_bank')
      .upsert(rows, { onConflict: 'user_id,bullet_id' })

    if (bulletsError) {
      console.error('[profile/save DB_ERROR]', bulletsError)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, bulletCount: rows.length })
  } catch (err) {
    console.error('[profile/save POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
