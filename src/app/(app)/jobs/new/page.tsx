'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedJob, JobStatus } from '@/types'

type Phase = 'input' | 'preview' | 'tracker'

export default function NewJobPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('input')

  // URL path
  const [url, setUrl] = useState('')
  const [urlExtracting, setUrlExtracting] = useState(false)
  const [urlError, setUrlError] = useState('')

  // Text path
  const [jobText, setJobText] = useState('')
  const [textExtracting, setTextExtracting] = useState(false)
  const [textError, setTextError] = useState('')

  const [showPasteFallback, setShowPasteFallback] = useState(false)

  const [form, setForm] = useState<Partial<ExtractedJob>>({})
  const [requirementsText, setRequirementsText] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [trackerForm, setTrackerForm] = useState({
    company: '',
    role: '',
    url: '',
    status: 'Applied' as JobStatus,
    date_applied: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const set = (field: keyof ExtractedJob, value: string) =>
    setForm((p) => ({ ...p, [field]: value }))

  const applyExtracted = (extracted: ExtractedJob) => {
    setForm(extracted)
    setRequirementsText((extracted.requirements || []).join('\n'))
    setPhase('preview')
  }

  const handleExtractUrl = async () => {
    if (!url) return
    setUrlExtracting(true)
    setUrlError('')
    try {
      const res = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (res.status === 429 || res.status === 402) { setUrlError(data.error); return }
      if (!res.ok) {
        setUrlError(data.error || 'Couldn\'t extract from this URL.')
        setShowPasteFallback(true)
        return
      }
      applyExtracted(data.extracted)
    } catch {
      setUrlError('Network error — couldn\'t reach this URL.')
      setShowPasteFallback(true)
    } finally {
      setUrlExtracting(false)
    }
  }

  const handleExtractText = async () => {
    if (!jobText.trim()) return
    setTextExtracting(true)
    setTextError('')
    try {
      const res = await fetch('/api/extract-job-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jobText }),
      })
      const data = await res.json()
      if (res.status === 429 || res.status === 402) { setTextError(data.error); return }
      if (!res.ok) { setTextError(data.error || 'Extraction failed'); setPhase('preview'); return }
      applyExtracted(data.extracted)
    } catch {
      setTextError('Network error. You can fill in the details manually below.')
      setPhase('preview')
    } finally {
      setTextExtracting(false)
    }
  }

  const saveJob = async () => {
    if (!form.company || !form.role) return
    setSaving(true)
    setSaveError('')
    const requirements = requirementsText.split('\n').filter(Boolean)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: form.company,
        role: form.role,
        location: form.location || null,
        url: url || null,
        raw_text: form.raw_text || null,
        requirements,
        status: 'Saved' as JobStatus,
        date_applied: new Date().toISOString().split('T')[0],
      }),
    })
    if (res.ok) {
      const { job } = await res.json()
      router.push(`/jobs/${job.id}`)
    } else {
      setSaveError('Save failed. Please try again.')
      setSaving(false)
    }
  }

  const saveTrackerJob = async () => {
    if (!trackerForm.company || !trackerForm.role) return
    setSaving(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: trackerForm.company,
        role: trackerForm.role,
        url: trackerForm.url || null,
        status: trackerForm.status,
        date_applied: trackerForm.date_applied || null,
        notes: trackerForm.notes || null,
      }),
    })
    if (res.ok) {
      const { job } = await res.json()
      router.push(`/jobs/${job.id}`)
    } else {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl animate-fadeIn">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">Add a job</h1>

      {/* Phase 1 — Intake */}
      {phase === 'input' && (
        <div className="space-y-4">
          {/* Primary: URL */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Job listing URL</h3>
              <p className="text-xs text-[var(--text-secondary)]">We&apos;ll extract the job details automatically and always keep the link on file.</p>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(''); setShowPasteFallback(false) }}
              placeholder="https://company.com/careers/job-title"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
            />
            {urlError && (
              <p className="text-xs text-amber-600">{urlError} Paste the job description below instead.</p>
            )}
            <button
              onClick={handleExtractUrl}
              disabled={!url.trim() || urlExtracting}
              className="w-full py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
            >
              {urlExtracting ? 'Reading job posting…' : 'Extract job details →'}
            </button>
          </div>

          {/* Fallback: paste — shown after extraction failure or toggled manually */}
          {showPasteFallback ? (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Paste job description</h3>
                <p className="text-xs text-[var(--text-secondary)]">Copy the full job posting text — title, company, requirements, everything.</p>
              </div>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={7}
                maxLength={10000}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              />
              {textError && <p className="text-xs text-amber-600">{textError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleExtractText}
                  disabled={!jobText.trim() || textExtracting}
                  className="flex-1 py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
                >
                  {textExtracting ? 'Extracting…' : 'Extract from text →'}
                </button>
                <button
                  onClick={() => setPhase('preview')}
                  className="py-2.5 px-4 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl text-sm hover:bg-[var(--surface)] transition-colors"
                >
                  Fill in manually
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPasteFallback(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Can&apos;t share the URL? Paste the description instead →
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Already applied from somewhere else?</p>
            <button
              onClick={() => setPhase('tracker')}
              className="text-sm text-[var(--accent)] font-medium hover:underline transition-colors"
            >
              Quick add to tracker →
            </button>
          </div>
        </div>
      )}

      {/* Phase 2 — Preview / edit */}
      {phase === 'preview' && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">Does this look right? Edit anything that&apos;s wrong, then continue.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Company *</label>
              <input
                value={form.company || ''}
                onChange={(e) => set('company', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Anthropic"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Job title *</label>
              <input
                value={form.role || ''}
                onChange={(e) => set('role', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="ML Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Location</label>
            <input
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="London, UK / Remote"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Requirements (one per line)
            </label>
            <textarea
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono"
              placeholder="Python&#10;5+ years experience&#10;Machine learning..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Full job description
              <span className="text-[var(--text-muted)] font-normal ml-1">— used when tailoring your CV for this role</span>
            </label>
            <textarea
              value={form.raw_text || ''}
              onChange={(e) => set('raw_text', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y"
              placeholder="Paste the full job posting text here..."
            />
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <button
            onClick={saveJob}
            disabled={saving || !form.company || !form.role}
            className="w-full py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
          >
            {saving ? 'Saving…' : 'Save job →'}
          </button>

          <button
            onClick={() => setPhase('input')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back to intake options
          </button>
        </div>
      )}

      {/* Phase — Quick tracker */}
      {phase === 'tracker' && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Log an application</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">No AI extraction — just record where you applied.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Company *</label>
              <input
                value={trackerForm.company}
                onChange={(e) => setTrackerForm(p => ({ ...p, company: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Anthropic"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Job title *</label>
              <input
                value={trackerForm.role}
                onChange={(e) => setTrackerForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="ML Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Job URL</label>
            <input
              type="url"
              value={trackerForm.url}
              onChange={(e) => setTrackerForm(p => ({ ...p, url: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="https://company.com/careers/..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
              <select
                value={trackerForm.status}
                onChange={(e) => setTrackerForm(p => ({ ...p, status: e.target.value as JobStatus }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
              >
                <option value="Applied">Applied</option>
                <option value="Saved">Saved</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Date applied</label>
              <input
                type="date"
                value={trackerForm.date_applied}
                onChange={(e) => setTrackerForm(p => ({ ...p, date_applied: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
            <textarea
              value={trackerForm.notes}
              onChange={(e) => setTrackerForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              placeholder="Where you applied, recruiter name, anything worth remembering..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={saveTrackerJob}
              disabled={saving || !trackerForm.company || !trackerForm.role}
              className="sm:flex-1 py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
            >
              {saving ? 'Saving...' : 'Add to tracker →'}
            </button>
          </div>

          <button
            onClick={() => setPhase('input')}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
