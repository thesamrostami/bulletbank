import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import InterviewPrepClient from './InterviewPrepClient'
import { asStoredPrep } from '@/lib/interview-prep'
import type { CVSnapshot, FitAnalysis } from '@/types'

export default async function InterviewPrepPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Use select('*') so the query works even before new-column migrations have run.
  // Explicitly listing new columns (own_cv_url etc.) causes PostgREST to 400-error
  // on databases where those columns don't exist yet, making `job` come back null.
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!job) redirect('/jobs')

  return (
    <InterviewPrepClient
      jobId={id}
      cachedPrep={asStoredPrep(job.interview_prep)}
      jobSummary={{
        company: job.company,
        role: job.role,
        requirements: job.requirements || [],
        cvSnapshot: (job.cv_snapshot as CVSnapshot) ?? null,
        coverLetter: job.cover_letter ?? null,
        fitAnalysis: (job.fit_analysis as FitAnalysis) ?? null,
        ownCvUrl: job.own_cv_url ?? null,
        ownCvFilename: job.own_cv_filename ?? null,
        ownCvText: job.own_cv_text ?? null,
        ownCoverLetterUrl: job.own_cover_letter_url ?? null,
        ownCoverLetterFilename: job.own_cover_letter_filename ?? null,
        interviewDate: job.interview_date ?? null,
      }}
    />
  )
}
