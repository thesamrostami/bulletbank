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

    const ALLOWED_PROJECT_FIELDS = [
      'name', 'description', 'url', 'repo_url', 'tech_stack',
      'start_date', 'end_date', 'is_ongoing', 'highlight', 'order_index',
    ]

    const safeUpdate: Record<string, unknown> = {}
    for (const field of ALLOWED_PROJECT_FIELDS) {
      if (field in body) safeUpdate[field] = body[field]
    }

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .update(safeUpdate)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[projects/:id DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ project: data })
  } catch (err) {
    console.error('[projects/:id PATCH]', err)
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
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[projects/:id DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[projects/:id DELETE]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
