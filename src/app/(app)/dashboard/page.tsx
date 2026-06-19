import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_COLORS, daysUntil } from '@/lib/utils'
import type { Job } from '@/types'
import FindJobsCardServer from '@/components/FindJobsCardServer'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Status → bar colour (solid)
const STATUS_BAR_COLORS: Record<string, string> = {
  'Saved':               'bg-slate-300',
  'Applied':             'bg-blue-400',
  'Screening':           'bg-purple-400',
  'Interview Scheduled': 'bg-amber-400',
  'Offer':               'bg-green-500',
  'Rejected':            'bg-red-300',
  'Withdrawn':           'bg-gray-300',
}

const PIPELINE_ORDER = ['Applied', 'Screening', 'Interview Scheduled', 'Offer'] as const

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [jobsResult, profileResult, bulletResult] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('full_name, onboarding_complete, job_titles, job_search_locations, location_city, preferred_work_type').eq('user_id', user!.id).single(),
    supabase.from('bullet_bank').select('id, created_at', { count: 'exact' }).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1),
  ])

  const jobs: Job[] = (jobsResult.data || []) as Job[]
  const profile = profileResult.data
  const bulletCount = bulletResult.count ?? 0

  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const isNewUser = !profile?.onboarding_complete
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // Pipeline stats
  const statusCounts: Record<string, number> = {}
  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] ?? 0) + 1
  }

  const totalJobs = jobs.length
  const activeCount = PIPELINE_ORDER.reduce((n, s) => n + (statusCounts[s] ?? 0), 0)
  const interviewCount = statusCounts['Interview Scheduled'] ?? 0
  const offerCount = statusCounts['Offer'] ?? 0
  const appliedTotal = (statusCounts['Applied'] ?? 0) + (statusCounts['Screening'] ?? 0) + interviewCount + offerCount
  const responseRate = appliedTotal > 0
    ? Math.round(((statusCounts['Screening'] ?? 0) + interviewCount + offerCount) / appliedTotal * 100)
    : null

  // Upcoming interviews
  const upcomingInterviews = jobs
    .filter(j => j.status === 'Interview Scheduled' && j.interview_date && daysUntil(j.interview_date) > -2)
    .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime())

  // Recent jobs (last 5)
  const recentJobs = jobs.slice(0, 5)

  // Continue where you left off
  const inProgressJob = jobs.find(j => j.status === 'Applied' || j.status === 'Screening')

  return (
    <div className="p-6 md:p-10 max-w-5xl animate-fadeIn">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-0.5">
            {firstName ? `${greeting()}, ${firstName}` : 'Welcome to ApplyBullets'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {todayLabel}
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Job
        </Link>
      </div>

      {/* ── Onboarding prompt ─────────────────────────────────────── */}
      {isNewUser && (
        <div className="mb-8 p-6 bg-[var(--navy)] text-white rounded-2xl shadow-sm">
          <h2 className="text-base font-semibold mb-1">Get started — complete your profile</h2>
          <p className="text-sm text-blue-200 mb-4">AI matching and CV tailoring need your profile to be set up first.</p>
          <div className="space-y-2 mb-5">
            {[
              { label: 'Complete your profile', href: '/profile/onboarding', done: false },
              { label: 'Log your first achievement', href: '/profile/bullets', done: bulletCount > 0 },
              { label: 'Add your first job', href: '/jobs/new', done: jobs.length > 0 },
            ].map(step => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${step.done ? 'bg-[var(--success)] text-white' : 'bg-white/20 text-white'}`}>
                  {step.done ? '✓' : ''}
                </div>
                {step.done
                  ? <span className="text-sm text-blue-200 line-through">{step.label}</span>
                  : <Link href={step.href} className="text-sm text-white hover:underline">{step.label} →</Link>
                }
              </div>
            ))}
          </div>
          <Link href="/profile/onboarding" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[var(--navy)] rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors">
            Complete profile →
          </Link>
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      {totalJobs > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Applications', value: totalJobs, sub: 'tracked' },
            { label: 'Active pipeline', value: activeCount, sub: 'in progress' },
            { label: 'Interviews', value: interviewCount, sub: interviewCount === 1 ? 'scheduled' : 'scheduled' },
            { label: 'Response rate', value: responseRate !== null ? `${responseRate}%` : '—', sub: responseRate !== null ? 'of applications' : 'not enough data' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{stat.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Pipeline summary ──────────────────────────────────────── */}
      {totalJobs > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Pipeline</h2>
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            {/* Segmented bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden mb-4 bg-gray-100">
              {Object.entries(statusCounts)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <div
                    key={status}
                    className={`${STATUS_BAR_COLORS[status] ?? 'bg-gray-300'} transition-all`}
                    style={{ width: `${(count / totalJobs) * 100}%` }}
                    title={`${status}: ${count}`}
                  />
                ))}
            </div>
            {/* Status grid */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusCounts)
                .sort((a, b) => {
                  const order = ['Applied', 'Screening', 'Interview Scheduled', 'Offer', 'Saved', 'Rejected', 'Withdrawn']
                  return order.indexOf(a[0]) - order.indexOf(b[0])
                })
                .map(([status, count]) => (
                  <Link
                    key={status}
                    href={`/jobs?status=${encodeURIComponent(status)}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity hover:opacity-80 ${STATUS_COLORS[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                    {status}
                    <span className="font-bold">{count}</span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming interviews ───────────────────────────────────── */}
      {upcomingInterviews.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Upcoming interviews</h2>
          <div className="space-y-3">
            {upcomingInterviews.map(job => {
              const days = daysUntil(job.interview_date!)
              return (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div>
                    <p className="font-semibold text-gray-900">{job.company}</p>
                    <p className="text-sm text-gray-600">{job.role}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                      {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                    </span>
                    <Link href={`/jobs/${job.id}/interview-prep`} className="text-sm text-amber-800 font-medium hover:underline">
                      Prep now →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Find jobs ────────────────────────────────────────────── */}
      <section className="mb-8">
        <FindJobsCardServer
          job_titles={(profile?.job_titles as string[]) ?? []}
          job_search_locations={(profile?.job_search_locations as string[]) ?? []}
          location_city={(profile?.location_city as string | null) ?? null}
          preferred_work_type={(profile?.preferred_work_type as string) ?? 'Hybrid'}
        />
      </section>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        {/* ── Continue where you left off ────────────────────────── */}
        {inProgressJob && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Continue</h2>
            <Link
              href={`/jobs/${inProgressJob.id}`}
              className="flex items-center justify-between gap-3 p-5 bg-white border border-[var(--border)] rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2h8a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M8 6h4M8 9h4M8 12h2" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{inProgressJob.company}</p>
                  <p className="text-sm text-gray-500 truncate">{inProgressJob.role}</p>
                </div>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[inProgressJob.status]}`}>
                {inProgressJob.status}
              </span>
            </Link>
          </section>
        )}

        {/* ── Bullet bank health ───────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Bullet bank</h2>
          <div className="p-5 bg-white border border-[var(--border)] rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">
                {bulletCount === 0 ? 'No bullets yet' : `${bulletCount} bullet${bulletCount !== 1 ? 's' : ''}`}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {bulletCount === 0 ? 'Log your first achievement' : 'Achievements ready to use'}
              </p>
            </div>
            <Link
              href="/profile/bullets"
              className="shrink-0 px-4 py-2 text-sm font-medium text-[var(--accent)] border border-[var(--accent)] rounded-xl hover:bg-[var(--accent-light)] transition-colors"
            >
              {bulletCount === 0 ? 'Add first' : 'View all'}
            </Link>
          </div>
        </section>
      </div>

      {/* ── Recent activity ───────────────────────────────────────── */}
      {recentJobs.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recent</h2>
            <Link href="/jobs" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)]">
            {recentJobs.map(job => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.company}</p>
                  <p className="text-xs text-gray-500 truncate">{job.role}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[job.status]}`}>
                    {job.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick actions ─────────────────────────────────────────── */}
      {totalJobs === 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Get started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/jobs/new"
              className="flex items-center gap-3 p-4 bg-[var(--navy)] text-white rounded-2xl hover:bg-[var(--navy-light)] transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 4v12M4 10h12" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Add a Job</p>
                <p className="text-xs text-blue-300">Paste a job, get a tailored CV</p>
              </div>
            </Link>
            <Link
              href="/profile/bullets"
              className="flex items-center gap-3 p-4 bg-white border border-[var(--border)] rounded-2xl hover:shadow-md transition-all text-gray-700"
            >
              <svg className="w-5 h-5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h12M4 10h8M4 14h5" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Add Bullets</p>
                <p className="text-xs text-gray-400">Log your achievements</p>
              </div>
            </Link>
            <Link
              href="/profile/about"
              className="flex items-center gap-3 p-4 bg-white border border-[var(--border)] rounded-2xl hover:shadow-md transition-all text-gray-700"
            >
              <svg className="w-5 h-5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 18a6.5 6.5 0 0113 0" />
              </svg>
              <div>
                <p className="font-semibold text-sm">My Profile</p>
                <p className="text-xs text-gray-400">Set up your career story</p>
              </div>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
