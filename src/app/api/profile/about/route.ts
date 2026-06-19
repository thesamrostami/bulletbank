import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[profile/about GET DB_ERROR]', error)
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ profile: data || null })
  } catch (err) {
    console.error('[profile/about GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()

  const ALLOWED_PROFILE_FIELDS = [
    'full_name', 'phone', 'location_city', 'location_country',
    'linkedin_url', 'portfolio_url', 'website_url', 'additional_links',
    'job_search_locations', 'work_authorisation', 'willing_to_relocate',
    'preferred_work_type', 'bio', 'positioning_headline',
    'skills_core', 'skills_proficient', 'skills_familiar', 'languages',
    'job_titles', 'seniority', 'years_experience', 'experience',
    'onboarding_complete',
  ]

  const safeUpdate: Record<string, unknown> = {}
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (field in body) safeUpdate[field] = body[field]
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { ...safeUpdate, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[profile/about DB_ERROR]', error)
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[profile/about PATCH]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
