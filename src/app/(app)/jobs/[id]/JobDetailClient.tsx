'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Job, JobStatus, CategorisedGap, InterviewDebrief } from '@/types'
import type { TemplateName } from '@/lib/cv-templates'
import { formatDate, STATUS_COLORS, STATUSES, ARCHETYPE_LABELS } from '@/lib/utils'
import InterviewDebriefModal from '@/components/InterviewDebriefModal'

type Tab = 'overview' | 'documents' | 'interview'

export default function JobDetailClient({ job: initial }: { job: Job }) {
  const router = useRouter()
  const [job, setJob] = useState(initial)
  const [analysingFit, setAnalysingFit] = useState(false)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [interviewDate, setInterviewDate] = useState(
    initial.interview_date ? initial.interview_date.slice(0, 10) : ''
  )
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null)
  const [showDebriefModal, setShowDebriefModal] = useState(false)
  const [debriefSaved, setDebriefSaved] = useState(false)
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [clText, setClText] = useState(initial.cover_letter ?? '')
  const [savingDate, setSavingDate] = useState(false)
  const [dateSaved, setDateSaved] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [downloadingCv, setDownloadingCv] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingCL, setDownloadingCL] = useState(false)
  const [downloadingCLPdf, setDownloadingCLPdf] = useState(false)
  const [clCopied, setClCopied] = useState(false)
  const [cvDownloadError, setCvDownloadError] = useState('')
  const [clDownloadError, setClDownloadError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>(
    initial.status === 'Interview Scheduled' ? 'interview' : 'overview'
  )

  useEffect(() => {
    if (job.fit_analysis || !job.requirements?.length) return
    setAnalysingFit(true)
    fetch('/api/jobs/analyse-fit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobData: {
          company: job.company,
          role: job.role,
          requirements: job.requirements,
          raw_text: job.raw_text || '',
        },
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const fitAnalysis = {
          matched: data.matched || [],
          partial: data.partial || [],
          gaps: data.gaps || [],
          summary: data.summary || '',
          categorisedGaps: data.categorisedGaps,
          transferability_note: data.transferability_note ?? null,
          archetype: data.archetype,
          archetype_framing: data.archetype_framing,
        }
        setJob(j => ({ ...j, fit_analysis: fitAnalysis, fit_score: data.score ?? null }))
        fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fit_analysis: fitAnalysis, fit_score: data.score ?? null }),
        }).then(res => {
          if (!res.ok) console.error('[fit-analysis] Failed to save fit analysis:', res.status)
        }).catch(err => console.error('[fit-analysis] Failed to save fit analysis:', err))
      })
      .catch(err => console.error('[fit-analysis] Failed to fetch fit analysis:', err))
      .finally(() => setAnalysingFit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; job.id is stable from server props and re-fetching on every render would cause a loop
  }, [])

  const patch = async (data: Partial<Job>) => {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const { job: updated } = await res.json()
      setJob(updated)
    }
  }

  const handleStatusChange = (status: JobStatus) => {
    if (job.status === 'Interview Scheduled' && status !== 'Interview Scheduled') {
      setPendingStatus(status)
      setShowDebriefModal(true)
      return
    }
    setJob((j) => ({ ...j, status }))
    if (status !== 'Interview Scheduled') {
      patch({ status })
    }
  }

  const handleDebriefSaved = (debrief: InterviewDebrief) => {
    setJob((j) => ({ ...j, status: pendingStatus!, interview_debrief: debrief }))
    setShowDebriefModal(false)
    setPendingStatus(null)
    setDebriefSaved(true)
  }

  const handleDebriefClose = () => {
    setShowDebriefModal(false)
    setPendingStatus(null)
  }

  const handleInterviewDateSave = async () => {
    setSavingDate(true)
    await patch({ status: 'Interview Scheduled', interview_date: interviewDate })
    setSavingDate(false)
    setDateSaved(true)
    setTimeout(() => setDateSaved(false), 2000)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await patch({ notes })
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete the ${job.company} — ${job.role} application?`)) return
    setDeleting(true)
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/jobs')
    else setDeleting(false)
  }

  const handleRedownloadCV = async () => {
    if (!job.cv_snapshot) return
    setDownloadingCv(true)
    setCvDownloadError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvSnapshot: job.cv_snapshot, template: (job.preferred_cv_template as TemplateName) ?? 'clean' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CV-${job.company}-${job.role}.docx`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setCvDownloadError('Download failed. Please try again.')
      }
    } catch {
      setCvDownloadError('Download failed. Please try again.')
    } finally {
      setDownloadingCv(false)
    }
  }

  const handleRedownloadPDF = async () => {
    if (!job.cv_snapshot) return
    setDownloadingPdf(true)
    setCvDownloadError('')
    try {
      const res = await fetch('/api/cv/download/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvSnapshot: job.cv_snapshot,
          template: (job.preferred_cv_template as TemplateName) ?? 'clean',
          filename: `CV-${job.company}-${job.role}.pdf`,
          jobTitle: job.role,
          jobRequirements: job.raw_text,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CV-${job.company}-${job.role}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setCvDownloadError('PDF generation failed. Please try again.')
      }
    } catch {
      setCvDownloadError('PDF generation failed. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleRedownloadCoverLetter = async () => {
    if (!clText) return
    setDownloadingCL(true)
    setClDownloadError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-cover-letter-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetterText: clText }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CoverLetter-${job.company}.docx`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setClDownloadError('Download failed. Please try again.')
      }
    } catch {
      setClDownloadError('Download failed. Please try again.')
    } finally {
      setDownloadingCL(false)
    }
  }

  const handleRedownloadCoverLetterPDF = async () => {
    if (!clText) return
    setDownloadingCLPdf(true)
    setClDownloadError('')
    try {
      const res = await fetch('/api/cover-letter/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetterText: clText, filename: `CoverLetter-${job.company}.pdf` }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CoverLetter-${job.company}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setClDownloadError('PDF generation failed. Please try again.')
      }
    } catch {
      setClDownloadError('PDF generation failed. Please try again.')
    } finally {
      setDownloadingCLPdf(false)
    }
  }

  const handleCopyCoverLetter = async () => {
    if (!clText) return
    try {
      await navigator.clipboard.writeText(clText)
      setClCopied(true)
      setTimeout(() => setClCopied(false), 2000)
    } catch {}
  }

  const hasCv = job.cv_snapshot || job.own_cv_url
  const hasCl = job.cover_letter || job.own_cover_letter_url
  const hasAnyDoc = hasCv || hasCl

  const tabs: { id: Tab; label: string; dot?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents', dot: !!hasAnyDoc },
    { id: 'interview', label: 'Interview', dot: job.status === 'Interview Scheduled' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link href="/jobs" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← My Jobs
          </Link>
          <h1 className="text-2xl font-semibold">{job.company}</h1>
          <p className="text-gray-500 mt-0.5">{job.role}</p>
          {job.location && <p className="text-sm text-gray-400 mt-0.5">{job.location}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[job.status]}`}>
            {job.status}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Status + meta */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-gray-400 mb-2">Status</p>
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
                  className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Applied</p>
                <p className="text-sm">{formatDate(job.date_applied)}</p>
              </div>
              {job.url && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Posting</p>
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    View ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Fit analysis */}
          {analysingFit && !job.fit_analysis && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-500">Analysing fit…</p>
            </div>
          )}
          {job.fit_analysis && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="text-sm font-medium">Fit analysis</h2>
                {job.fit_score != null && (
                  <span className={`text-lg font-bold ${
                    job.fit_score >= 80 ? 'text-green-600' :
                    job.fit_score >= 60 ? 'text-blue-600' :
                    job.fit_score >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>{job.fit_score}/100</span>
                )}
                {job.fit_analysis.archetype && job.fit_analysis.archetype !== 'Other' && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-700">
                    {ARCHETYPE_LABELS[job.fit_analysis.archetype] ?? job.fit_analysis.archetype}
                  </span>
                )}
              </div>
              {job.fit_analysis.summary && (
                <p className="text-sm text-gray-600 italic border-l-2 border-[var(--border)] pl-3 mb-4">
                  &ldquo;{job.fit_analysis.summary}&rdquo;
                </p>
              )}
              {job.fit_analysis.transferability_note && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Career transition</p>
                  <p className="text-sm text-blue-700">{job.fit_analysis.transferability_note}</p>
                </div>
              )}
              {job.fit_analysis.matched.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">Matched</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.fit_analysis.matched.map((r, i) => (
                      <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs">✓ {r}</span>
                    ))}
                  </div>
                </div>
              )}
              {job.fit_analysis.gaps.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Gaps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.fit_analysis.gaps.map((r, i) => {
                      const catGap: CategorisedGap | undefined = job.fit_analysis!.categorisedGaps?.find(g => g.requirement === r)
                      if (catGap?.category === 'qualification') {
                        return (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">
                            ✗ {r}
                            <span title={catGap.advice} className="text-red-400 cursor-help select-none" aria-label={catGap.advice}>ⓘ</span>
                          </span>
                        )
                      }
                      if (catGap?.category === 'experience') {
                        return (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">
                            ✗ {r}
                            <span title={catGap.advice} className="text-red-400 cursor-help select-none" aria-label={catGap.advice}>⏱</span>
                          </span>
                        )
                      }
                      const searchQuery = catGap?.searchQuery ?? (r + ' tutorial')
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">
                          ✗ {r}
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-700 underline"
                          >
                            Find resources →
                          </a>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requirements */}
          {job.requirements.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium mb-3">Requirements</h2>
              <ul className="space-y-1.5">
                {job.requirements.map((r, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-gray-300 shrink-0">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-medium mb-3">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this application…"
              className="w-full text-sm text-gray-700 border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes || notesSaved || notes === (job.notes ?? '')}
              className={`mt-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                notesSaved ? 'bg-green-600 text-white' : 'bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]'
              }`}
            >
              {savingNotes ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save notes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Documents tab ─────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* CTA banner */}
          {!job.cv_snapshot && !job.own_cv_url ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-[var(--navy)] text-white rounded-2xl shadow-sm">
              <div>
                <p className="text-sm font-semibold">Generate tailored CV</p>
                <p className="text-xs text-blue-200 mt-0.5">AI selects the best bullets and tailors them to this role.</p>
              </div>
              <Link
                href={`/jobs/${job.id}/apply/editor`}
                className="shrink-0 px-4 py-2 bg-white text-[var(--navy)] rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors self-start sm:self-auto"
              >
                Generate CV →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 bg-[var(--accent-light)] border border-[var(--accent)] rounded-2xl">
              <p className="text-sm font-medium text-[var(--navy)]">CV ready — regenerate or download below</p>
              <Link
                href={`/jobs/${job.id}/apply/editor`}
                className="shrink-0 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors self-start sm:self-auto"
              >
                Regenerate →
              </Link>
            </div>
          )}

          {/* Documents card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="text-sm font-medium">Application documents</h2>

            {/* CV row */}
            {job.cv_snapshot ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span className="text-green-600 text-sm">✓ CV prepared</span>
                  {job.cv_downloaded_at && (
                    <span className="text-xs text-gray-400 ml-2">Downloaded {formatDate(job.cv_downloaded_at)}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-2">
                    <button
                      onClick={handleRedownloadPDF}
                      disabled={downloadingPdf}
                      className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 transition-colors"
                    >
                      {downloadingPdf ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      onClick={handleRedownloadCV}
                      disabled={downloadingCv}
                      className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 transition-colors"
                    >
                      {downloadingCv ? 'Downloading…' : 'Download Word (.docx)'}
                    </button>
                  </div>
                  {cvDownloadError && <p className="text-xs text-red-600">{cvDownloadError}</p>}
                </div>
              </div>
            ) : job.own_cv_url ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-green-600 text-sm">✓ CV uploaded ({job.own_cv_filename})</span>
                <a href={job.own_cv_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] transition-colors">
                  Download →
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <p className="text-sm text-gray-400">No CV yet</p>
                <Link href={`/jobs/${job.id}/apply/editor`} className="text-xs text-gray-500 hover:text-gray-900 underline">
                  Prepare CV →
                </Link>
              </div>
            )}

            {/* Cover letter row */}
            {job.cover_letter ? (
              <div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-green-600 text-sm">✓ Cover letter prepared</span>
                    {job.cover_letter_downloaded_at && (
                      <span className="text-xs text-gray-400 ml-2">Downloaded {formatDate(job.cover_letter_downloaded_at)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowCoverLetter(v => !v)} className="text-xs text-gray-500 hover:text-gray-900 underline">
                      {showCoverLetter ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={handleRedownloadCoverLetter}
                      disabled={downloadingCL}
                      className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 transition-colors"
                    >
                      {downloadingCL ? 'Downloading…' : 'Download →'}
                    </button>
                    <button
                      onClick={handleRedownloadCoverLetterPDF}
                      disabled={downloadingCLPdf}
                      className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 transition-colors"
                    >
                      {downloadingCLPdf ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      onClick={handleCopyCoverLetter}
                      title="Copy to clipboard"
                      className="text-xs px-2 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {clCopied ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 10l4 4 8-8" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="8" y="2" width="10" height="13" rx="1.5" />
                          <path d="M4 6H3a1 1 0 00-1 1v10a1 1 0 001 1h9a1 1 0 001-1v-1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {clDownloadError && <p className="text-xs text-red-600 text-right mt-1">{clDownloadError}</p>}
                {showCoverLetter && (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
                    {clText}
                  </p>
                )}
              </div>
            ) : job.own_cover_letter_url ? (
              <div className="flex items-center justify-between py-2">
                <span className="text-green-600 text-sm">✓ Cover letter uploaded ({job.own_cover_letter_filename})</span>
                <a href={job.own_cover_letter_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] transition-colors">
                  Download →
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-400">No cover letter yet</p>
                <Link href={`/jobs/${job.id}/apply/editor`} className="text-xs text-gray-500 hover:text-gray-900 underline">
                  Prepare cover letter →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Interview tab ─────────────────────────────────────────── */}
      {activeTab === 'interview' && (
        <div className="space-y-4">
          {/* Debrief saved confirmation */}
          {debriefSaved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              Debrief saved. This will help improve your future interview prep.
            </div>
          )}

          {/* Interview date */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-medium mb-3">Interview date</h2>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                onClick={handleInterviewDateSave}
                disabled={!interviewDate || savingDate}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  dateSaved ? 'bg-green-600 text-white' : 'bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]'
                }`}
              >
                {savingDate ? 'Saving…' : dateSaved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>

          {/* Interview prep CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-amber-900">Interview prep</p>
              <p className="text-xs text-amber-700 mt-0.5">AI-generated questions tailored to this role and your CV.</p>
            </div>
            <Link
              href={`/jobs/${job.id}/interview-prep`}
              className="shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors self-start sm:self-auto"
            >
              Prep now →
            </Link>
          </div>

          {/* Status change */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-2">Update status after interview</p>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
              className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Debrief modal */}
      {showDebriefModal && pendingStatus && (
        <InterviewDebriefModal
          jobId={job.id}
          company={job.company}
          role={job.role}
          questions={[]}
          newStatus={pendingStatus}
          onSave={handleDebriefSaved}
          onClose={handleDebriefClose}
        />
      )}
    </div>
  )
}
