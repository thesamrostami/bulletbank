'use client'
import { useState } from 'react'
import type { InterviewDebrief, JobStatus } from '@/types'

interface InterviewDebriefModalProps {
  jobId: string
  company: string
  role: string
  questions: Array<{ question: string; type: string }>
  onSave: (debrief: InterviewDebrief) => void
  onClose: () => void
  newStatus?: JobStatus
  roleArchetype?: string | null
}

const OUTCOMES = ['Great', 'Good', 'Neutral', 'Tough', 'Very tough'] as const

export default function InterviewDebriefModal({
  jobId,
  company,
  role,
  questions,
  onSave,
  onClose,
  newStatus,
  roleArchetype,
}: InterviewDebriefModalProps) {
  const [notes, setNotes] = useState('')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [outcome, setOutcome] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleQuestion = (idx: number) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const questionsAsked = Array.from(selectedQuestions)
      .sort((a, b) => a - b)
      .map((i) => questions[i].question)

    const outcomeNote = [outcome, notes].filter(Boolean).join(' — ')

    const debrief: InterviewDebrief = {
      questions_asked: questionsAsked,
      bullets_used: [],
      outcome_notes: outcomeNote,
      logged_at: new Date().toISOString(),
    }

    const body: Record<string, unknown> = { interview_debrief: debrief }
    if (newStatus) body.status = newStatus

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError('Failed to save debrief. Please try again.')
        return
      }

      // Save individual questions to debrief_insights for pattern detection (fire-and-forget)
      if (questionsAsked.length > 0) {
        fetch('/api/debrief-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            roleArchetype: roleArchetype || null,
            questions: Array.from(selectedQuestions)
              .sort((a, b) => a - b)
              .map(i => ({
                question: questions[i].question,
                type: questions[i].type,
                outcome: outcome.toLowerCase().replace(' ', '_') || null,
              })),
          }),
        }).catch(() => {/* non-critical */})
      }

      onSave(debrief)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">How did the interview go?</h2>
            <p className="text-sm text-gray-500 mt-0.5">{company} — {role}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Outcome */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">How did it feel?</label>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                onClick={() => setOutcome(outcome === o ? '' : o)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  outcome === o
                    ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What questions came up? How did you feel about your answers?"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>

        {/* Questions multi-select */}
        {questions.length > 0 && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which of these came up?
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(i)}
                    onChange={() => toggleQuestion(i)}
                    className="mt-0.5 shrink-0 accent-gray-900"
                  />
                  <span className="text-sm text-gray-700 leading-snug group-hover:text-gray-900">
                    <span className={`inline-block text-xs mr-1.5 px-1.5 py-0.5 rounded border ${
                      q.type === 'Behavioural' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      q.type === 'Technical' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      q.type === 'Motivation' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>{q.type}</span>
                    {q.question}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
          >
            {saving ? 'Saving…' : 'Save debrief'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
