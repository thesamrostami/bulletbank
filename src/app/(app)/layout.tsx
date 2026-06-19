import { createServerSupabaseClient } from '@/lib/supabase-server'
import SidebarClient from './SidebarClient'
import FAB from '@/components/FAB'
import { signOut } from '@/app/actions'
import { SIGNUP_CREDITS } from '@/lib/plans'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let onboardingComplete = true
  let fullName: string | null = null
  let email: string | null = null
  let workExperiences: Array<{ id: string; company: string; title: string }> = []
  let hasUpcomingInterviews = false

  if (user) {
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [profileResult, weResult, interviewResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('onboarding_complete, full_name, email')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('work_experiences')
        .select('id, company, title')
        .eq('user_id', user.id)
        .order('order_index'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'Interview Scheduled')
        .gte('interview_date', twoDaysAgo),
    ])
    onboardingComplete = profileResult.data?.onboarding_complete ?? true
    fullName = profileResult.data?.full_name ?? null
    email = profileResult.data?.email ?? null
    workExperiences = (weResult.data || []) as Array<{ id: string; company: string; title: string }>
    hasUpcomingInterviews = (interviewResult.count ?? 0) > 0

    // Grant signup credits on first visit. Atomic + idempotent at the DB level
    // (unique index on signup_grant), so concurrent first requests can't double-grant.
    await supabase.rpc('grant_signup_credits', {
      p_user_id: user.id,
      p_amount: SIGNUP_CREDITS,
    })
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <SidebarClient
        onboardingComplete={onboardingComplete}
        fullName={fullName}
        email={email}
        signOutAction={signOut}
        workExperiences={workExperiences}
        hasUpcomingInterviews={hasUpcomingInterviews}
      />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
      <FAB workExperiences={workExperiences} />
    </div>
  )
}
