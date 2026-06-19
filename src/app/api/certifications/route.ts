import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `certifications:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[certifications DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ certifications: data })
  } catch (err) {
    console.error('[certifications GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `certifications:${user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await req.json()

    const ALLOWED_CERT_FIELDS = [
      'name', 'issuing_organisation', 'issue_date', 'expiry_date',
      'no_expiry', 'credential_id', 'credential_url',
    ]
    const safeBody: Record<string, unknown> = {}
    for (const field of ALLOWED_CERT_FIELDS) {
      if (field in body) safeBody[field] = body[field]
    }

    const { count } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data, error } = await supabase
      .from('certifications')
      .insert({ ...safeBody, user_id: user.id, order_index: count ?? 0 })
      .select()
      .single()

    if (error) {
      console.error('[certifications DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ certification: data }, { status: 201 })
  } catch (err) {
    console.error('[certifications POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
