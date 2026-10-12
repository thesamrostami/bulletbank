'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CREDIT_COSTS } from '@/lib/plans'

interface ReviewTheme {
  title: string
  bullets: string[]
  narrative: string
}

interface ReviewPack {
  summary: string
  themes: ReviewTheme[]
  suggested_talking_points: string[]
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultFrom(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return isoDate(d)
}

function buildCopyText(pack: ReviewPack, from: string, to: string): string {
  const lines: string[] = [`Review self-assessment — ${from} to ${to}`, '', pack.summary, '']
  for (const theme of pack.themes) {
    lines.push(`## ${theme.title}`, '', theme.narrative, '')
    for (const b of theme.bullets) lines.push(`- ${b}`)
    lines.push('')
  }
  if (pack.suggested_talking_points?.length) {
    lines.push('## Talking points', '')
    for (const t of pack.suggested_talking_points) lines.push(`- ${t}`)
  }
  return lines.join('\n').trim()
}

export default function ReviewPackClient() {
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(isoDate(new Date()))
  const [emphasis, setEmphasis] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [noBullets, setNoBullets] = useState(false)
  const [pack, setPack] = useState<ReviewPack | null>(null)
  const [copied, setCopied] = useState(false)

  const inputClass = 'px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setNoBullets(false)
    try {
      const res = await fetch('/api/review-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, emphasis }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'NO_BULLETS') {
          setNoBullets(true)
        } else {
          setError(data.error || 'Generation failed. Please try again.')
        }
        return
      }
      setPack(data.pack as ReviewPack)
    } catch {
      setError('Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!pack) return
    try {
      await navigator.clipboard.writeText(buildCopyText(pack, from, to))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable — nothing sensible to do */ }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Review pack</h1>
        <p className="text-gray-500 text-sm">
          Turn the achievements you&apos;ve logged into a performance-review self-assessment draft.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From</label>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            What should this review emphasise? <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={emphasis}
            onChange={e => setEmphasis(e.target.value.slice(0, 1000))}
            rows={2}
            className={`${inputClass} w-full resize-none`}
            placeholder="e.g. Making the case for promotion to senior; focus on ownership and mentoring"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {noBullets ? (
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">No achievements logged in this date range.</p>
            <p className="text-sm text-gray-500">
              <Link href="/capture" className="text-gray-900 underline hover:text-gray-600">Log an achievement →</Link>
              {' '}or widen the date range.
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors"
          >
            {generating ? 'Generating…' : 'Generate review pack'}
          </button>
          <span className="text-xs text-gray-400">Uses {CREDIT_COSTS.review_pack} credits</span>
        </div>
      </div>

      {/* Result */}
      {pack && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your draft</h2>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)] transition-colors"
            >
              {copied ? 'Copied ✓' : 'Copy as text'}
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-sm text-gray-700 leading-relaxed">{pack.summary}</p>
          </div>

          {pack.themes.map((theme, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">{theme.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{theme.narrative}</p>
              <ul className="space-y-2">
                {theme.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-300 mt-0.5 shrink-0">•</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {pack.suggested_talking_points?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Talking points</h3>
              <ul className="space-y-2">
                {pack.suggested_talking_points.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-300 mt-0.5 shrink-0">→</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
