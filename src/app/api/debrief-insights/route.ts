import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `debrief:${user.id}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { jobId, questions, roleArchetype } = await req.json() as {
      jobId: string
      questions: Array<{
        question: string
        type?: string
        bulletIdsUsed?: string[]
        outcome?: string
        notes?: string
      }>
      roleArchetype?: string
    }

    if (!jobId || !questions?.length) {
      return NextResponse.json({ error: 'jobId and questions required', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found', code: 'NOT_FOUND' }, { status: 404 })

    const rows = questions.map(q => ({
      user_id: user.id,
      job_id: jobId,
      question: q.question,
      question_type: q.type || null,
      role_archetype: roleArchetype || null,
      bullet_ids_used: q.bulletIdsUsed || [],
      outcome: q.outcome || null,
      user_notes: q.notes || null,
    }))

    const { error } = await supabase.from('debrief_insights').insert(rows)
    if (error) {
      console.error('[debrief-insights DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ saved: rows.length })
  } catch (err) {
    console.error('[debrief-insights POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `debrief:${user.id}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { searchParams } = new URL(req.url)
    const archetype = searchParams.get('archetype')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('debrief_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (archetype) query = query.eq('role_archetype', archetype)

    const { data, error } = await query
    if (error) {
      console.error('[debrief-insights DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ insights: data || [] })
  } catch (err) {
    console.error('[debrief-insights GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
