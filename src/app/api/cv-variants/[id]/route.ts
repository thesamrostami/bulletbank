import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()

    const ALLOWED_FIELDS = ['name', 'last_used_at', 'summary_bullet_id', 'bullet_ids', 'deselected_skills']
    const update: Record<string, unknown> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) update[field] = body[field]
    }

    if (update.name && typeof update.name === 'string' && update.name.length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or fewer', code: 'BAD_REQUEST' }, { status: 400 })
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cv_variants')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[cv-variants/:id DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ variant: data })
  } catch (err) {
    console.error('[cv-variants/:id PATCH]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { error } = await supabase
      .from('cv_variants')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[cv-variants/:id DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cv-variants/:id DELETE]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
