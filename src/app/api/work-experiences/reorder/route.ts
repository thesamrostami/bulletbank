import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { ids } = await req.json() as { ids: string[] }

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'ids must be an array', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const updates = ids.map((id, index) =>
      supabase
        .from('work_experiences')
        .update({ order_index: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[work-experiences/reorder POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
