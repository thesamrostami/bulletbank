import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `bullets:${user.id}`, { limit: 120, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const workExperienceId = searchParams.get('work_experience_id')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('bullet_bank')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (type) query = query.eq('type', type)
    if (workExperienceId) query = query.eq('work_experience_id', workExperienceId)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      console.error('[bullets DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ bullets: data })
  } catch (err) {
    console.error('[bullets GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `bullets:${user.id}`, { limit: 120, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()

    const ALLOWED_BULLET_FIELDS = [
      'bullet_id', 'type', 'role_context', 'work_experience_id',
      'project_id', 'text', 'skill_tags', 'has_metric',
      'metric_text', 'star_story', 'source', 'is_finalised',
    ]
    const safeBody: Record<string, unknown> = {}
    for (const field of ALLOWED_BULLET_FIELDS) {
      if (field in body) safeBody[field] = body[field]
    }

    const { data, error } = await supabase
      .from('bullet_bank')
      .insert({
        ...safeBody,
        user_id: user.id,
        work_experience_id: safeBody.work_experience_id || null,
        project_id: safeBody.project_id || null,
        skill_tags: safeBody.skill_tags || [],
        has_metric: safeBody.has_metric || false,
        times_used: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[bullets DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ bullet: data }, { status: 201 })
  } catch (err) {
    console.error('[bullets POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
