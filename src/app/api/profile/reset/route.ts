import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const uid = user.id

  // Delete in FK-safe order
  const steps = [
    supabase.from('bullet_bank').delete().eq('user_id', uid),
    supabase.from('work_experiences').delete().eq('user_id', uid),
    supabase.from('education').delete().eq('user_id', uid),
    supabase.from('certifications').delete().eq('user_id', uid),
    supabase.from('projects').delete().eq('user_id', uid),
  ]

  for (const step of steps) {
    const { error } = await step
    if (error) {
      console.error('[profile/reset DB_ERROR]', error)
      return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: null,
      phone: null,
      location_city: null,
      location_country: null,
      linkedin_url: null,
      github_url: null,
      portfolio_url: null,
      website_url: null,
      additional_links: [], // links moved here from github_url (migration 027) — must reset too

      job_search_locations: [],
      work_authorisation: null,
      willing_to_relocate: false,
      preferred_work_type: 'Hybrid',
      bio: null,
      positioning_headline: null,
      skills_core: [],
      skills_proficient: [],
      skills_familiar: [],
      languages: [],
      job_titles: [],
      seniority: null,
      years_experience: null,
      experience: null,
      onboarding_complete: false,
      conversation_history: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', uid)

  if (profileError) {
    console.error('[profile/reset DB_ERROR]', profileError)
    return NextResponse.json({ error: 'A database error occurred', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[profile/reset POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
