'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { BulletBank, WorkExperience } from '@/types'
import { bulletStrength, bulletNeedsWork } from '@/lib/utils'
import BulletImprovementPanel from '@/components/BulletImprovementPanel'

// ─── Bullet card ──────────────────────────────────────────────────────────────

function BulletCard({
  bullet,
  workExpName,
  selectMode,
  selected,
  onSelect,
  onSave,
  onDelete,
  roleContext,
}: {
  bullet: BulletBank
  workExpName?: string
  selectMode: boolean
  selected: boolean
  onSelect: () => void
  onSave: (id: string, patch: Partial<BulletBank>) => void
  onDelete: (id: string) => void
  roleContext: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bullet.text)
  const [editingTags, setEditingTags] = useState(false)
  const [tagDraft, setTagDraft] = useState(bullet.skill_tags.join(', '))
  const [improveOpen, setImproveOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing, draft])

  const saveText = () => {
    if (draft.trim() !== bullet.text) {
      onSave(bullet.id, { text: draft.trim() })
    }
    setEditing(false)
  }

  const saveTags = () => {
    const tags = tagDraft.split(',').map(t => t.trim()).filter(Boolean)
    onSave(bullet.id, { skill_tags: tags })
    setEditingTags(false)
  }

  const strength = bulletStrength(bullet)
  const isNeedsWork = bulletNeedsWork(bullet)

  const strengthClass = bullet.is_finalised
    ? 'bg-gray-50 text-gray-400 border-gray-200'
    : strength === 'Strong' ? 'bg-green-50 text-green-700 border-green-200'
    : strength === 'Good' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <div className={`relative bg-white border rounded-xl p-4 ${selected ? 'ring-2 ring-gray-900 border-gray-900' : 'border-gray-100'}`}>
      {selectMode && (
        <div className="absolute top-3 left-3">
          <input type="checkbox" checked={selected} onChange={onSelect} className="w-4 h-4" />
        </div>
      )}
      <div className={selectMode ? 'pl-6' : ''}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="shrink-0 text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded mt-0.5">{bullet.bullet_id}</span>
          {!editing && (
            <div className="flex items-center gap-1">
              {isNeedsWork && !improveOpen && (
                <button
                  onClick={() => setImproveOpen(true)}
                  className="px-2 py-0.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                >
                  Improve with AI →
                </button>
              )}
              <button
                onClick={() => {
                  if (!confirm('Delete this bullet? This cannot be undone.')) return
                  onDelete(bullet.id)
                }}
                className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                title="Delete bullet"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M6 4V2.5h4V4M5 4v8.5h6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Bullet text */}
        {editing ? (
          <div className="mb-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => { setDraft(e.target.value) }}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveText()
                if (e.key === 'Escape') { setDraft(bullet.text); setEditing(false) }
              }}
              autoFocus
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none overflow-hidden"
              style={{ minHeight: '2.5rem' }}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={saveText} className="px-2 py-1 bg-[var(--navy)] text-white rounded text-xs font-medium">Save</button>
              <button onClick={() => { setDraft(bullet.text); setEditing(false) }} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => { setEditing(true); setDraft(bullet.text) }}
            className="text-sm text-gray-800 leading-relaxed cursor-text hover:bg-gray-50 rounded px-1 -mx-1 mb-2"
          >
            {bullet.text}
          </p>
        )}

        {/* Tags + metadata row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {bullet.is_finalised ? (
            <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-full">Finalised</span>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${strengthClass}`}>{strength}</span>
          )}
          {bullet.has_metric && bullet.metric_text && (
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">{bullet.metric_text}</span>
          )}
          {editingTags ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagDraft}
                onChange={e => setTagDraft(e.target.value)}
                onBlur={saveTags}
                onKeyDown={e => e.key === 'Enter' && saveTags()}
                autoFocus
                className="px-2 py-0.5 border border-gray-300 rounded text-xs focus:outline-none"
                placeholder="tag1, tag2..."
              />
            </div>
          ) : (
            <>
              {bullet.skill_tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{tag}</span>
              ))}
              <button onClick={() => { setEditingTags(true); setTagDraft(bullet.skill_tags.join(', ')) }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {bullet.skill_tags.length > 0 ? 'Edit tags' : '+ Add tags'}
              </button>
            </>
          )}
          {bullet.times_used > 0 && (
            <span className="text-xs text-gray-400">Used {bullet.times_used}×</span>
          )}
          {workExpName && (
            <Link href="/profile/experience" className="text-xs text-blue-500 hover:text-blue-700 ml-auto">
              ↗ {workExpName}
            </Link>
          )}
        </div>

        {/* Inline improvement panel */}
        {improveOpen && (
          <BulletImprovementPanel
            bullet={bullet}
            roleContext={roleContext}
            onAccept={newText => {
              onSave(bullet.id, { text: newText })
              setImproveOpen(false)
            }}
            onFinalise={() => {
              onSave(bullet.id, { is_finalised: true })
              setImproveOpen(false)
            }}
            onClose={() => setImproveOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  summary: 'Summaries',
  highlight: 'Key highlights',
  experience: 'Experience bullets',
  project: 'Project bullets',
}
const TYPE_ORDER: BulletBank['type'][] = ['summary', 'highlight', 'experience', 'project']

export default function BulletsPage() {
  const [bullets, setBullets] = useState<BulletBank[]>([])
  const [workExps, setWorkExps] = useState<WorkExperience[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRoleId, setFilterRoleId] = useState<string | null>(null)
  const [filterNoMetrics, setFilterNoMetrics] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moveTo, setMoveTo] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const bulletIdCounter = useRef(1000)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setSearch(searchInput), 150)
  }, [searchInput])

  useEffect(() => {
    Promise.all([
      fetch('/api/bullets').then(r => r.json()),
      fetch('/api/work-experiences').then(r => r.json()),
    ]).then(([b, we]) => {
      const loadedExps: WorkExperience[] = we.workExperiences || []
      setBullets(b.bullets || [])
      setWorkExps(loadedExps)
      setLoading(false)
      // Collapse everything by default
      setCollapsedSections(new Set([
        ...TYPE_ORDER,
        ...loadedExps.map(e => e.id),
        'none',
      ]))
    })
  }, [])

  const saveBullet = useCallback(async (id: string, patch: Partial<BulletBank>) => {
    // Optimistic update — store original for rollback
    let original: BulletBank | undefined
    setBullets(prev => {
      original = prev.find(b => b.id === id)
      return prev.map(b => b.id === id ? { ...b, ...patch } : b)
    })
    try {
      const res = await fetch(`/api/bullets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (res.ok) {
        setBullets(prev => prev.map(b => b.id === id ? { ...b, ...data.bullet } : b))
      } else if (original) {
        setBullets(prev => prev.map(b => b.id === id ? original! : b))
      }
    } catch {
      if (original) setBullets(prev => prev.map(b => b.id === id ? original! : b))
    }
  }, [])

  const deleteBullet = useCallback(async (id: string) => {
    setBullets(prev => prev.filter(b => b.id !== id))
    try {
      await fetch(`/api/bullets/${id}`, { method: 'DELETE' })
    } catch {
      // best effort
    }
  }, [])

  const addBullet = async (type: BulletBank['type'], workExpId?: string) => {
    bulletIdCounter.current += 1
    const newBulletId = `${type[0]}${bulletIdCounter.current}`
    const res = await fetch('/api/bullets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bullet_id: newBulletId,
        type,
        text: 'New bullet — click to edit',
        skill_tags: [],
        has_metric: false,
        times_used: 0,
        is_finalised: false,
        work_experience_id: workExpId || null,
        project_id: null,
      }),
    })
    const data = await res.json()
    if (res.ok) setBullets(prev => [...prev, data.bullet])
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} bullets? This cannot be undone.`)) return
    await Promise.all([...selected].map(id => fetch(`/api/bullets/${id}`, { method: 'DELETE' })))
    setBullets(prev => prev.filter(b => !selected.has(b.id)))
    setSelected(new Set())
    setSelectMode(false)
  }

  const bulkMove = async () => {
    if (!moveTo) return
    await Promise.all([...selected].map(id =>
      fetch(`/api/bullets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_experience_id: moveTo, type: 'experience' }),
      })
    ))
    setBullets(prev => prev.map(b => selected.has(b.id) ? { ...b, work_experience_id: moveTo, type: 'experience' } : b))
    setSelected(new Set())
    setSelectMode(false)
    setMoveTo('')
  }

  // Filtering
  const expNameMap = Object.fromEntries(workExps.map(e => [e.id, e.company]))

  const filtered = bullets.filter(b => {
    if (filterType !== 'all' && b.type !== filterType) return false
    if (filterRoleId && b.work_experience_id !== filterRoleId) return false
    if (filterNoMetrics && b.has_metric) return false
    if (search) {
      const q = search.toLowerCase()
      return b.text.toLowerCase().includes(q) || b.skill_tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const grouped: Record<string, BulletBank[]> = {}
  for (const b of filtered) {
    grouped[b.type] = grouped[b.type] || []
    grouped[b.type].push(b)
  }

  const roleCounts = workExps.reduce<Record<string, number>>((acc, e) => {
    acc[e.id] = bullets.filter(b => b.work_experience_id === e.id).length
    return acc
  }, {})

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)]">

      {/* ── Left panel ── */}
      <aside className="w-full md:w-64 shrink-0 border-r border-gray-100 bg-white p-5 space-y-5">
        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search bullets..."
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />

        {/* No-metrics filter */}
        <div>
          <button
            onClick={() => { setFilterNoMetrics(v => !v); setFilterType('all'); setFilterRoleId(null) }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors text-left ${
              filterNoMetrics ? 'bg-amber-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] border border-dashed border-amber-300'
            }`}
          >
            <span>Without metrics</span>
            <span className={`text-xs ${filterNoMetrics ? 'text-amber-100' : 'text-amber-500'}`}>
              {bullets.filter(b => !b.has_metric).length}
            </span>
          </button>
        </div>

        {/* By type */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By type</p>
          <div className="flex flex-col gap-0.5">
            {[['all', 'All bullets', bullets.length.toString()], ...TYPE_ORDER.map(t => [t, TYPE_LABELS[t], bullets.filter(b => b.type === t).length.toString()])].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => { setFilterType(key); setFilterRoleId(null) }}
                className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors text-left ${filterType === key && !filterRoleId ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'}`}
              >
                <span>{label}</span>
                <span className={`text-xs ${filterType === key && !filterRoleId ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* By role */}
        {workExps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By role</p>
            <div className={`flex flex-col gap-0.5 ${workExps.length >= 7 ? 'max-h-48 overflow-y-auto' : ''}`}>
              {workExps.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => { setFilterRoleId(exp.id); setFilterType('all') }}
                  className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors text-left ${filterRoleId === exp.id ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'}`}
                >
                  <span className="truncate">{exp.company}</span>
                  <span className={`text-xs shrink-0 ${filterRoleId === exp.id ? 'text-gray-300' : 'text-gray-400'}`}>{roleCounts[exp.id] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 p-6 min-w-0">

        {/* Summary bar */}
        {!loading && (
          <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">{bullets.length}</span> bullet{bullets.length !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-[var(--text-muted)]">·</span>
            <span className="text-sm text-[var(--text-muted)]">
              <span className="font-semibold text-amber-600">{bullets.filter(b => b.has_metric).length}</span> with metrics
            </span>
            <span className="text-sm text-[var(--text-muted)]">·</span>
            <span className="text-sm text-[var(--text-muted)]">
              <span className="font-semibold text-green-600">{bullets.filter(b => b.is_finalised).length}</span> finalised
            </span>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length} bullet{filtered.length !== 1 ? 's' : ''}
            </span>
            {filterType === 'all' && !filterRoleId && filtered.length > 0 && (
              <button
                onClick={() => {
                  if (collapsedSections.size > 0) {
                    setCollapsedSections(new Set())
                  } else {
                    const allKeys = [
                      ...TYPE_ORDER.filter(t => (grouped[t]?.length ?? 0) > 0),
                      ...workExps.map(e => e.id),
                    ]
                    setCollapsedSections(new Set(allKeys))
                  }
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {collapsedSections.size > 0 ? 'Expand all' : 'Collapse all'}
              </button>
            )}
          </div>
          <button
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${selectMode ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {selectMode ? 'Exit select' : 'Select'}
          </button>
        </div>

        {/* Bullet groups */}
        <div className="space-y-8">
          {TYPE_ORDER.filter(t => (grouped[t]?.length ?? 0) > 0 || (filterType === 'all' && !filterRoleId)).map(type => {
            const typeBullets = grouped[type] || []
            if (typeBullets.length === 0 && search) return null

            // Sub-group by role for experience/project type
            const roleGroups: Array<{ roleId: string | null; roleName: string; bullets: BulletBank[] }> = []
            if (type === 'experience') {
              const byRole: Record<string, BulletBank[]> = {}
              for (const b of typeBullets) {
                const key = b.work_experience_id || '__none__'
                byRole[key] = byRole[key] || []
                byRole[key].push(b)
              }
              for (const [key, bs] of Object.entries(byRole)) {
                const role = workExps.find(e => e.id === key)
                roleGroups.push({ roleId: key === '__none__' ? null : key, roleName: role?.company || 'Unlinked', bullets: bs })
              }
            } else {
              roleGroups.push({ roleId: null, roleName: '', bullets: typeBullets })
            }

            {/* Type-level collapse key for non-experience sections */}
            const typeSectionKey = type
            const isTypeSectionCollapsed = collapsedSections.has(typeSectionKey)

            return (
              <div key={type}>
                {/* Section header — always a collapsible button */}
                <button
                  onClick={() => {
                    setCollapsedSections(prev => {
                      const next = new Set(prev)
                      next.has(typeSectionKey) ? next.delete(typeSectionKey) : next.add(typeSectionKey)
                      return next
                    })
                  }}
                  className="flex items-center justify-between w-full text-left mb-3 group"
                >
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{TYPE_LABELS[type]}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{typeBullets.length}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isTypeSectionCollapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    >
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </div>
                </button>

                {!isTypeSectionCollapsed && roleGroups.map(({ roleId, roleName, bullets: groupBullets }) => {
                  const collapseKey = type === 'experience' ? (roleId || 'none') : typeSectionKey
                  const isCollapsed = type === 'experience' && collapsedSections.has(collapseKey)
                  return (
                    <div key={collapseKey} className="mb-4">
                      {type === 'experience' && (
                        <button
                          onClick={() => {
                            setCollapsedSections(prev => {
                              const next = new Set(prev)
                              next.has(collapseKey) ? next.delete(collapseKey) : next.add(collapseKey)
                              return next
                            })
                          }}
                          className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors group mb-1"
                        >
                          <span className="text-xs text-[var(--text-muted)] font-medium">{roleName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)]">{groupBullets.length} bullets</span>
                            <svg
                              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            >
                              <path d="M4 6l4 4 4-4" />
                            </svg>
                          </div>
                        </button>
                      )}
                      {!isCollapsed && (
                        <div className="space-y-2">
                          {groupBullets.map(b => {
                            const role = workExps.find(e => e.id === b.work_experience_id)
                            const rc = role ? `${role.title} at ${role.company}` : null
                            return (
                              <BulletCard
                                key={b.id}
                                bullet={b}
                                workExpName={b.work_experience_id ? expNameMap[b.work_experience_id] : undefined}
                                selectMode={selectMode}
                                selected={selected.has(b.id)}
                                roleContext={rc}
                                onSelect={() => {
                                  const s = new Set(selected)
                                  if (s.has(b.id)) { s.delete(b.id) } else { s.add(b.id) }
                                  setSelected(s)
                                }}
                                onSave={saveBullet}
                                onDelete={deleteBullet}
                              />
                            )
                          })}
                        </div>
                      )}
                      {/* Add bullet to this role */}
                      {type === 'experience' && roleId && !isCollapsed && (
                        <button
                          onClick={() => addBullet('experience', roleId)}
                          className="mt-2 w-full text-left px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-600 transition-colors"
                        >
                          + Add bullet to {roleName}
                        </button>
                      )}
                    </div>
                  )
                })}

              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">
              {search ? 'No bullets match your search.' : 'No bullets yet.'}
            </p>
          )}
        </div>

        {/* Standalone add highlight */}
        {!search && (filterType === 'all' || filterType === 'highlight') && !filterRoleId && (
          <div className="mt-6">
            <button
              onClick={() => addBullet('highlight')}
              className="w-full text-left px-4 py-3 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              + Add highlight (no role link)
            </button>
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--navy)] text-white px-5 py-3 rounded-2xl shadow-xl z-50">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-4 bg-gray-600" />
          <button onClick={bulkDelete} className="text-sm text-red-300 hover:text-red-100">Delete selected</button>
          <div className="w-px h-4 bg-gray-600" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Move to:</span>
            <select
              value={moveTo}
              onChange={e => setMoveTo(e.target.value)}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 focus:outline-none"
            >
              <option value="">Choose role...</option>
              {workExps.map(e => <option key={e.id} value={e.id}>{e.company}</option>)}
            </select>
            {moveTo && <button onClick={bulkMove} className="text-sm text-blue-300 hover:text-blue-100">Move</button>}
          </div>
        </div>
      )}
    </div>
  )
}
