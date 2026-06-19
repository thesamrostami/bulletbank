'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { CVSnapshot, FitAnalysis, InterviewDebrief } from '@/types'
import type { StoredPrep, PrepVersion } from '@/lib/interview-prep'
import InterviewDebriefModal from '@/components/InterviewDebriefModal'
import { daysUntil, formatDate } from '@/lib/utils'

// ─── Local types ──────────────────────────────────────────────────────────────

interface Question {
  question: string
  type: 'Behavioural' | 'Technical' | 'Motivation' | 'Culture'
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  answer_guide: string
  key_points: string[]
  bullet_ids: string[]
  star_applicable: boolean
  watch_out: string
}

interface SnapshotBullet {
  bullet_id: string
  text: string
  type: string
  has_metric?: boolean
  metric_text?: string | null
  star_story?: string | null
}

interface JobSummary {
  company: string
  role: string
  requirements: string[]
  cvSnapshot: CVSnapshot | null
  coverLetter: string | null
  fitAnalysis: FitAnalysis | null
  ownCvUrl: string | null
  ownCvFilename: string | null
  ownCvText: string | null
  ownCoverLetterUrl: string | null
  ownCoverLetterFilename: string | null
  interviewDate: string | null
}

interface Props {
  jobId: string
  cachedPrep: StoredPrep | null
  jobSummary: JobSummary
}

type Tab = 'questions' | 'resources' | 'application'
type QuestionFilter = 'All' | 'Behavioural' | 'Technical' | 'Motivation' | 'Culture'

const TYPE_COLORS: Record<string, string> = {
  Behavioural: 'bg-blue-50 text-blue-700 border-blue-200',
  Technical: 'bg-purple-50 text-purple-700 border-purple-200',
  Motivation: 'bg-orange-50 text-orange-700 border-orange-200',
  Culture: 'bg-teal-50 text-teal-700 border-teal-200',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'text-green-600',
  Medium: 'text-amber-600',
  Hard: 'text-red-600',
}

const GENERAL_RESOURCES = [
  { label: 'STAR method guide', url: 'https://www.youtube.com/results?search_query=STAR+method+interview+technique', note: 'Structure behavioural answers' },
  { label: 'Questions to ask the interviewer', url: 'https://www.youtube.com/results?search_query=best+questions+to+ask+interviewer', note: 'End strong with smart questions' },
  { label: 'How to discuss salary', url: 'https://www.youtube.com/results?search_query=how+to+negotiate+salary+job+offer', note: 'Prepare for compensation conversations' },
  { label: 'Tell me about yourself — structure', url: 'https://www.youtube.com/results?search_query=tell+me+about+yourself+interview+answer', note: 'The opener that sets the tone' },
]

function formatVersionDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InterviewPrepClient({ jobId, cachedPrep, jobSummary }: Props) {
  // storedPrep holds all versions. Starts from server-passed cache — no API call needed.
  const [storedPrep, setStoredPrep] = useState<StoredPrep | null>(cachedPrep)
  const [loading, setLoading] = useState(cachedPrep === null)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // Which version is being viewed: 0 = current, 1+ = history[index-1]
  const [versionIdx, setVersionIdx] = useState(0)

  const [activeTab, setActiveTab] = useState<Tab>('questions')
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('All')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [readyIds, setReadyIds] = useState<Set<number>>(new Set())
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [showDebriefModal, setShowDebriefModal] = useState(false)
  const [debriefSaved, setDebriefSaved] = useState(false)

  // Generate on first visit (when no cached data at all)
  useEffect(() => {
    if (cachedPrep !== null) return   // already have data — never call the API

    const controller = new AbortController()
    const run = async () => {
      try {
        const res = await fetch('/api/interview-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, forceRegenerate: false }),
          signal: controller.signal,
        })
        const d = await res.json()
        if ((d as { error?: string }).error) {
          setError((d as { error: string }).error)
        } else {
          setStoredPrep(d as StoredPrep)
          setVersionIdx(0)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('Failed to load interview prep. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  // cachedPrep is stable (server-rendered prop) — jobId is the only real dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError('')
    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, forceRegenerate: true }),
      })
      const d = await res.json()
      if ((d as { error?: string }).error) {
        setError((d as { error: string }).error)
      } else {
        setStoredPrep(d as StoredPrep)
        setVersionIdx(0)   // always jump to new current version
      }
    } catch {
      setError('Failed to regenerate. Please try again.')
    }
    setRegenerating(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <Link href={`/jobs/${jobId}`} className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← {jobSummary.company} — {jobSummary.role}
        </Link>
        <h1 className="text-xl font-semibold mt-2 mb-1">Interview Prep</h1>
        <p className="text-gray-500 text-sm mb-6">{jobSummary.company} · {jobSummary.role}</p>
        <div className="text-gray-400 text-sm animate-pulse">Generating interview prep… this takes 15–25 seconds.</div>
      </div>
    )
  }

  if (error && !storedPrep) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <Link href={`/jobs/${jobId}`} className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← Back to job
        </Link>
        <p className="text-red-500 text-sm mb-3">{error}</p>
        <button
          onClick={handleRegenerate}
          className="text-sm text-gray-900 underline hover:text-gray-600"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!storedPrep) return null

  // Build flat version list: [current, ...history]
  const allVersions: PrepVersion[] = [storedPrep.current, ...storedPrep.history]
  const activeVersion = allVersions[versionIdx]
  const isViewingCurrent = versionIdx === 0

  const questions = activeVersion.questions as Question[]
  const applicationBullets = activeVersion.applicationBullets as SnapshotBullet[]
  const metricBullets = activeVersion.metricBullets as SnapshotBullet[]
  const { coverLetter, gaps, generatedAt } = activeVersion

  const bulletMap = new Map(applicationBullets.map((b) => [b.bullet_id, b]))
  const filteredQuestions = questionFilter === 'All' ? questions : questions.filter((q) => q.type === questionFilter)
  const repeatedFilteredQuestions = filteredQuestions.filter(q => q.question.startsWith('⭐ Came up before'))
  const regularFilteredQuestions = filteredQuestions.filter(q => !q.question.startsWith('⭐ Came up before'))
  const readyCount = readyIds.size
  const totalCount = questions.length

  const toggleReady = (idx: number) => {
    setReadyIds((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const typeCounts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1
    return acc
  }, {})

  const highlightBullets = applicationBullets.filter((b) => b.type === 'highlight')
  const summaryBullets = applicationBullets.filter((b) => b.type === 'summary')
  const experienceBullets = applicationBullets.filter((b) => b.type === 'experience' || b.type === 'project')
  const hasOwnDocuments = jobSummary.ownCvUrl || jobSummary.ownCoverLetterUrl

  return (
    <div className="flex flex-col md:h-screen">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 md:px-8 py-4">
        <Link href={`/jobs/${jobId}`} className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← {jobSummary.company} — {jobSummary.role}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Interview Prep</h1>
            <p className="text-gray-500 text-sm">{jobSummary.company} · {jobSummary.role}</p>
            {generatedAt && (
              <p className="text-xs text-gray-400 mt-1">
                {isViewingCurrent ? 'Generated' : 'Viewing older version from'} {formatVersionDate(generatedAt)}
              </p>
            )}
          </div>

          <div className="flex flex-row sm:flex-col sm:items-end items-center gap-3 sm:gap-2">
            {/* Readiness progress — only shown for current version */}
            {isViewingCurrent && (
              <div className="sm:text-right">
                <p className="text-xs text-gray-400 mb-1">{readyCount} / {totalCount} questions ready</p>
                <div className="w-32 sm:w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: totalCount > 0 ? `${(readyCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs text-gray-400 hover:text-gray-700 underline disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {regenerating ? 'Regenerating…' : 'Regenerate prep'}
            </button>
          </div>
        </div>

        {/* Version picker — shown only when history exists */}
        {allVersions.length > 1 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Versions:</span>
            {allVersions.map((v, i) => (
              <button
                key={i}
                onClick={() => { setVersionIdx(i); setExpandedIdx(null); setReadyIds(new Set()) }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  versionIdx === i
                    ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                    : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                {i === 0 ? 'Latest' : `v${allVersions.length - i}`} · {new Date(v.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </button>
            ))}
          </div>
        )}

        {/* Older-version banner */}
        {!isViewingCurrent && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <span>You&apos;re viewing an older version.</span>
            <button onClick={() => setVersionIdx(0)} className="underline hover:text-amber-900">Switch to latest →</button>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 bg-white px-4 md:px-8">
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {([
            ['questions', `Questions (${totalCount})`],
            ['resources', `Skills & Resources${gaps.length > 0 ? ` (${gaps.length} gaps)` : ''}`],
            ['application', 'Your Application'],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab ? 'border-[var(--navy)] text-[var(--text-primary)]' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Post-interview debrief banner */}
      {jobSummary.interviewDate && daysUntil(jobSummary.interviewDate) < 0 && (
        debriefSaved ? (
          <div className="border-b border-green-100 bg-green-50 px-4 md:px-8 py-3 text-sm text-green-800">
            Debrief saved. This will help improve your future interview prep.
          </div>
        ) : (
          <div className="border-b border-amber-100 bg-amber-50 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-amber-800">
              This interview was scheduled for {formatDate(jobSummary.interviewDate)}. Did it happen?
            </p>
            <button
              onClick={() => setShowDebriefModal(true)}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline shrink-0"
            >
              Log your debrief →
            </button>
          </div>
        )
      )}

      <div className="flex-1 md:overflow-y-auto">

        {/* ── Tab: Questions ── */}
        {activeTab === 'questions' && (
          <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl">
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['All', 'Behavioural', 'Technical', 'Motivation', 'Culture'] as QuestionFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setQuestionFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    questionFilter === f ? 'bg-[var(--navy)] text-white' : 'bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                  }`}
                >
                  {f}
                  {f !== 'All' && typeCounts[f] ? <span className="ml-1.5 opacity-60">{typeCounts[f]}</span> : null}
                </button>
              ))}
            </div>

            {/* Repeated questions from past interviews — shown first */}
            {repeatedFilteredQuestions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-500">⭐</span>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Came up in past interviews
                  </p>
                  <span className="text-xs text-gray-400">— stronger answers recommended</span>
                </div>
                <div className="space-y-3">
                  {repeatedFilteredQuestions.map((q) => {
                    const idx = questions.indexOf(q)
                    const isExpanded = expandedIdx === idx
                    const isReady = readyIds.has(idx)
                    const linkedBullets = q.bullet_ids.map((id) => bulletMap.get(id)).filter(Boolean) as SnapshotBullet[]
                    const displayQuestion = q.question.replace(/^⭐ Came up before\s*—?\s*/i, '')
                    return (
                      <div key={idx} className={`bg-amber-50 rounded-xl border transition-colors ${isReady ? 'border-green-200' : 'border-amber-200'}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[q.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{q.type}</span>
                                <span className="text-xs text-gray-400">{q.category}</span>
                                <span className={`text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty] || 'text-gray-500'}`}>{q.difficulty}</span>
                                <span className="text-xs text-amber-600 font-medium">⭐ Came up before</span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 leading-snug">{displayQuestion}</p>
                            </div>
                            {isViewingCurrent && (
                              <button
                                onClick={() => toggleReady(idx)}
                                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                  isReady ? 'bg-green-500 text-white' : 'border-2 border-[var(--border)] text-transparent hover:border-green-400'
                                }`}
                                title={isReady ? 'Mark as needs practice' : 'Mark as ready'}
                              >
                                <span className="text-xs">✓</span>
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="mt-3 text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? '▲ Hide answer guide' : '▼ Prepare answer'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-amber-100 px-5 pb-5 space-y-4">
                            <div className="pt-4">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Answer guide</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{q.answer_guide}</p>
                            </div>
                            {q.key_points.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hit these points</p>
                                <ul className="space-y-1.5">
                                  {q.key_points.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="text-green-500 mt-0.5 shrink-0">→</span>{pt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {linkedBullets.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Relevant bullets</p>
                                <ul className="space-y-1.5">
                                  {linkedBullets.map((b) => (
                                    <li key={b.bullet_id} className="text-xs text-gray-600 bg-white border border-amber-100 rounded-lg px-3 py-2">
                                      {b.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {regularFilteredQuestions.map((q) => {
                const idx = questions.indexOf(q)
                const isExpanded = expandedIdx === idx
                const isReady = readyIds.has(idx)
                const linkedBullets = q.bullet_ids.map((id) => bulletMap.get(id)).filter(Boolean) as SnapshotBullet[]

                return (
                  <div key={idx} className={`bg-white rounded-xl border transition-colors ${isReady ? 'border-green-200' : 'border-gray-100'}`}>
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[q.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{q.type}</span>
                            <span className="text-xs text-gray-400">{q.category}</span>
                            <span className={`text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty] || 'text-gray-500'}`}>{q.difficulty}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>
                        </div>
                        {isViewingCurrent && (
                          <button
                            onClick={() => toggleReady(idx)}
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              isReady ? 'bg-green-500 text-white' : 'border-2 border-[var(--border)] text-transparent hover:border-green-400'
                            }`}
                            title={isReady ? 'Mark as needs practice' : 'Mark as ready'}
                          >
                            <span className="text-xs">✓</span>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="mt-3 text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? '▲ Hide answer guide' : '▼ Prepare answer'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 pb-5 space-y-4">
                        <div className="pt-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Answer guide</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{q.answer_guide}</p>
                        </div>
                        {q.key_points.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hit these points</p>
                            <ul className="space-y-1.5">
                              {q.key_points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="text-green-500 mt-0.5 shrink-0">→</span>{pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {q.star_applicable && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Use STAR structure</p>
                            <p className="text-xs text-blue-700">
                              <strong>Situation</strong> → <strong>Task</strong> → <strong>Action</strong> → <strong>Result</strong> (with metric if possible)
                            </p>
                          </div>
                        )}
                        {linkedBullets.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Use these from your CV</p>
                            <div className="space-y-2">
                              {linkedBullets.map((b) => (
                                <div key={b.bullet_id} className="bg-gray-50 rounded-lg px-4 py-3">
                                  <span className="text-xs font-mono text-gray-400">{b.bullet_id}</span>
                                  <p className="text-sm text-gray-800 mt-0.5">{b.text}</p>
                                  {b.metric_text && <p className="text-xs text-amber-600 mt-1">Metric: {b.metric_text}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {q.watch_out && (
                          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-red-600 mb-1">Watch out</p>
                            <p className="text-xs text-red-700">{q.watch_out}</p>
                          </div>
                        )}
                        {linkedBullets.some((b) => b.star_story) && (
                          <div>
                            {linkedBullets.filter((b) => b.star_story).map((b) => (
                              <details key={b.bullet_id} className="mt-1">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                  Show full STAR story for {b.bullet_id}
                                </summary>
                                <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">{b.star_story}</p>
                              </details>
                            ))}
                          </div>
                        )}
                        {isViewingCurrent && (
                          <div className="pt-1">
                            <button
                              onClick={() => { toggleReady(idx); setExpandedIdx(null) }}
                              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                                isReady ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {isReady ? 'Needs more practice' : '✓ I\'m ready for this one'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredQuestions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No questions of this type generated.</p>
            )}
          </div>
        )}

        {/* ── Tab: Skills & Resources ── */}
        {activeTab === 'resources' && (
          <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl space-y-8">
            {metricBullets.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metrics you&apos;ll need to defend</h2>
                <p className="text-xs text-gray-400 mb-4">These are claims from your CV. Be ready to explain exactly how the number was measured.</p>
                <div className="space-y-3">
                  {metricBullets.map((b, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="text-sm text-gray-900">{b.text}</p>
                      {b.metric_text && <p className="text-xs text-amber-700 mt-1 font-medium">Metric: {b.metric_text}</p>}
                      <p className="text-xs text-amber-600 mt-2">Prepare to explain: how it was measured, your direct contribution, and any caveats.</p>
                      {b.star_story && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Show STAR story</summary>
                          <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{b.star_story}</p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {gaps.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gaps to address before the interview</h2>
                <p className="text-xs text-gray-400 mb-4">These requirements appeared in the job posting but aren&apos;t clearly evidenced in your profile.</p>
                <div className="space-y-3">
                  {gaps.map((gap, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-3">{gap}</p>
                      <div className="flex gap-2 flex-wrap">
                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(gap + ' explained tutorial')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">YouTube tutorials →</a>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(gap + ' beginner guide site:medium.com OR site:dev.to OR site:docs.github.com')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Study articles →</a>
                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(gap + ' interview question answer')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">Interview Qs →</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">General interview prep</h2>
              <div className="space-y-2">
                {GENERAL_RESOURCES.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-300 transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{r.label}</p>
                      <p className="text-xs text-gray-400">{r.note}</p>
                    </div>
                    <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
                  </a>
                ))}
              </div>
            </div>
            {gaps.length === 0 && metricBullets.length === 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-green-700 mb-1">No skill gaps identified</p>
                <p className="text-xs text-green-600">Your profile covers all the job requirements well.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Your Application ── */}
        {activeTab === 'application' && (
          <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl space-y-6">
            {hasOwnDocuments && applicationBullets.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-sm font-medium text-gray-700 mb-3">You applied with your own documents</p>
                {jobSummary.ownCvUrl && (
                  <a href={jobSummary.ownCvUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block mb-1">
                    Download your submitted CV ({jobSummary.ownCvFilename}) →
                  </a>
                )}
                {jobSummary.ownCoverLetterUrl && (
                  <a href={jobSummary.ownCoverLetterUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                    Download your submitted cover letter ({jobSummary.ownCoverLetterFilename}) →
                  </a>
                )}
              </div>
            )}

            {applicationBullets.length === 0 && !hasOwnDocuments ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 text-center">
                <p className="text-sm text-gray-500 mb-1">No application documents on record</p>
                <p className="text-xs text-gray-400 mb-4">Prepare your CV and cover letter through the apply flow to get a fully personalised interview prep.</p>
                <Link href={`/jobs/${jobId}/apply/editor`} className="text-sm text-gray-900 underline hover:text-gray-600">Prepare documents →</Link>
              </div>
            ) : applicationBullets.length > 0 ? (
              <>
                {summaryBullets.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Professional summary used</h2>
                    {summaryBullets.map((b, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                        <span className="text-xs font-mono text-gray-400">{b.bullet_id}</span>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">{b.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {highlightBullets.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key highlights on your CV</h2>
                    <div className="space-y-2">
                      {highlightBullets.map((b, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                          <span className="text-xs font-mono text-gray-400">{b.bullet_id}</span>
                          {b.has_metric && <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">has metric</span>}
                          <p className="text-sm text-gray-700 mt-1">{b.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {experienceBullets.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Experience bullets submitted</h2>
                    <div className="space-y-2">
                      {experienceBullets.map((b, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">{b.bullet_id}</span>
                            <span className="text-xs text-gray-400 capitalize">{b.type}</span>
                          </div>
                          <p className="text-sm text-gray-700">{b.text}</p>
                          {b.metric_text && <p className="text-xs text-amber-600 mt-1">Metric: {b.metric_text}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {coverLetter && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cover letter submitted</h2>
                      <button onClick={() => setShowCoverLetter((v) => !v)} className="text-xs text-gray-400 hover:text-gray-700 underline">
                        {showCoverLetter ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showCoverLetter ? (
                      <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{coverLetter}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">{coverLetter.slice(0, 120)}…</p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Post-interview debrief modal */}
      {showDebriefModal && (
        <InterviewDebriefModal
          jobId={jobId}
          company={jobSummary.company}
          role={jobSummary.role}
          questions={storedPrep ? (storedPrep.current.questions as Array<{ question: string; type: string }>) : []}
          onSave={(_debrief: InterviewDebrief) => {
            setShowDebriefModal(false)
            setDebriefSaved(true)
          }}
          onClose={() => setShowDebriefModal(false)}
          roleArchetype={(jobSummary.fitAnalysis as { archetype?: string } | null)?.archetype || null}
        />
      )}
    </div>
  )
}
