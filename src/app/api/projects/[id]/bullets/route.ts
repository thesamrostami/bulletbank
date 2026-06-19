import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

const ALLOWED_BULLET_FIELDS = [
  'bullet_id', 'text', 'role_context', 'skill_tags',
  'has_metric', 'metric_text', 'star_story', 'source',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `bullets:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!proj) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    const { data, error } = await supabase
      .from('bullet_bank')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[projects/:id/bullets DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ bullets: data })
  } catch (err) {
    console.error('[projects/:id/bullets GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `bullets:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!proj) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    const body = await req.json()

    const safeBody: Record<string, unknown> = {}
    for (const field of ALLOWED_BULLET_FIELDS) {
      if (field in body) safeBody[field] = body[field]
    }

    const { data, error } = await supabase
      .from('bullet_bank')
      .insert({
        ...safeBody,
        user_id: user.id,
        project_id: id,
        type: body.type || 'project',
      })
      .select()
      .single()

    if (error) {
      console.error('[projects/:id/bullets DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ bullet: data }, { status: 201 })
  } catch (err) {
    console.error('[projects/:id/bullets POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
