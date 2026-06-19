'use client'

import { useEffect, useState } from 'react'
import type { BulletBank, BulletDiagnosis } from '@/types'

type ImprovePhase =
  | { type: 'idle' }
  | { type: 'diagnosing' }
  | { type: 'direct'; weaknesses: string[]; improved: string; editing: boolean; editText: string }
  | { type: 'question'; weaknesses: string[]; question: string; answer: string }
  | { type: 'no_potential'; weaknesses: string[] }
  | { type: 'improving' }
  | { type: 'improved'; weaknesses: string[]; text: string; editing: boolean; editText: string }
  | { type: 'error'; message: string }

interface BulletImprovementPanelProps {
  bullet: BulletBank
  roleContext: string | null
  onAccept: (newText: string) => void
  onFinalise: () => void
  onClose: () => void
}

export default function BulletImprovementPanel({
  bullet,
  roleContext,
  onAccept,
  onFinalise,
  onClose,
}: BulletImprovementPanelProps) {
  const [phase, setPhase] = useState<ImprovePhase>({ type: 'diagnosing' })

  const runDiagnose = () => {
    setPhase({ type: 'diagnosing' })
    fetch('/api/bullets/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulletText: bullet.text,
        roleContext,
        skillTags: bullet.skill_tags,
        metricText: bullet.metric_text,
      }),
    })
      .then(r => r.json())
      .then(({ diagnosis, error }: { diagnosis?: BulletDiagnosis; error?: string }) => {
        if (error || !diagnosis) {
          setPhase({ type: 'error', message: error || 'Could not diagnose bullet' })
          return
        }
        if (!diagnosis.hasImprovementPotential) {
          setPhase({ type: 'no_potential', weaknesses: diagnosis.weaknesses })
          return
        }
        if (diagnosis.improvedVersion) {
          setPhase({ type: 'direct', weaknesses: diagnosis.weaknesses, improved: diagnosis.improvedVersion, editing: false, editText: diagnosis.improvedVersion })
          return
        }
        if (diagnosis.question) {
          setPhase({ type: 'question', weaknesses: diagnosis.weaknesses, question: diagnosis.question, answer: '' })
          return
        }
        setPhase({ type: 'no_potential', weaknesses: diagnosis.weaknesses })
      })
      .catch(() => setPhase({ type: 'error', message: 'Failed to connect to AI' }))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; bullet and roleContext are stable props passed at panel-open time; re-diagnosing on every render would waste credits
  useEffect(() => { runDiagnose() }, [])

  const generateImprovement = async (question: string, answer: string) => {
    setPhase({ type: 'improving' })
    try {
      const res = await fetch('/api/bullets/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletText: bullet.text, question, answer, roleContext }),
      })
      const data = await res.json() as { improvedText?: string; error?: string }
      if (!res.ok || !data.improvedText) throw new Error(data.error || 'Failed to generate improvement')
      const prevWeaknesses = phase.type === 'question' ? phase.weaknesses : []
      setPhase({ type: 'improved', weaknesses: prevWeaknesses, text: data.improvedText, editing: false, editText: data.improvedText })
    } catch (err) {
      setPhase({ type: 'error', message: (err as Error).message })
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/50 rounded-b-xl px-3 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Improve this bullet</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
      </div>

      {phase.type === 'diagnosing' && (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <div className="flex gap-0.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
          Analysing your bullet...
        </div>
      )}

      {phase.type === 'improving' && (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <div className="flex gap-0.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
          Generating improvement...
        </div>
      )}

      {(phase.type === 'direct' || phase.type === 'question' || phase.type === 'no_potential' || phase.type === 'improved') && phase.weaknesses.length > 0 && (
        <div>
          <p className="text-xs text-amber-700 font-medium mb-1">This bullet has some issues:</p>
          <ul className="space-y-0.5">
            {phase.weaknesses.map((w, i) => <li key={i} className="text-xs text-amber-700">• {w}</li>)}
          </ul>
        </div>
      )}

      {phase.type === 'direct' && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-400 mb-1 line-through">{bullet.text}</p>
            <p className="text-xs font-medium text-gray-500 mb-1">Suggested improvement:</p>
            {phase.editing ? (
              <div className="space-y-1">
                <textarea value={phase.editText} onChange={e => setPhase({ ...phase, editText: e.target.value })} rows={2} autoFocus
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none resize-none" />
              </div>
            ) : (
              <p className="text-sm text-gray-900 font-medium">{phase.improved}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onAccept(phase.editing ? phase.editText : phase.improved)}
              className="px-3 py-1.5 bg-[var(--navy)] text-white rounded-lg text-xs font-medium hover:bg-[var(--navy-light)]">Accept this →</button>
            {!phase.editing && (
              <button onClick={() => setPhase({ ...phase, editing: true })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Edit further →</button>
            )}
            {phase.editing && (
              <button onClick={() => setPhase({ ...phase, editing: false })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Preview</button>
            )}
            <button
              onClick={onFinalise}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
            >
              Keep original & finalise
            </button>
          </div>
        </div>
      )}

      {phase.type === 'question' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-800">{phase.question}</p>
          <textarea
            value={phase.answer}
            onChange={e => setPhase({ ...phase, answer: e.target.value })}
            rows={2}
            placeholder="Your answer (leave blank if you don't have this info)"
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none resize-none"
          />
          <button onClick={() => generateImprovement(phase.question, phase.answer)}
            className="px-3 py-1.5 bg-[var(--navy)] text-white rounded-lg text-xs font-medium hover:bg-[var(--navy-light)]">
            Generate improvement →
          </button>
        </div>
      )}

      {phase.type === 'improved' && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-400 mb-1 line-through">{bullet.text}</p>
            <p className="text-xs font-medium text-gray-500 mb-1">Suggested improvement:</p>
            {phase.editing ? (
              <textarea value={phase.editText} onChange={e => setPhase({ ...phase, editText: e.target.value })} rows={2} autoFocus
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none resize-none" />
            ) : (
              <p className="text-sm text-gray-900 font-medium">{phase.text}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onAccept(phase.editing ? phase.editText : phase.text)}
              className="px-3 py-1.5 bg-[var(--navy)] text-white rounded-lg text-xs font-medium hover:bg-[var(--navy-light)]">Accept this →</button>
            {!phase.editing && (
              <button onClick={() => setPhase({ ...phase, editing: true })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Edit further →</button>
            )}
            {phase.editing && (
              <button onClick={() => setPhase({ ...phase, editing: false })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Preview</button>
            )}
            <button
              onClick={onFinalise}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
            >
              Keep original & finalise
            </button>
          </div>
        </div>
      )}

      {phase.type === 'no_potential' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">This bullet is as specific as it can be given your available information. You can mark it as finalised so it stops showing as &apos;Needs work&apos;.</p>
          <div className="flex gap-2">
            <button onClick={onFinalise} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">Mark as finalised</button>
            <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">Keep as is</button>
          </div>
        </div>
      )}

      {phase.type === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-red-600">{phase.message}</p>
          <button onClick={runDiagnose} className="text-xs text-gray-500 hover:text-gray-700">Retry</button>
        </div>
      )}
    </div>
  )
}
