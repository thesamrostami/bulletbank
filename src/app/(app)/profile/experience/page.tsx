'use client'

import { useEffect, useState } from 'react'
import type { WorkExperience, Education, Certification, Project, BulletBank, EmploymentType } from '@/types'
import { fmtMonthYear, bulletNeedsWork } from '@/lib/utils'
import BulletImprovementPanel from '@/components/BulletImprovementPanel'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onAdd, onRemove, placeholder }: { tags: string[]; onAdd: (t: string) => void; onRemove: (i: number) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-6">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">
            {t}
            <button type="button" onClick={() => onRemove(i)} className="text-gray-400 hover:text-gray-600 leading-none">×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) { e.preventDefault(); onAdd(input.trim()); setInput('') }
        }}
        placeholder={placeholder || 'Type and Enter to add...'}
        className="w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
    </div>
  )
}

// ─── Bullet sub-section ──────────────────────────────────────────────────────

function BulletSubSection({
  parentId,
  parentType,
  bullets,
  onBulletsChange,
  roleContext,
}: {
  parentId: string
  parentType: 'work_experience' | 'project'
  bullets: BulletBank[] | null
  onBulletsChange: (bullets: BulletBank[]) => void
  roleContext: string
}) {
  const [loading, setLoading] = useState(bullets === null)
  const [bulletsExpanded, setBulletsExpanded] = useState(false)
  const BULLETS_PREVIEW_COUNT = 3
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [improvingId, setImprovingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newText, setNewText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedBullets, setGeneratedBullets] = useState<Array<{ text: string; skill_tags: string[]; has_metric: boolean; metric_text: string | null }> | null>(null)
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (bullets !== null) return
    const param = parentType === 'work_experience' ? `work_experience_id=${parentId}` : `project_id=${parentId}`
    fetch(`/api/bullets?${param}`)
      .then(r => r.json())
      .then(({ bullets: data }) => {
        onBulletsChange(data || [])
        setLoading(false)
      })
  }, [parentId, parentType, bullets, onBulletsChange])

  const saveBullet = async (bulletId: string, text: string) => {
    await fetch(`/api/bullets/${bulletId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    onBulletsChange((bullets || []).map(b => b.id === bulletId ? { ...b, text } : b))
    setEditingId(null)
  }

  const deleteBullet = async (bulletId: string) => {
    if (!confirm('Delete this bullet? This cannot be undone.')) return
    await fetch(`/api/bullets/${bulletId}`, { method: 'DELETE' })
    onBulletsChange((bullets || []).filter(b => b.id !== bulletId))
  }

  const addBullet = async () => {
    if (!newText.trim()) return
    const endpoint = parentType === 'work_experience'
      ? `/api/work-experiences/${parentId}/bullets`
      : `/api/projects/${parentId}/bullets`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bullet_id: `e${Date.now()}`,
        type: parentType === 'work_experience' ? 'experience' : 'project',
        text: newText.trim(),
        skill_tags: [],
        has_metric: false,
        times_used: 0,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      onBulletsChange([...(bullets || []), data.bullet])
      setNewText('')
      setAddingNew(false)
    }
  }

  const generateBullets = async (company: string, title: string) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/bullets/generate-for-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workExperienceId: parentId, company, title }),
      })
      const data = await res.json()
      if (res.ok) {
        setGeneratedBullets(data.bullets)
        setSelectedGenerated(new Set(data.bullets.map((_: unknown, i: number) => i)))
      }
    } catch { /* silent */ }
    setGenerating(false)
  }

  const saveGeneratedBullets = async () => {
    if (!generatedBullets) return
    const endpoint = `/api/work-experiences/${parentId}/bullets`
    const saved: BulletBank[] = []
    for (let i = 0; i < generatedBullets.length; i++) {
      if (!selectedGenerated.has(i)) continue
      const b = generatedBullets[i]
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet_id: `e${Date.now()}${i}`,
          type: 'experience',
          text: b.text,
          skill_tags: b.skill_tags || [],
          has_metric: b.has_metric || false,
          metric_text: b.metric_text,
          times_used: 0,
        }),
      })
      const data = await res.json()
      if (res.ok) saved.push(data.bullet)
    }
    onBulletsChange([...(bullets || []), ...saved])
    setGeneratedBullets(null)
  }

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading bullets...</div>

  const allBullets = bullets || []
  const visibleBullets = bulletsExpanded ? allBullets : allBullets.slice(0, BULLETS_PREVIEW_COUNT)
  const hiddenCount = allBullets.length - BULLETS_PREVIEW_COUNT

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bullets for this role</h4>
        {parentType === 'work_experience' && (
          <button
            type="button"
            onClick={() => generateBullets('', '')}
            disabled={generating}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate bullets with AI →'}
          </button>
        )}
      </div>

      {/* AI generated preview */}
      {generatedBullets && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
          <p className="text-xs font-medium text-blue-800 mb-2">Select bullets to add:</p>
          {generatedBullets.map((b, i) => (
            <label key={i} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedGenerated.has(i)}
                onChange={() => {
                  const s = new Set(selectedGenerated)
                  if (s.has(i)) { s.delete(i) } else { s.add(i) }
                  setSelectedGenerated(s)
                }}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-800">{b.text}</span>
            </label>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={saveGeneratedBullets} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
              Add selected ({selectedGenerated.size})
            </button>
            <button onClick={() => setGeneratedBullets(null)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {visibleBullets.map(b => (
          <div key={b.id}>
            <div className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
              {editingId === b.id ? (
                <div className="flex-1 space-y-1">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    autoFocus
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveBullet(b.id, editText)} className="px-2 py-1 bg-[var(--navy)] text-white rounded text-xs">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm text-gray-700 leading-relaxed">{b.text}</p>
                  {b.is_finalised && <span className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-full shrink-0">Finalised</span>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bulletNeedsWork(b) && improvingId !== b.id && (
                      <button onClick={() => setImprovingId(b.id)} className="px-1.5 py-0.5 text-amber-700 bg-amber-50 border border-amber-200 rounded text-xs hover:bg-amber-100">Improve →</button>
                    )}
                    <button onClick={() => { setEditingId(b.id); setEditText(b.text) }} className="p-1 text-gray-400 hover:text-gray-700 rounded text-xs">Edit</button>
                    <button onClick={() => deleteBullet(b.id)} className="p-1 text-gray-400 hover:text-red-600 rounded text-xs">Del</button>
                  </div>
                </>
              )}
            </div>
            {improvingId === b.id && (
              <BulletImprovementPanel
                bullet={b}
                roleContext={roleContext}
                onAccept={newText => {
                  onBulletsChange((bullets || []).map(bx => bx.id === b.id ? { ...bx, text: newText } : bx))
                  fetch(`/api/bullets/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText }) }).catch(() => {})
                  setImprovingId(null)
                }}
                onFinalise={() => {
                  onBulletsChange((bullets || []).map(bx => bx.id === b.id ? { ...bx, is_finalised: true } : bx))
                  fetch(`/api/bullets/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_finalised: true }) }).catch(() => {})
                  setImprovingId(null)
                }}
                onClose={() => setImprovingId(null)}
              />
            )}
          </div>
        ))}
      </div>

      {hiddenCount > 0 && !bulletsExpanded && (
        <button
          onClick={() => setBulletsExpanded(true)}
          className="mt-2 w-full text-center py-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors rounded-lg hover:bg-[var(--accent-light)]"
        >
          Show {hiddenCount} more bullet{hiddenCount !== 1 ? 's' : ''} ↓
        </button>
      )}
      {bulletsExpanded && allBullets.length > BULLETS_PREVIEW_COUNT && (
        <button
          onClick={() => setBulletsExpanded(false)}
          className="mt-2 w-full text-center py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Show fewer ↑
        </button>
      )}

      {addingNew ? (
        <div className="mt-2 space-y-1">
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Write a bullet point..."
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex gap-2">
            <button onClick={addBullet} disabled={!newText.trim()} className="px-3 py-1.5 bg-[var(--navy)] text-white rounded text-xs font-medium disabled:opacity-40">Add</button>
            <button onClick={() => { setAddingNew(false); setNewText('') }} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="mt-2 w-full text-left px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add bullet
        </button>
      )}
    </div>
  )
}

// ─── Work Experience card ─────────────────────────────────────────────────────

const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Apprenticeship', 'Volunteer']

function WorkExpCard({
  exp,
  index,
  bulletMap,
  onUpdate,
  onDelete,
  onBulletsChange,
  dragHandlers,
  isDragging,
}: {
  exp: WorkExperience
  index: number
  bulletMap: Record<string, BulletBank[] | null>
  onUpdate: (updated: WorkExperience) => void
  onDelete: (id: string) => void
  onBulletsChange: (id: string, bullets: BulletBank[]) => void
  dragHandlers: {
    onDragStart: () => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: () => void
  }
  isDragging: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(exp)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/work-experiences/${exp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: draft.company,
          title: draft.title,
          employment_type: draft.employment_type,
          location: draft.location || null,
          is_remote: draft.is_remote,
          start_date: draft.start_date,
          end_date: draft.is_current ? null : draft.end_date || null,
          is_current: draft.is_current,
          description: draft.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(data.workExperience)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm(`Delete "${exp.company} — ${exp.title}"? This will also unlink any associated bullets.`)) return
    await fetch(`/api/work-experiences/${exp.id}`, { method: 'DELETE' })
    onDelete(exp.id)
  }

  const bullets = bulletMap[exp.id] ?? null
  const bulletCount = bullets?.length ?? 0

  return (
    <div
      id={`exp-${exp.id}`}
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      className={`border rounded-xl overflow-hidden transition-opacity ${isDragging ? 'opacity-50' : ''} ${index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
    >
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 group/header"
        onClick={() => setOpen(!open)}
      >
        {/* Drag handle — ⠿ dots, hover-reveal */}
        <div
          className="shrink-0 cursor-grab opacity-0 group-hover/header:opacity-100 transition-opacity text-gray-400 select-none"
          onClick={e => e.stopPropagation()}
          aria-hidden
        >
          <svg className="w-4 h-6" viewBox="0 0 8 18" fill="currentColor">
            <circle cx="2" cy="3" r="1.3" /><circle cx="6" cy="3" r="1.3" />
            <circle cx="2" cy="9" r="1.3" /><circle cx="6" cy="9" r="1.3" />
            <circle cx="2" cy="15" r="1.3" /><circle cx="6" cy="15" r="1.3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{exp.company}</span>
            <span className="text-sm text-gray-600">{exp.title}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{exp.employment_type}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{fmtMonthYear(exp.start_date)} — {exp.is_current ? 'Present' : fmtMonthYear(exp.end_date)}</span>
            {exp.location && <span>{exp.location}{exp.is_remote ? ' (Remote)' : ''}</span>}
            {open && <span className="text-blue-600">{bulletCount} bullet{bulletCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        {!open && bulletCount > 0 && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{bulletCount} bullets</span>
        )}
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Expanded form */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input type="text" value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Job title</label>
              <input type="text" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employment type</label>
              <select value={draft.employment_type} onChange={e => setDraft(d => ({ ...d, employment_type: e.target.value as EmploymentType }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <div className="flex gap-2">
                <input type="text" value={draft.location || ''} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="London" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={draft.is_remote} onChange={e => setDraft(d => ({ ...d, is_remote: e.target.checked }))} />
                  Remote
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input type="month" value={draft.start_date ? draft.start_date.slice(0, 7) : ''}
                onChange={e => setDraft(d => ({ ...d, start_date: e.target.value ? `${e.target.value}-01` : '' }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <div className="space-y-1">
                <input type="month" value={draft.end_date ? draft.end_date.slice(0, 7) : ''} disabled={draft.is_current}
                  onChange={e => setDraft(d => ({ ...d, end_date: e.target.value ? `${e.target.value}-01` : null }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={draft.is_current} onChange={e => setDraft(d => ({ ...d, is_current: e.target.checked, end_date: e.target.checked ? null : d.end_date }))} />
                  Currently working here
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                rows={3} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button type="button" onClick={del} className="ml-auto text-sm text-red-600 hover:text-red-800">
              Delete this role
            </button>
          </div>
          <BulletSubSection
            parentId={exp.id}
            parentType="work_experience"
            bullets={bullets}
            onBulletsChange={b => onBulletsChange(exp.id, b)}
            roleContext={`${exp.title} at ${exp.company}`}
          />
        </div>
      )}
    </div>
  )
}

// ─── Education card ──────────────────────────────────────────────────────────

function EducationCard({
  edu,
  onUpdate,
  onDelete,
}: {
  edu: Education
  onUpdate: (e: Education) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(edu)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/education/${edu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: draft.institution,
          degree: draft.degree || null,
          field_of_study: draft.field_of_study || null,
          start_date: draft.start_date || null,
          end_date: draft.is_current ? null : draft.end_date || null,
          is_current: draft.is_current,
          grade: draft.grade || null,
          description: draft.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(data.education)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }

  const del = async () => {
    if (!confirm(`Delete "${edu.institution}"?`)) return
    await fetch(`/api/education/${edu.id}`, { method: 'DELETE' })
    onDelete(edu.id)
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{edu.institution}</div>
          <div className="text-sm text-gray-500">{[edu.degree, edu.field_of_study].filter(Boolean).join(', ') || 'No degree listed'}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {fmtMonthYear(edu.start_date)} — {edu.is_current ? 'Present' : fmtMonthYear(edu.end_date)}
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Institution</label>
              <input type="text" value={draft.institution} onChange={e => setDraft(d => ({ ...d, institution: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Degree</label>
              <input type="text" value={draft.degree || ''} onChange={e => setDraft(d => ({ ...d, degree: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="BSc, MEng..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field of study</label>
              <input type="text" value={draft.field_of_study || ''} onChange={e => setDraft(d => ({ ...d, field_of_study: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="Computer Science" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input type="month" value={draft.start_date ? draft.start_date.slice(0, 7) : ''}
                onChange={e => setDraft(d => ({ ...d, start_date: e.target.value ? `${e.target.value}-01` : null }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <div className="space-y-1">
                <input type="month" value={draft.end_date ? draft.end_date.slice(0, 7) : ''} disabled={draft.is_current}
                  onChange={e => setDraft(d => ({ ...d, end_date: e.target.value ? `${e.target.value}-01` : null }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={draft.is_current} onChange={e => setDraft(d => ({ ...d, is_current: e.target.checked }))} />
                  Currently studying
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade (optional)</label>
              <input type="text" value={draft.grade || ''} onChange={e => setDraft(d => ({ ...d, grade: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="First class, 3.8 GPA..." />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button type="button" onClick={del} className="ml-auto text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Certification card ──────────────────────────────────────────────────────

function CertCard({ cert, onUpdate, onDelete }: { cert: Certification; onUpdate: (c: Certification) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(cert)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/certifications/${cert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          issuing_organisation: draft.issuing_organisation || null,
          issue_date: draft.issue_date || null,
          expiry_date: draft.no_expiry ? null : draft.expiry_date || null,
          no_expiry: draft.no_expiry,
          credential_id: draft.credential_id || null,
          credential_url: draft.credential_url || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(data.certification)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{cert.name}</div>
          <div className="text-sm text-gray-500">{cert.issuing_organisation || 'No organisation'} · {cert.issue_date ? fmtMonthYear(cert.issue_date) : 'No date'}</div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Certification name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issuing organisation</label>
              <input type="text" value={draft.issuing_organisation || ''} onChange={e => setDraft(d => ({ ...d, issuing_organisation: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" placeholder="AWS, Google, Coursera..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue date</label>
              <input type="month" value={draft.issue_date ? draft.issue_date.slice(0, 7) : ''}
                onChange={e => setDraft(d => ({ ...d, issue_date: e.target.value ? `${e.target.value}-01` : null }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry date</label>
              <div className="space-y-1">
                <input type="month" disabled={draft.no_expiry} value={draft.expiry_date ? draft.expiry_date.slice(0, 7) : ''}
                  onChange={e => setDraft(d => ({ ...d, expiry_date: e.target.value ? `${e.target.value}-01` : null }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={draft.no_expiry} onChange={e => setDraft(d => ({ ...d, no_expiry: e.target.checked }))} />
                  No expiry
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credential ID</label>
              <input type="text" value={draft.credential_id || ''} onChange={e => setDraft(d => ({ ...d, credential_id: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credential URL</label>
              <input type="url" value={draft.credential_url || ''} onChange={e => setDraft(d => ({ ...d, credential_url: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button onClick={() => { if (confirm('Delete?')) { fetch(`/api/certifications/${cert.id}`, { method: 'DELETE' }); onDelete(cert.id) }}} className="ml-auto text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  bulletMap,
  onUpdate,
  onDelete,
  onBulletsChange,
}: {
  project: Project
  bulletMap: Record<string, BulletBank[] | null>
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
  onBulletsChange: (id: string, bullets: BulletBank[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(project)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          url: draft.url || null,
          repo_url: draft.repo_url || null,
          tech_stack: draft.tech_stack,
          start_date: draft.start_date || null,
          end_date: draft.is_ongoing ? null : draft.end_date || null,
          is_ongoing: draft.is_ongoing,
          highlight: draft.highlight,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(data.project)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }

  const bullets = bulletMap[project.id] ?? null

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-gray-900">{project.name}</span>
            {project.highlight && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">On CV</span>}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{project.tech_stack.slice(0, 4).join(', ') || 'No tech stack'}</div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Project name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                rows={3} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Live URL</label>
              <input type="url" value={draft.url || ''} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Repo URL</label>
              <input type="url" value={draft.repo_url || ''} onChange={e => setDraft(d => ({ ...d, repo_url: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tech stack</label>
              <TagInput
                tags={draft.tech_stack}
                onAdd={t => setDraft(d => ({ ...d, tech_stack: [...d.tech_stack, t] }))}
                onRemove={i => setDraft(d => ({ ...d, tech_stack: d.tech_stack.filter((_, idx) => idx !== i) }))}
                placeholder="React, TypeScript, Supabase..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input type="month" value={draft.start_date ? draft.start_date.slice(0, 7) : ''}
                onChange={e => setDraft(d => ({ ...d, start_date: e.target.value ? `${e.target.value}-01` : null }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <div className="space-y-1">
                <input type="month" disabled={draft.is_ongoing} value={draft.end_date ? draft.end_date.slice(0, 7) : ''}
                  onChange={e => setDraft(d => ({ ...d, end_date: e.target.value ? `${e.target.value}-01` : null }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40" />
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={draft.is_ongoing} onChange={e => setDraft(d => ({ ...d, is_ongoing: e.target.checked }))} />
                  Ongoing
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`highlight-${project.id}`} checked={draft.highlight} onChange={e => setDraft(d => ({ ...d, highlight: e.target.checked }))} />
              <label htmlFor={`highlight-${project.id}`} className="text-sm text-gray-700">Show on CV</label>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved ✓</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button onClick={() => { if (confirm('Delete?')) { fetch(`/api/projects/${project.id}`, { method: 'DELETE' }); onDelete(project.id) }}} className="ml-auto text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
          <BulletSubSection
            parentId={project.id}
            parentType="project"
            bullets={bullets}
            onBulletsChange={b => onBulletsChange(project.id, b)}
            roleContext={`Project: ${project.name}`}
          />
        </div>
      )}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, count, onAdd, children }: { title: string; count: number; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <span className="text-sm text-gray-400">{count} {count === 1 ? 'entry' : 'entries'}</span>
        </div>
        <button type="button" onClick={onAdd} className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          + Add
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExperiencePage() {
  const [workExps, setWorkExps] = useState<WorkExperience[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [expBullets, setExpBullets] = useState<Record<string, BulletBank[] | null>>({})
  const [projBullets, setProjBullets] = useState<Record<string, BulletBank[] | null>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/work-experiences').then(r => r.json()),
      fetch('/api/education').then(r => r.json()),
      fetch('/api/certifications').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([we, edu, certs, proj]) => {
      setWorkExps(we.workExperiences || [])
      setEducation(edu.education || [])
      setCertifications(certs.certifications || [])
      setProjects(proj.projects || [])
      setLoading(false)
    })
  }, [])

  const addWorkExp = async () => {
    const res = await fetch('/api/work-experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: 'New Company', title: 'Job Title', start_date: new Date().toISOString().split('T')[0], is_current: true, employment_type: 'Full-time' }),
    })
    const data = await res.json()
    if (res.ok) setWorkExps(prev => [...prev, data.workExperience])
  }

  const addEducation = async () => {
    const res = await fetch('/api/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'New Institution', is_current: false }),
    })
    const data = await res.json()
    if (res.ok) setEducation(prev => [...prev, data.education])
  }

  const addCert = async () => {
    const res = await fetch('/api/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Certification', no_expiry: false }),
    })
    const data = await res.json()
    if (res.ok) setCertifications(prev => [...prev, data.certification])
  }

  const addProject = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', tech_stack: [], highlight: true, is_ongoing: false }),
    })
    const data = await res.json()
    if (res.ok) setProjects(prev => [...prev, data.project])
  }

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); return }
    const newOrder = [...workExps]
    const [moved] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, moved)
    setWorkExps(newOrder)
    setDragIndex(null)
    await fetch('/api/work-experiences/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: newOrder.map(e => e.id) }),
    })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-10">

      {/* Total experience duration summary */}
      {workExps.length > 0 && (() => {
        const totalMonths = workExps.reduce((acc, exp) => {
          const start = exp.start_date ? new Date(exp.start_date) : null
          const end = exp.is_current ? new Date() : (exp.end_date ? new Date(exp.end_date) : null)
          if (!start || !end) return acc
          return acc + Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth())
        }, 0)
        const years = Math.floor(totalMonths / 12)
        return (
          <p className="text-sm text-[var(--text-muted)] -mt-4">
            {workExps.length} role{workExps.length !== 1 ? 's' : ''} · {years} year{years !== 1 ? 's' : ''} total experience
          </p>
        )
      })()}

      {workExps.length > 3 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {workExps.map(exp => (
            <button
              key={exp.id}
              onClick={() => {
                document.getElementById(`exp-${exp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="shrink-0 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-full hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              {exp.company} · {(expBullets[exp.id] || []).length}
            </button>
          ))}
        </div>
      )}

      <Section title="Work experience" count={workExps.length} onAdd={addWorkExp}>
        {workExps.map((exp, i) => (
          <WorkExpCard
            key={exp.id}
            exp={exp}
            index={i}
            bulletMap={expBullets}
            onUpdate={updated => setWorkExps(prev => prev.map(e => e.id === updated.id ? updated : e))}
            onDelete={id => setWorkExps(prev => prev.filter(e => e.id !== id))}
            onBulletsChange={(id, bullets) => setExpBullets(prev => ({ ...prev, [id]: bullets }))}
            isDragging={dragIndex === i}
            dragHandlers={{
              onDragStart: () => setDragIndex(i),
              onDragOver: (e) => { e.preventDefault() },
              onDrop: () => handleDrop(i),
            }}
          />
        ))}
        {workExps.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">No work experience added yet.</p>
        )}
      </Section>

      <Section title="Education" count={education.length} onAdd={addEducation}>
        {education.map(edu => (
          <EducationCard
            key={edu.id}
            edu={edu}
            onUpdate={updated => setEducation(prev => prev.map(e => e.id === updated.id ? updated : e))}
            onDelete={id => setEducation(prev => prev.filter(e => e.id !== id))}
          />
        ))}
        {education.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">No education added yet.</p>
        )}
      </Section>

      <Section title="Certifications" count={certifications.length} onAdd={addCert}>
        {certifications.map(cert => (
          <CertCard
            key={cert.id}
            cert={cert}
            onUpdate={updated => setCertifications(prev => prev.map(c => c.id === updated.id ? updated : c))}
            onDelete={id => setCertifications(prev => prev.filter(c => c.id !== id))}
          />
        ))}
        {certifications.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">No certifications added yet.</p>
        )}
      </Section>

      <Section title="Projects" count={projects.length} onAdd={addProject}>
        {projects.map(proj => (
          <ProjectCard
            key={proj.id}
            project={proj}
            bulletMap={projBullets}
            onUpdate={updated => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
            onDelete={id => setProjects(prev => prev.filter(p => p.id !== id))}
            onBulletsChange={(id, bullets) => setProjBullets(prev => ({ ...prev, [id]: bullets }))}
          />
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">No projects added yet.</p>
        )}
      </Section>

    </div>
  )
}
