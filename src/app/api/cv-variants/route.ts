import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { data, error } = await supabase
      .from('cv_variants')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[cv-variants DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ variants: data || [] })
  } catch (err) {
    console.error('[cv-variants GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { name, summary_bullet_id, bullet_ids, deselected_skills } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required', code: 'BAD_REQUEST' }, { status: 400 })
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or fewer', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const { count } = await supabase
      .from('cv_variants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: 'Maximum 20 variants allowed. Delete one to continue.', code: 'LIMIT_EXCEEDED' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cv_variants')
      .insert({
        user_id: user.id,
        name: name.trim(),
        summary_bullet_id: summary_bullet_id || null,
        bullet_ids: bullet_ids || [],
        deselected_skills: deselected_skills || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[cv-variants DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ variant: data }, { status: 201 })
  } catch (err) {
    console.error('[cv-variants POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
