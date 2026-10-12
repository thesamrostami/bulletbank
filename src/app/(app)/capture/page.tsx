import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CaptureClient from './CaptureClient'

export default async function CapturePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workExperiences } = await supabase
    .from('work_experiences')
    .select('id, company, title')
    .eq('user_id', user.id)
    .order('order_index')

  return (
    <div className="min-h-full">
      <CaptureClient
        workExperiences={(workExperiences || []) as Array<{ id: string; company: string; title: string }>}
      />
    </div>
  )
}
