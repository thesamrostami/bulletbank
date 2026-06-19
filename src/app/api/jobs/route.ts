import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `jobs:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'All') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('[jobs DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ jobs: data })
  } catch (err) {
    console.error('[jobs GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `jobs:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()

    const ALLOWED_JOB_FIELDS = [
      'url', 'company', 'role', 'location', 'raw_text',
      'requirements', 'status', 'date_applied', 'notes',
      'cv_bullet_ids', 'cv_summary_id', 'document_source', 'cv_rewrite_source',
    ]
    const safeBody: Record<string, unknown> = {}
    for (const field of ALLOWED_JOB_FIELDS) {
      if (field in body) safeBody[field] = body[field]
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...safeBody,
        user_id: user.id,
        date_applied: safeBody.date_applied || new Date().toISOString().split('T')[0],
        status: safeBody.status || 'Applied',
        requirements: safeBody.requirements || [],
        cv_bullet_ids: safeBody.cv_bullet_ids || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[jobs DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ job: data }, { status: 201 })
  } catch (err) {
    console.error('[jobs POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
