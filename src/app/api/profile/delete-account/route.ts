import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'
import { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `delete-account:${user.id}`, { limit: 5, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { confirm } = await req.json()
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    }

    const tables = [
      'usage_logs',
      'debrief_insights',
      'cv_variants',
      'bullet_bank',
      'work_experiences',
      'education',
      'certifications',
      'projects',
      'jobs',
      'profiles',
    ]

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error(`[delete-account] Failed to delete from ${table}:`, error.message)
      }
    }

    const { data: files } = await supabase
      .storage
      .from('job-documents')
      .list(user.id)

    if (files && files.length > 0) {
      const paths = files.map(f => `${user.id}/${f.name}`)
      await supabase.storage.from('job-documents').remove(paths)
    }

    const adminClient = createClient(
      NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteAuthError) {
      console.error('[delete-account] Failed to delete auth user:', deleteAuthError.message)
      return NextResponse.json({
        error: 'Account data deleted but auth record could not be removed.',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-account POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
