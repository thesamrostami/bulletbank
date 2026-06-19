'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, STATUS_COLORS, STATUSES, daysUntil } from '@/lib/utils'
import type { Job } from '@/types'
import FindJobsCard from '@/components/FindJobsCard'

type SortBy = 'date_desc' | 'date_asc' | 'fit_desc' | 'company_asc'

const JOBS_PER_PAGE = 18

// Left-border accent per status for cards
const STATUS_LEFT_BORDER: Record<string, string> = {
  'Saved':               'border-l-slate-300',
  'Applied':             'border-l-blue-400',
  'Screening':           'border-l-purple-400',
  'Interview Scheduled': 'border-l-amber-400',
  'Offer':               'border-l-green-500',
  'Rejected':            'border-l-red-300',
  'Withdrawn':           'border-l-gray-300',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  'Saved':               'bg-slate-300',
  'Applied':             'bg-blue-400',
  'Screening':           'bg-purple-400',
  'Interview Scheduled': 'bg-amber-400',
  'Offer':               'bg-green-500',
  'Rejected':            'bg-red-300',
  'Withdrawn':           'bg-gray-300',
}

function FitBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null
  const color = score >= 80 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 60 ? 'text-blue-700 bg-blue-50 border-blue-200'
    : score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${color}`}>
      {score}%
    </span>
  )
}

function EmptyState({ hasJobs, hasFilter }: { hasJobs: boolean; hasFilter: boolean }) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <svg className="w-12 h-12 text-gray-200 mb-4" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
          <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-gray-500 font-medium">No jobs match your filter</p>
        <Link href="/jobs" className="mt-2 text-sm text-[var(--accent)] hover:underline">Clear filter</Link>
      </div>
    )
  }
  if (!hasJobs) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--accent-light)] flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-[var(--accent)]" viewBox="0 0 40 40" fill="none">
            <rect x="5" y="8" width="30" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M12 17h16M12 22h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 28l4 4M28 26a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Paste a job posting and let AI analyse your fit, tailor your CV, and generate a cover letter.</p>
        <Link
          href="/jobs/new"
          className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          Add your first job →
        </Link>
      </div>
    )
  }
  return (
    <div className="text-center py-12 text-gray-400 text-sm">No jobs match your search.</div>
  )
}

function JobCard({ job }: { job: Job }) {
  const isInterview = job.status === 'Interview Scheduled' && job.interview_date
  const days = isInterview ? daysUntil(job.interview_date!) : null

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`group block bg-white border border-l-4 border-[var(--border)] ${STATUS_LEFT_BORDER[job.status] ?? 'border-l-gray-200'} rounded-xl p-4 hover:shadow-md transition-all`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 group-hover:text-[var(--navy)] transition-colors truncate">{job.company}</p>
          <p className="text-sm text-gray-500 truncate">{job.role}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[job.status]}`}>
            {job.status}
          </span>
          <FitBadge score={job.fit_score} />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
        {job.location && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M6 1a3.5 3.5 0 011 6.86V11H5V7.86A3.5 3.5 0 016 1z" stroke="currentColor" strokeWidth="1.2" /></svg>
            {job.location}
          </span>
        )}
        <span>{formatDate(job.date_applied)}</span>
        {isInterview && days !== null && (
          <span className="ml-auto text-amber-600 font-medium">
            Interview {days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`}
          </span>
        )}
      </div>
    </Link>
  )
}

function PipelineBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return null
  return (
    <div className="mb-6">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-2">
        {STATUSES.map(status => {
          const count = counts[status] ?? 0
          if (count === 0) return null
          return (
            <div
              key={status}
              className={`${STATUS_BAR_COLORS[status]} transition-all`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${status}: ${count}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {STATUSES.filter(s => (counts[s] ?? 0) > 0).map(status => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`inline-block w-2 h-2 rounded-full ${STATUS_BAR_COLORS[status]}`} />
            {status} <span className="font-semibold text-gray-700">{counts[status]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function JobTrackerContent() {
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') || 'All'

  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setCurrentPage(1) }, [statusFilter, debouncedSearch, sortBy])

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(d => { setAllJobs(d.jobs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allJobs.length }
    allJobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1 })
    return c
  }, [allJobs])

  const interviewJobs = useMemo(() =>
    allJobs.filter(j =>
      j.status === 'Interview Scheduled' &&
      j.interview_date &&
      daysUntil(j.interview_date) > -2
    ),
    [allJobs]
  )

  const displayedJobs = useMemo(() => {
    let jobs = [...allJobs]

    if (statusFilter !== 'All') {
      jobs = jobs.filter(j => j.status === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      jobs = jobs.filter(j =>
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case 'date_asc':
        jobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'fit_desc':
        jobs.sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
        break
      case 'company_asc':
        jobs.sort((a, b) => a.company.localeCompare(b.company))
        break
      default:
        jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return jobs
  }, [allJobs, statusFilter, debouncedSearch, sortBy])

  const totalPages = Math.ceil(displayedJobs.length / JOBS_PER_PAGE)
  const paginatedJobs = displayedJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  )

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">My Jobs</h1>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add job
        </Link>
      </div>

      {/* ── Job search ───────────────────────────────────────────── */}
      <div className="mb-6">
        <FindJobsCard />
      </div>

      {/* ── Pipeline bar ─────────────────────────────────────────── */}
      <PipelineBar counts={counts} total={allJobs.length} />

      {/* ── Upcoming interview alerts ─────────────────────────────── */}
      {interviewJobs.length > 0 && (
        <div className="mb-5 space-y-2">
          {interviewJobs.map(job => {
            const days = daysUntil(job.interview_date!)
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}/interview-prep`}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  <span className="text-sm font-medium text-amber-800">Interview —</span>
                  <span className="text-sm text-gray-700 truncate">{job.company} · {job.role}</span>
                </div>
                <span className="text-xs font-semibold text-amber-700 shrink-0">
                  {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`} · Prep now →
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Filter pills ──────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['All', ...STATUSES].map(s => (
          <Link
            key={s}
            href={s === 'All' ? '/jobs' : `/jobs?status=${encodeURIComponent(s)}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            {s}{counts[s] ? ` (${counts[s]})` : ''}
          </Link>
        ))}
      </div>

      {/* ── Search + sort ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        {displayedJobs.length > 0 && (
          <span className="text-xs text-[var(--text-muted)] mr-auto">
            {displayedJobs.length} job{displayedJobs.length !== 1 ? 's' : ''}
            {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
          </span>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company or role…"
          className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] w-full sm:w-56"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="fit_desc">Best fit first</option>
          <option value="company_asc">Company A–Z</option>
        </select>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paginatedJobs.length === 0 ? (
        <EmptyState hasJobs={allJobs.length > 0} hasFilter={statusFilter !== 'All' || debouncedSearch.trim().length > 0} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedJobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                {(currentPage - 1) * JOBS_PER_PAGE + 1}–{Math.min(currentPage * JOBS_PER_PAGE, displayedJobs.length)} of {displayedJobs.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-30 hover:bg-[var(--surface)] transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 5) return true
                    if (page === 1 || page === totalPages) return true
                    return Math.abs(page - currentPage) <= 1
                  })
                  .reduce<(number | 'ellipsis')[]>((acc, page, i, arr) => {
                    if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                    acc.push(page)
                    return acc
                  }, [])
                  .map((item, i) =>
                    item === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-2 text-[var(--text-muted)]">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          currentPage === item
                            ? 'bg-[var(--navy)] text-white'
                            : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-30 hover:bg-[var(--surface)] transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function JobTrackerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading…</div>}>
      <JobTrackerContent />
    </Suspense>
  )
}
