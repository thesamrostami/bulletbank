import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileTabs from './ProfileTabs'

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let onboardingComplete = false
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('user_id', user.id)
      .single()
    onboardingComplete = data?.onboarding_complete ?? false
  }

  return (
    <>
      <ProfileTabs onboardingComplete={onboardingComplete} />
      {children}
    </>
  )
}
