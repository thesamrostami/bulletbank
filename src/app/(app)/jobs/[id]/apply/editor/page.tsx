'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BulletGroupSkeleton, CVPreviewSkeleton } from '@/components/Skeleton'
import { CV_TEMPLATES, type TemplateName } from '@/lib/cv-templates'
import TemplateSelector from '@/components/cv/TemplateSelector'
import type {
  Job, BulletBank, WorkExperience, Education, Certification, Profile, BulletMatch, CVSnapshot, CategorisedGap, CVVariant, CVRewriteResponse,
} from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = 'bullets' | 'preview' | 'cover'
type CoverMode = 'generate' | 'skip'

interface ProfileData {
  profile: Profile | null
  workExperiences: WorkExperience[]
  education: Education[]
  certifications: Certification[]
}

interface GapSuggestion {
  text: string
  skill_tags: string[]
  has_metric: boolean
  metric_text: string | null
  confidence: 'high' | 'medium' | 'low'
  note: string
}

interface RoleGroup {
  workExpId: string | null
  company: string
  title: string
  bullets: BulletBank[]
}

interface BulletSelectItemProps {
  bullet: BulletBank
  match: BulletMatch | undefined
  checked: boolean
  onToggle: (id: string) => void
  isEditing: boolean
  editingText: string
  setEditingText: (text: string) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onRewrite: () => void
  isRewriting: boolean
}

interface RoleGroupSectionProps {
  group: RoleGroup
  rankedScores: Map<string, BulletMatch>
  selectedBulletIds: Set<string>
  onToggle: (id: string) => void
  onEditBullet: (id: string, text: string) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onRewriteWithAI: (id: string, text: string) => void
  onAddBullet: (workExpId: string | null, company: string) => void
  editingBulletId: string | null
  editingText: string
  setEditingText: (text: string) => void
  rewritingBulletId: string | null
}

interface HighlightGroupSectionProps {
  bullets: BulletBank[]
  rankedScores: Map<string, BulletMatch>
  selectedBulletIds: Set<string>
  onToggle: (id: string) => void
  onEditBullet: (id: string, text: string) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onRewriteWithAI: (id: string, text: string) => void
  editingBulletId: string | null
  editingText: string
  setEditingText: (text: string) => void
  rewritingBulletId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelevantSkills(
  skills: string[],
  requirements: string[],
): Array<{ skill: string; matched: boolean }> {
  const reqText = requirements.join(' ').toLowerCase()
  return skills.map(skill => ({
    skill,
    matched:
      reqText.includes(skill.toLowerCase()) ||
      skill
        .toLowerCase()
        .split(/\s+/)
        .some(word => word.length > 3 && reqText.includes(word)),
  }))
}

// ─── CV Preview ───────────────────────────────────────────────────────────────

function PreviewSection({
  children,
  onClick,
  interactive,
}: {
  children: React.ReactNode
  onClick?: () => void
  interactive?: boolean
}) {
  if (!interactive) return <>{children}</>
  return (
    <div
      className="relative group cursor-pointer rounded-lg -mx-2 px-2 py-1 hover:bg-blue-50/50 transition-colors"
      onClick={onClick}
    >
      <span className="absolute right-0 top-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Edit ✎
      </span>
      {children}
    </div>
  )
}

const TECH_KW = ['engineer','developer','software','frontend','backend','devops','data','ml','cloud','mobile','security','architect','programmer','technical','systems','web']
function isTechRoleCheck(role?: string | null, raw?: string | null): boolean {
  if (!role && !raw) return true
  const t = `${role ?? ''} ${raw ?? ''}`.toLowerCase()
  return TECH_KW.some(k => t.includes(k))
}

function CVPreview({
  cvSnapshot,
  jobRequirements = [],
  onSectionClick,
  interactive,
  job,
}: {
  cvSnapshot: CVSnapshot | null
  jobRequirements?: string[]
  onSectionClick?: (section: string, data: unknown) => void
  interactive?: boolean
  job?: Job | null
}) {
  if (!cvSnapshot) return <div className="text-sm text-gray-400 p-4">Loading profile…</div>

  const { profile, workExperiences, education, certifications } = cvSnapshot

  const websiteUrl = profile.portfolio_url || profile.website_url || null
  const additionalUrls = (profile.additional_links || [])
    .filter(link => {
      if (!link.url) return false
      if (link.label.toLowerCase().includes('github')) return isTechRoleCheck(job?.role, job?.raw_text)
      return true
    })
    .map(link => link.url)
  const contactParts = [
    profile.email,
    profile.phone,
    profile.location_city && profile.location_country
      ? `${profile.location_city}, ${profile.location_country}`
      : profile.location_city || profile.location_country,
    profile.linkedin_url,
    websiteUrl,
    ...additionalUrls,
  ].filter(Boolean)

  const visibleWorkExperiences = workExperiences.filter((we) => we.bullets.length > 0)

  const handleBulletClick = (b: BulletBank) => {
    if (interactive && onSectionClick) {
      onSectionClick('bullet', { id: b.id, text: b.text })
    }
  }

  // Skills: use skills_line if present (new format), otherwise fall back to core + proficient
  const skillsLine = cvSnapshot.skills_line?.length
    ? cvSnapshot.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 12)

  const summaryBullet = cvSnapshot.summaryBullets?.[0]
  const highlightBullets = cvSnapshot.highlightBullets || []

  function bulletMatchesJD(bulletText: string, requirements: string[]): boolean {
    const reqText = requirements.join(' ').toLowerCase()
    const words = bulletText.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const matchCount = words.filter(w => reqText.includes(w)).length
    return matchCount >= 2
  }

  return (
    <div>
    {jobRequirements.length > 0 && (
      <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
          Matches JD keyword
        </span>
      </div>
    )}
    <div className="text-xs leading-relaxed text-gray-900 font-serif space-y-3">
      <div>
        <h1 className="text-lg font-bold">{profile.full_name || ''}</h1>
        <p className="text-gray-600">{contactParts.join(' | ')}</p>
        {profile.positioning_headline && (
          <p className="font-semibold text-gray-800 mt-0.5">{profile.positioning_headline}</p>
        )}
      </div>
      <hr className="border-gray-300" />
      {summaryBullet && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Summary
          </p>
          <p className="text-gray-700 leading-relaxed">{summaryBullet.text}</p>
        </div>
      )}
      {skillsLine.length > 0 && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Skills
          </p>
          <p className="text-gray-700">{skillsLine.join(' · ')}</p>
        </div>
      )}
      {highlightBullets.length > 0 && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Key Highlights
          </p>
          <ul className="space-y-0.5">
            {highlightBullets.map(b => {
              const matched = bulletMatchesJD(b.text, jobRequirements)
              return (
                <li
                  key={b.id}
                  className={`flex gap-1.5 items-start ${interactive ? 'cursor-pointer rounded hover:bg-blue-50/50 -mx-1 px-1' : ''}`}
                  onClick={() => handleBulletClick(b)}
                >
                  {matched
                    ? <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1" />
                    : <span className="shrink-0">•</span>}
                  <span>{b.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {visibleWorkExperiences.length > 0 && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Experience
          </p>
          {visibleWorkExperiences.map((we) => (
            <div key={we.id} className="mb-2">
              <div className="flex justify-between">
                <span className="font-bold">{we.title || ''} — {we.company || ''}</span>
                <span className="text-gray-500 text-right shrink-0 ml-2">
                  {we.start_date?.slice(0, 7) || ''} – {we.is_current ? 'Present' : (we.end_date?.slice(0, 7) || '')}
                </span>
              </div>
              {we.bullets.length > 0 && (
                <ul className="mt-0.5 space-y-0.5">
                  {we.bullets.map((b) => {
                    const matched = bulletMatchesJD(b.text, jobRequirements)
                    return (
                      <li
                        key={b.id}
                        className={`flex gap-1.5 items-start ${interactive ? 'cursor-pointer rounded hover:bg-blue-50/50 -mx-1 px-1' : ''}`}
                        onClick={() => handleBulletClick(b)}
                      >
                        {matched
                          ? <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1" />
                          : <span className="shrink-0">•</span>}
                        <span>{b.text}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {education.length > 0 && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Education
          </p>
          {education.map((e) => (
            <div key={e.id} className="flex justify-between mb-1">
              <div>
                <span className="font-semibold">{e.institution}</span>
                {e.degree && e.field_of_study && (
                  <span className="text-gray-600">
                    {' '}— {e.degree} in {e.field_of_study}
                  </span>
                )}
                {e.grade && <span className="text-gray-500"> ({e.grade})</span>}
              </div>
              <span className="text-gray-500 text-right shrink-0 ml-2">
                {e.start_date?.slice(0, 7) || ''} – {e.is_current ? 'Present' : (e.end_date?.slice(0, 7) || '')}
              </span>
            </div>
          ))}
        </div>
      )}
      {certifications.length > 0 && (
        <div>
          <p className="font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-0.5 mb-1.5">
            Certifications
          </p>
          <p className="text-gray-700">{certifications.map(c => c.name).filter(Boolean).join(' · ')}</p>
        </div>
      )}
    </div>
    </div>
  )
}

// ─── Bullet select item ───────────────────────────────────────────────────────

function BulletSelectItem({
  bullet, match, checked, onToggle,
  isEditing, editingText, setEditingText,
  onEdit, onSave, onCancel, onRewrite, isRewriting,
}: BulletSelectItemProps) {
  const score = match?.score
  const recommended = match?.recommend === true

  return (
    <div className={`group px-4 py-3 transition-colors ${checked ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(bullet.id)}
          className="mt-0.5 shrink-0 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-xs font-mono text-gray-400">{bullet.bullet_id}</span>
            {recommended && (
              <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
                ✓ Recommended
              </span>
            )}
            {score !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                score >= 80
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : score >= 60
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {score}%
              </span>
            )}
            {bullet.has_metric && bullet.metric_text && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                {bullet.metric_text}
              </span>
            )}
          </div>

          {isEditing ? (
            <div>
              <textarea
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                rows={3}
                autoFocus
                className="w-full text-xs text-gray-800 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none leading-relaxed"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={onSave}
                  className="text-xs px-3 py-1.5 bg-[var(--navy)] text-white rounded-lg hover:bg-[var(--navy-light)] transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700 leading-relaxed">{bullet.text}</p>
          )}

          {bullet.skill_tags.length > 0 && !isEditing && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {bullet.skill_tags.map((t, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="text-xs text-gray-400 hover:text-gray-700 underline"
              >
                Edit
              </button>
              <button
                onClick={onRewrite}
                disabled={isRewriting}
                className="text-xs text-blue-500 hover:text-blue-700 underline disabled:opacity-50"
              >
                {isRewriting ? 'Rewriting…' : 'Rewrite for this role →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Role group section ───────────────────────────────────────────────────────

function RoleGroupSection({
  group, rankedScores, selectedBulletIds, onToggle,
  onEditBullet, onSaveEdit, onCancelEdit, onRewriteWithAI,
  onAddBullet, editingBulletId, editingText, setEditingText, rewritingBulletId,
}: RoleGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    if (editingBulletId && group.bullets.some(b => b.id === editingBulletId)) {
      setCollapsed(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBulletId])

  const selectedInGroup = group.bullets.filter(b => selectedBulletIds.has(b.id)).length

  const selected = group.bullets.filter(b => selectedBulletIds.has(b.id))
  const isRanked = rankedScores.size > 0
  const unselectedRelevant = isRanked
    ? group.bullets.filter(b => {
        if (selectedBulletIds.has(b.id)) return false
        const m = rankedScores.get(b.id)
        return m?.recommend || (m?.score ?? 0) >= 55
      })
    : group.bullets.filter(b => !selectedBulletIds.has(b.id))
  const unselectedOther = isRanked
    ? group.bullets.filter(b => {
        if (selectedBulletIds.has(b.id)) return false
        const m = rankedScores.get(b.id)
        return !m?.recommend && (m?.score ?? 0) < 55
      })
    : []

  const moreCount = unselectedRelevant.length + unselectedOther.length
  const visibleUnselected = showMore ? [...unselectedRelevant, ...unselectedOther] : []

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-800">{group.company}</p>
          <p className="text-xs text-gray-500">{group.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedInGroup > 0 && (
            <span className="text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded-full">
              {selectedInGroup} selected
            </span>
          )}
          <span className="text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {selected.length === 0 && !showMore && (
            <p className="px-4 py-3 text-xs text-gray-400 italic">No bullets selected for this role.</p>
          )}
          {selected.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={true} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {visibleUnselected.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={false} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {moreCount > 0 && (
            <button
              onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showMore ? '▲ Show selected only' : `▼ Show ${moreCount} more bullet${moreCount > 1 ? 's' : ''}`}
            </button>
          )}
          <button
            onClick={() => onAddBullet(group.workExpId, group.company)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>Write a bullet for {group.company}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Highlight group section ──────────────────────────────────────────────────

function HighlightGroupSection({
  bullets, rankedScores, selectedBulletIds, onToggle,
  onEditBullet, onSaveEdit, onCancelEdit, onRewriteWithAI,
  editingBulletId, editingText, setEditingText, rewritingBulletId,
}: HighlightGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    if (editingBulletId && bullets.some(b => b.id === editingBulletId)) {
      setCollapsed(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBulletId])

  const selectedInGroup = bullets.filter(b => selectedBulletIds.has(b.id)).length

  const selected = bullets.filter(b => selectedBulletIds.has(b.id))
  const isRanked = rankedScores.size > 0
  const unselectedRelevant = isRanked
    ? bullets.filter(b => {
        if (selectedBulletIds.has(b.id)) return false
        const m = rankedScores.get(b.id)
        return m?.recommend || (m?.score ?? 0) >= 55
      })
    : bullets.filter(b => !selectedBulletIds.has(b.id))
  const unselectedOther = isRanked
    ? bullets.filter(b => {
        if (selectedBulletIds.has(b.id)) return false
        const m = rankedScores.get(b.id)
        return !m?.recommend && (m?.score ?? 0) < 55
      })
    : []

  const moreCount = unselectedRelevant.length + unselectedOther.length
  const visibleUnselected = showMore ? [...unselectedRelevant, ...unselectedOther] : []

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-800">Key Highlights</p>
          <p className="text-xs text-gray-500">Cross-role achievements</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedInGroup > 0 && (
            <span className="text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded-full">
              {selectedInGroup} selected
            </span>
          )}
          <span className="text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {selected.length === 0 && !showMore && (
            <p className="px-4 py-3 text-xs text-gray-400 italic">No highlights selected.</p>
          )}
          {selected.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={true} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {visibleUnselected.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={false} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {moreCount > 0 && (
            <button
              onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showMore ? '▲ Show selected only' : `▼ Show ${moreCount} more bullet${moreCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Summary section (collapsible, selected-first) ───────────────────────────

function SummarySection({
  bullets, selectedId, onSelect,
}: { bullets: BulletBank[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [collapsed, setCollapsed] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const selected = bullets.find(b => b.id === selectedId)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-800">Professional Summary</p>
          <p className="text-xs text-gray-500">Choose a summary statement</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected && <span className="text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded-full">1 selected</span>}
          <span className="text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>
      {!collapsed && (
        <div className="p-4 pt-2 space-y-2">
          {(showAll ? bullets : selected ? [selected] : bullets.slice(0, 1)).map(b => {
            const isSelected = b.id === selectedId
            return (
              <div
                key={b.id}
                onClick={() => onSelect(isSelected ? null : b.id)}
                className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? 'border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {isSelected && <span className="absolute top-2 right-2 text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded">Selected</span>}
                <p className="text-xs text-gray-700 leading-relaxed pr-14">{b.text}</p>
              </div>
            )
          })}
          {!showAll && bullets.length > 1 && (
            <button onClick={() => setShowAll(true)} className="text-xs text-gray-400 hover:text-gray-600 underline px-1">
              Show {bullets.length - (selected ? 1 : 1)} more variant{bullets.length > 2 ? 's' : ''}
            </button>
          )}
          {showAll && bullets.length > 1 && (
            <button onClick={() => setShowAll(false)} className="text-xs text-gray-400 hover:text-gray-600 underline px-1">
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skills section (relevant-only, add more) ─────────────────────────────────

function SkillsSection({
  allSkills, requirements, deselectedSkills, onToggle,
}: { allSkills: string[]; requirements: string[]; deselectedSkills: Set<string>; onToggle: (s: string) => void }) {
  const [collapsed, setCollapsed] = useState(true)
  const [showMore, setShowMore] = useState(false)

  const reqText = requirements.join(' ').toLowerCase()
  const isMatch = (s: string) =>
    reqText.includes(s.toLowerCase()) ||
    s.toLowerCase().split(/\s+/).some(w => w.length > 3 && reqText.includes(w))

  const matched = allSkills.filter(isMatch)
  const others = allSkills.filter(s => !isMatch(s))
  const activeCount = matched.filter(s => !deselectedSkills.has(s)).length + others.filter(s => !deselectedSkills.has(s) && showMore).length

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <p className="text-xs font-semibold text-gray-800">Skills</p>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded-full">{activeCount} selected</span>
          <span className="text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>
      {!collapsed && (
        <div className="p-3">
          {matched.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-2">Relevant to this role — click to remove</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {matched.map(s => (
                  <button
                    key={s}
                    onClick={() => onToggle(s)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      deselectedSkills.has(s)
                        ? 'bg-gray-100 text-gray-300 border-gray-200 line-through'
                        : 'bg-green-50 text-green-700 border-green-200 hover:border-green-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              <button
                onClick={() => setShowMore(v => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 underline mb-2 block"
              >
                {showMore ? '▲ Hide other skills' : `▼ Add more skills (${others.length})`}
              </button>
              {showMore && (
                <div className="flex flex-wrap gap-1.5">
                  {others.map(s => (
                    <button
                      key={s}
                      onClick={() => onToggle(s)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        deselectedSkills.has(s)
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {deselectedSkills.has(s) ? `+ ${s}` : s}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Project group section ────────────────────────────────────────────────────

function ProjectGroupSection({
  bullets, rankedScores, selectedBulletIds, onToggle,
  onEditBullet, onSaveEdit, onCancelEdit, onRewriteWithAI,
  editingBulletId, editingText, setEditingText, rewritingBulletId,
}: Omit<HighlightGroupSectionProps, never>) {
  const [collapsed, setCollapsed] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (editingBulletId && bullets.some(b => b.id === editingBulletId)) {
      setCollapsed(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBulletId])

  const selectedInGroup = bullets.filter(b => selectedBulletIds.has(b.id)).length

  const isRanked = rankedScores.size > 0
  const relevantBullets = isRanked
    ? bullets.filter(b => {
        const m = rankedScores.get(b.id)
        return m?.recommend || (m?.score ?? 0) >= 55 || selectedBulletIds.has(b.id)
      })
    : bullets
  const hiddenBullets = isRanked
    ? bullets.filter(b => {
        const m = rankedScores.get(b.id)
        return !m?.recommend && (m?.score ?? 0) < 55 && !selectedBulletIds.has(b.id)
      })
    : []
  const selected = bullets.filter(b => selectedBulletIds.has(b.id))
  const unselectedVisible = showAll ? relevantBullets.filter(b => !selectedBulletIds.has(b.id)) : []

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-800">Projects</p>
          <p className="text-xs text-gray-500">Project achievements</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedInGroup > 0 && (
            <span className="text-xs bg-[var(--navy)] text-white px-1.5 py-0.5 rounded-full">
              {selectedInGroup} selected
            </span>
          )}
          <span className="text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {selected.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={true} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {unselectedVisible.map(b => (
            <BulletSelectItem
              key={b.id} bullet={b} match={rankedScores.get(b.id)} checked={false} onToggle={onToggle}
              isEditing={editingBulletId === b.id} editingText={editingText} setEditingText={setEditingText}
              onEdit={() => onEditBullet(b.id, b.text)} onSave={() => onSaveEdit(b.id)} onCancel={onCancelEdit}
              onRewrite={() => onRewriteWithAI(b.id, b.text)} isRewriting={rewritingBulletId === b.id}
            />
          ))}
          {(relevantBullets.length - selected.length > 0 || hiddenBullets.length > 0) && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showAll ? '▲ Show selected only' : `▼ Show more project bullets`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Verification gate ────────────────────────────────────────────────────────

function VerificationGate({
  bullets,
  onComplete,
  onCancel,
}: {
  bullets: BulletBank[]
  onComplete: () => void
  onCancel: () => void
}) {
  const metricsToVerify = bullets.filter(b => b.has_metric && b.metric_text)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (metricsToVerify.length === 0) {
      onComplete()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; onComplete is a stable callback; adding metricsToVerify would fire on every metric state change
  }, [])

  if (metricsToVerify.length === 0) return null

  const current = metricsToVerify[idx]
  const isLast = idx === metricsToVerify.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Verify claim {idx + 1} of {metricsToVerify.length}
          </p>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Can you defend this in an interview?
        </h3>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-gray-800 leading-relaxed">{current.text}</p>
          <p className="text-xs text-amber-700 mt-2 font-medium border-t border-amber-200 pt-2">
            Metric: {current.metric_text}
          </p>
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Be ready to explain how it was measured, your direct contribution, and any context.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => {
              if (isLast) onComplete()
              else setIdx(i => i + 1)
            }}
            className="flex-1 py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
          >
            {isLast ? 'All verified — Download →' : 'Yes, I can defend this →'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Edit a claim
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CV Variant bar ───────────────────────────────────────────────────────────

interface CVVariantBarProps {
  variants: CVVariant[]
  onLoad: (variantId: string) => void
  onSave: (name: string) => Promise<void>
  currentName: string
  setCurrentName: (name: string) => void
}

function CVVariantBar({ variants, onLoad, onSave, currentName, setCurrentName }: CVVariantBarProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
      {variants.length > 0 && (
        <select
          onChange={e => { if (e.target.value) onLoad(e.target.value); e.target.value = '' }}
          defaultValue=""
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none max-w-[140px]"
        >
          <option value="">Load a variant…</option>
          {variants.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-1.5 ml-auto">
        <input
          type="text"
          value={currentName}
          onChange={e => setCurrentName(e.target.value)}
          placeholder="Name this selection…"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          maxLength={50}
        />
        <button
          onClick={async () => {
            if (!currentName.trim()) return
            setSaving(true)
            await onSave(currentName.trim())
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            setSaving(false)
          }}
          disabled={saving || !currentName.trim()}
          className="text-xs px-3 py-1.5 bg-[var(--navy)] text-white rounded-lg disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors whitespace-nowrap"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save variant'}
        </button>
      </div>
    </div>
  )
}

// ─── Gap section ─────────────────────────────────────────────────────────────

function GapSection({
  skillGaps, gapCoverage, gapSuggestions, generatingGapFor, profileLoaded, workExperiences,
  onGenerate, onAddToCV, onSaveAndAdd,
}: {
  skillGaps: CategorisedGap[]
  gapCoverage: Map<string, boolean>
  gapSuggestions: Map<string, GapSuggestion[]>
  generatingGapFor: string | null
  profileLoaded: boolean
  workExperiences: WorkExperience[]
  onGenerate: (gap: CategorisedGap, userNote: string) => void
  onAddToCV: (s: GapSuggestion, req: string, workExpId: string | null) => void
  onSaveAndAdd: (s: GapSuggestion, req: string, workExpId: string | null) => void
}) {
  if (skillGaps.length === 0) return null
  return (
    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
      <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">
        Gaps to address in your CV
      </p>
      <p className="text-xs text-amber-700 mb-3">
        These skills were in the job requirements but not found in your profile.
        Select relevant bullets or generate a targeted bullet for each gap.
      </p>
      {skillGaps.map((gap, i) => (
        <GapCard
          key={i}
          gap={gap}
          covered={gapCoverage.get(gap.requirement)}
          suggestions={gapSuggestions.get(gap.requirement)}
          isGenerating={generatingGapFor === gap.requirement}
          profileLoaded={profileLoaded}
          workExperiences={workExperiences}
          onGenerate={onGenerate}
          onAddToCV={onAddToCV}
          onSaveAndAdd={onSaveAndAdd}
        />
      ))}
    </div>
  )
}

// ─── Gap card ─────────────────────────────────────────────────────────────────

function GapCard({
  gap, covered, suggestions, isGenerating, profileLoaded, workExperiences, onGenerate, onAddToCV, onSaveAndAdd,
}: {
  gap: CategorisedGap
  covered: boolean | undefined
  suggestions: GapSuggestion[] | undefined
  isGenerating: boolean
  profileLoaded: boolean
  workExperiences: WorkExperience[]
  onGenerate: (gap: CategorisedGap, userNote: string) => void
  onAddToCV: (s: GapSuggestion, req: string, workExpId: string | null) => void
  onSaveAndAdd: (s: GapSuggestion, req: string, workExpId: string | null) => void
}) {
  const [userNote, setUserNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [selectedWorkExpId, setSelectedWorkExpId] = useState<string>('__highlight__')

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 text-xs font-bold ${covered ? 'text-green-500' : 'text-amber-500'}`}>
          {covered ? '✓' : '▲'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-amber-800">{gap.requirement}</p>
            <div className="flex items-center gap-2 shrink-0">
              {covered
                ? <span className="text-xs text-green-600 font-medium">Covered</span>
                : <span className="text-xs text-gray-400">Not covered</span>
              }
              {!suggestions && (
                <button
                  onClick={() => setShowNote(v => !v)}
                  disabled={isGenerating || !profileLoaded}
                  className="text-xs text-amber-700 hover:text-amber-900 underline disabled:opacity-40"
                >
                  {isGenerating ? 'Generating…' : 'Generate bullet →'}
                </button>
              )}
            </div>
          </div>

          {!suggestions && showNote && (
            <div className="mt-2">
              <p className="text-xs text-amber-700 mb-1">Do you have any experience with this? (optional — helps generate a better bullet)</p>
              <textarea
                value={userNote}
                onChange={e => setUserNote(e.target.value)}
                rows={2}
                placeholder="e.g. I used Terraform for 6 months at my last role to manage AWS infrastructure…"
                className="w-full text-xs text-gray-700 border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none bg-white"
              />
              <button
                onClick={() => { setShowNote(false); onGenerate(gap, userNote) }}
                disabled={isGenerating || !profileLoaded}
                className="mt-1.5 text-xs px-3 py-1.5 bg-amber-700 text-white rounded hover:bg-amber-800 disabled:opacity-40 transition-colors"
              >
                {isGenerating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          )}

          {suggestions && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-amber-800 font-medium">Add under:</label>
                <select
                  value={selectedWorkExpId}
                  onChange={e => setSelectedWorkExpId(e.target.value)}
                  className="text-xs border border-amber-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {workExperiences.map(we => (
                    <option key={we.id} value={we.id}>{we.title} @ {we.company}</option>
                  ))}
                  <option value="__highlight__">Key Achievements</option>
                </select>
              </div>
              {suggestions.map((s, si) => (
                <div key={si} className={`p-2.5 rounded-lg border ${
                  s.confidence === 'high' ? 'bg-green-50 border-green-200' :
                  s.confidence === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mb-1.5 ${
                    s.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    s.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {s.confidence === 'high' ? 'Strong match' : s.confidence === 'medium' ? 'Transferable' : 'Stretch'}
                  </span>
                  <p className="text-xs text-gray-800 mb-1 leading-snug">{s.text}</p>
                  <p className="text-xs text-gray-500 italic mb-2">{s.note}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddToCV(s, gap.requirement, selectedWorkExpId === '__highlight__' ? null : selectedWorkExpId)}
                      className="text-xs px-2 py-1 bg-[var(--navy)] text-white rounded hover:bg-[var(--navy-light)] transition-colors"
                    >
                      Add to this CV
                    </button>
                    <button
                      onClick={() => onSaveAndAdd(s, gap.requirement, selectedWorkExpId === '__highlight__' ? null : selectedWorkExpId)}
                      className="text-xs px-2 py-1 border border-gray-200 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Save to bank + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AI Rewrite Review ────────────────────────────────────────────────────────

function BulletDiffRow({
  bulletId,
  originalText,
  rewrittenText,
  isAiNew,
  useOriginal,
  removed,
  isSaved,
  onToggleOriginal,
  onToggleRemove,
  onSaveToBank,
}: {
  bulletId: string
  originalText: string | null
  rewrittenText: string
  isAiNew: boolean
  useOriginal: boolean
  removed: boolean
  isSaved?: boolean
  onToggleOriginal: () => void
  onToggleRemove: () => void
  onSaveToBank: () => Promise<boolean>
}) {
  const [savingToBank, setSavingToBank] = useState(false)
  const [savedToBank, setSavedToBank] = useState(false)

  const handleSave = async () => {
    setSavingToBank(true)
    const ok = await onSaveToBank()
    setSavingToBank(false)
    if (ok) setSavedToBank(true)
  }

  // The text that will actually appear on the CV
  const effectiveText = (useOriginal && originalText) ? originalText : rewrittenText

  return (
    <div className={`p-3 rounded-lg border transition-all ${removed ? 'opacity-40 border-gray-200' : isAiNew ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      {isAiNew && (
        <span className="inline-block text-xs font-medium text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded mb-2">✨ New — AI suggested</span>
      )}
      {originalText && !isAiNew && (
        <p className={`text-xs mb-1 ${useOriginal ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
          {originalText}
        </p>
      )}
      <p className={`text-xs font-medium ${(useOriginal && !isAiNew) ? 'text-gray-400 line-through' : removed ? 'text-gray-400' : 'text-gray-800'}`}>
        {rewrittenText}
      </p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {isAiNew ? (
          <button
            onClick={onToggleRemove}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${removed ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
          >
            {removed ? 'Add back' : 'Remove'}
          </button>
        ) : (
          <>
            <button
              onClick={() => { if (useOriginal) onToggleOriginal() }}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${!useOriginal ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              Use rewritten
            </button>
            <button
              onClick={() => { if (!useOriginal) onToggleOriginal() }}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${useOriginal ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              Keep original
            </button>
          </>
        )}
        {!removed && !useOriginal && (
          <button
            onClick={handleSave}
            disabled={savingToBank || savedToBank || isSaved}
            className={`ml-auto text-xs underline hover:no-underline disabled:no-underline disabled:cursor-default whitespace-nowrap ${savedToBank || isSaved ? 'text-green-600' : 'text-[var(--accent)]'}`}
            title={`Save "${rewrittenText.slice(0, 40)}…" to bullet bank`}
          >
            {savedToBank || isSaved ? 'Saved ✓' : savingToBank ? 'Saving…' : 'Save to bank'}
          </button>
        )}
      </div>
    </div>
  )
}

function AIRewriteReview({
  rewriteResult,
  allBullets,
  useOriginalForIds,
  removedAiIds,
  sessionAddedSkills,
  savedToBankIds,
  onToggleOriginal,
  onToggleRemove,
  onToggleAddSkill,
  onSaveToBank,
  onConfirm,
  onReset,
  onRefine,
  isRefining,
}: {
  rewriteResult: CVRewriteResponse
  allBullets: BulletBank[]
  useOriginalForIds: Set<string>
  removedAiIds: Set<string>
  sessionAddedSkills: Set<string>
  savedToBankIds: Set<string>
  onToggleOriginal: (id: string) => void
  onToggleRemove: (id: string) => void
  onToggleAddSkill: (skill: string) => void
  onSaveToBank: (bullet: { bullet_id: string; text: string; type: string; skill_tags: string[]; has_metric: boolean; metric_text: string | null }, effectiveText: string, workExpId?: string, roleContext?: string) => Promise<boolean>
  onConfirm: () => void
  onReset: () => void
  onRefine: (prompt: string) => Promise<void>
  isRefining: boolean
}) {
  const [refinementInput, setRefinementInput] = useState('')
  const { rewrittenCV, changes_summary } = rewriteResult

  const findOriginal = (bullet_id: string) =>
    allBullets.find(b => b.bullet_id === bullet_id)

  const makeSaveFn = (
    b: { bullet_id: string; text: string; type: string; skill_tags?: string[]; has_metric?: boolean; metric_text?: string | null },
    workExpId?: string,
    roleContext?: string
  ) => {
    const orig = findOriginal(b.bullet_id)
    const effectiveText = (useOriginalForIds.has(b.bullet_id) && orig) ? orig.text : b.text
    return () => onSaveToBank(
      { bullet_id: b.bullet_id, text: b.text, type: b.type, skill_tags: b.skill_tags || [], has_metric: b.has_metric || false, metric_text: b.metric_text || null },
      effectiveText,
      workExpId,
      roleContext
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Changes summary */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-indigo-700 mb-1.5 uppercase tracking-wide">What the AI changed</p>
        <p className="text-xs text-indigo-800 leading-relaxed">{changes_summary}</p>
      </div>

      {/* Summary bullet */}
      {(rewrittenCV.summaryBullets?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Professional summary</p>
          {rewrittenCV.summaryBullets!.map(b => {
            const orig = findOriginal(b.bullet_id)
            return (
              <BulletDiffRow
                key={b.bullet_id}
                bulletId={b.bullet_id}
                originalText={orig?.text ?? null}
                rewrittenText={b.text}
                isAiNew={b.bullet_id.startsWith('ai-')}
                useOriginal={useOriginalForIds.has(b.bullet_id)}
                removed={removedAiIds.has(b.bullet_id)}
                isSaved={savedToBankIds.has(b.bullet_id)}
                onToggleOriginal={() => onToggleOriginal(b.bullet_id)}
                onToggleRemove={() => onToggleRemove(b.bullet_id)}
                onSaveToBank={makeSaveFn(b)}
              />
            )
          })}
        </div>
      )}

      {/* Highlights */}
      {(rewrittenCV.highlightBullets?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key highlights</p>
          <div className="space-y-2">
            {rewrittenCV.highlightBullets!.map(b => {
              const orig = findOriginal(b.bullet_id)
              return (
                <BulletDiffRow
                  key={b.bullet_id}
                  bulletId={b.bullet_id}
                  originalText={orig?.text ?? null}
                  rewrittenText={b.text}
                  isAiNew={b.bullet_id.startsWith('ai-')}
                  useOriginal={useOriginalForIds.has(b.bullet_id)}
                  removed={removedAiIds.has(b.bullet_id)}
                  isSaved={savedToBankIds.has(b.bullet_id)}
                  onToggleOriginal={() => onToggleOriginal(b.bullet_id)}
                  onToggleRemove={() => onToggleRemove(b.bullet_id)}
                  onSaveToBank={makeSaveFn(b)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Work experiences */}
      {rewrittenCV.workExperiences.map(we => (
        <div key={we.id}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{we.company}</p>
          <p className="text-xs text-gray-400 mb-2">{we.title}</p>
          <div className="space-y-2">
            {we.bullets.map(b => {
              const orig = findOriginal(b.bullet_id)
              return (
                <BulletDiffRow
                  key={b.bullet_id}
                  bulletId={b.bullet_id}
                  originalText={orig?.text ?? null}
                  rewrittenText={b.text}
                  isAiNew={b.bullet_id.startsWith('ai-')}
                  useOriginal={useOriginalForIds.has(b.bullet_id)}
                  removed={removedAiIds.has(b.bullet_id)}
                  isSaved={savedToBankIds.has(b.bullet_id)}
                  onToggleOriginal={() => onToggleOriginal(b.bullet_id)}
                  onToggleRemove={() => onToggleRemove(b.bullet_id)}
                  onSaveToBank={makeSaveFn(b, we.id, we.company)}
                />
              )
            })}
          </div>
        </div>
      ))}

      {/* Skills — interactive (new format: skills_line; old format: skills.reordered_*) */}
      {(rewrittenCV.skills_line?.length || rewrittenCV.skills) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">Skills for this CV</p>
          {(rewrittenCV.skills?.suggested_additions?.length ?? 0) > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                These appear in the JD and your background suggests you have them.
                Click to add to this CV:
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {rewrittenCV.skills!.suggested_additions.map(s => {
                  const added = sessionAddedSkills.has(s)
                  return (
                    <button
                      key={s}
                      onClick={() => onToggleAddSkill(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        added
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white border-blue-200 text-blue-700 hover:border-blue-400'
                      }`}
                    >
                      {added ? '✓ ' : '+ '}{s}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {(rewrittenCV.skills_line?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Suggested skills for this role (JD-matching first):</p>
              <div className="flex flex-wrap gap-1">
                {rewrittenCV.skills_line!.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          {!rewrittenCV.skills_line?.length && (rewrittenCV.skills?.reordered_core?.length || rewrittenCV.skills?.reordered_proficient?.length) && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Suggested skill order for this role (JD-matching skills first):</p>
              <div className="flex flex-wrap gap-1">
                {[...(rewrittenCV.skills?.reordered_core || []), ...(rewrittenCV.skills?.reordered_proficient || [])].map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyword alignment */}
      {rewrittenCV.keyword_alignment && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Keyword alignment</p>
          {rewrittenCV.keyword_alignment.matched_keywords.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-1.5">Covered</p>
              <div className="flex flex-wrap gap-1">
                {rewrittenCV.keyword_alignment.matched_keywords.map(k => (
                  <span key={k} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{k}</span>
                ))}
              </div>
            </div>
          )}
          {rewrittenCV.keyword_alignment.missing_keywords.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-1.5">Not yet covered</p>
              <div className="flex flex-wrap gap-1">
                {rewrittenCV.keyword_alignment.missing_keywords.map(k => (
                  <span key={k} title="Consider adding if you have this experience" className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full cursor-help">{k}</span>
                ))}
              </div>
            </div>
          )}
          {rewrittenCV.keyword_alignment.keyword_density_note && (
            <p className="text-xs text-gray-500 italic">{rewrittenCV.keyword_alignment.keyword_density_note}</p>
          )}
        </div>
      )}

      {/* Refinement panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Refine this CV — 1 credit</p>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
          rows={2}
          placeholder="e.g. Emphasise my leadership experience more, or make the summary punchier"
          maxLength={500}
          value={refinementInput}
          onChange={e => setRefinementInput(e.target.value)}
          disabled={isRefining}
        />
        <button
          onClick={async () => {
            if (!refinementInput.trim() || isRefining) return
            await onRefine(refinementInput.trim())
            setRefinementInput('')
          }}
          disabled={!refinementInput.trim() || isRefining}
          className="w-full py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isRefining ? 'Refining…' : 'Refine →'}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          Apply rewrite and continue →
        </button>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 underline text-center"
        >
          Discard and return to manual selection
        </button>
      </div>
    </div>
  )
}

// ─── Load stage ───────────────────────────────────────────────────────────────

type LoadStage = 'idle' | 'profile' | 'bullets' | 'ranking' | 'tailoring' | 'ready'

const STAGE_LABELS: Record<LoadStage, string> = {
  idle: '',
  profile: 'Loading your profile…',
  bullets: 'Loading your bullet bank…',
  ranking: 'Scoring bullets against this role…',
  tailoring: 'Tailoring to this role…',
  ready: '',
}

// ─── Main apply page ──────────────────────────────────────────────────────────

export default function CVEditorPage() {
  const { id } = useParams<{ id: string }>()

  const [section, setSection] = useState<Section>('bullets')
  const [coverMode, setCoverMode] = useState<CoverMode>('generate')

  const [job, setJob] = useState<Job | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    profile: null, workExperiences: [], education: [], certifications: [],
  })
  const [allBullets, setAllBullets] = useState<BulletBank[]>([])
  const [rankedScores, setRankedScores] = useState<Map<string, BulletMatch>>(new Map())
  const [selectedBulletIds, setSelectedBulletIds] = useState<Set<string>>(new Set())
  const [summaryBulletId, setSummaryBulletId] = useState<string | null>(null)
  const [defaultSelectedIds, setDefaultSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [loadStage, setLoadStage] = useState<LoadStage>('idle')

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>('clean')
  const [generatingCv, setGeneratingCv] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [cvDownloadError, setCvDownloadError] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [generatingCL, setGeneratingCL] = useState(false)
  const [downloadingCL, setDownloadingCL] = useState(false)
  const [downloadingCLPdf, setDownloadingCLPdf] = useState(false)
  const [clDownloadError, setClDownloadError] = useState('')
  const [clCopied, setClCopied] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState('')

  // Inline editing state
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [rewritingBulletId, setRewritingBulletId] = useState<string | null>(null)

  // Skills deselection
  const [deselectedSkills, setDeselectedSkills] = useState<Set<string>>(new Set())


  // CV variants
  const [variants, setVariants] = useState<CVVariant[]>([])
  const [currentVariantName, setCurrentVariantName] = useState('')

  // Mobile panel switcher (bullets section)
  const [mobilePanel, setMobilePanel] = useState<'selector' | 'preview'>('selector')

  const buildLoadedRef = useRef(false)
  const snapshotSaveTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const [snapshotSaved, setSnapshotSaved] = useState(false)
  const [generatingGapFor, setGeneratingGapFor] = useState<string | null>(null)
  const [gapSuggestions, setGapSuggestions] = useState<Map<string, GapSuggestion[]>>(new Map())

  // AI rewrite state
  const [aiRewriting, setAiRewriting] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiRewriteStage, setAiRewriteStage] = useState<string>('')
  const [aiRewriteError, setAiRewriteError] = useState<string>('')
  const [aiRewriteResult, setAiRewriteResult] = useState<CVRewriteResponse | null>(null)
  const [aiReviewMode, setAiReviewMode] = useState(false)
  const [useOriginalForIds, setUseOriginalForIds] = useState<Set<string>>(new Set())
  const [savedToBankIds, setSavedToBankIds] = useState<Set<string>>(new Set())
  const [removedAiIds, setRemovedAiIds] = useState<Set<string>>(new Set())
  const [bulletTextOverrides, setBulletTextOverrides] = useState<Map<string, string>>(new Map())
  const [aiBullets, setAiBullets] = useState<BulletBank[]>([])
  const [preRewriteSelection, setPreRewriteSelection] = useState<{ selectedIds: Set<string>; summaryId: string | null } | null>(null)
  const [sessionAddedSkills, setSessionAddedSkills] = useState<Set<string>>(new Set())
  const [pendingTailor, setPendingTailor] = useState(false)

  const allBulletsWithOverrides = useMemo(() => {
    if (bulletTextOverrides.size === 0 && aiBullets.length === 0) return allBullets
    const overridden = allBullets.map(b =>
      bulletTextOverrides.has(b.id) ? { ...b, text: bulletTextOverrides.get(b.id)! } : b
    )
    return [...overridden, ...aiBullets]
  }, [allBullets, bulletTextOverrides, aiBullets])

  const cvSnapshot = useMemo((): CVSnapshot | null => {
    if (!profileData.profile) return null

    const filteredProfile = {
      ...profileData.profile,
      skills_core: [
        ...[...sessionAddedSkills],
        ...profileData.profile.skills_core.filter(s => !deselectedSkills.has(s) && !sessionAddedSkills.has(s)),
      ],
      skills_proficient: profileData.profile.skills_proficient.filter(s => !deselectedSkills.has(s) && !sessionAddedSkills.has(s)),
      skills_familiar: profileData.profile.skills_familiar.filter(s => !deselectedSkills.has(s) && !sessionAddedSkills.has(s)),
    }

    // During AI review: build live preview from rewrite result + toggle states
    if (aiReviewMode && aiRewriteResult) {
      const { rewrittenCV } = aiRewriteResult

      const makeBullet = (
        b: { bullet_id: string; text: string; skill_tags?: string[]; has_metric?: boolean; metric_text?: string | null },
        type: BulletBank['type'],
        workExpId?: string | null,
        roleContext?: string | null
      ): BulletBank => {
        const orig = allBullets.find(ob => ob.bullet_id === b.bullet_id)
        const effectiveText = useOriginalForIds.has(b.bullet_id) && orig ? orig.text : b.text
        return orig
          ? { ...orig, text: effectiveText }
          : {
              id: b.bullet_id,
              user_id: profileData.profile?.user_id ?? '',
              bullet_id: b.bullet_id,
              type,
              role_context: roleContext ?? null,
              work_experience_id: workExpId ?? null,
              project_id: null,
              text: effectiveText,
              skill_tags: b.skill_tags || [],
              has_metric: b.has_metric || false,
              metric_text: b.metric_text || null,
              star_story: null,
              times_used: 0,
              last_defended_at: null,
              is_finalised: false,
              source: 'ai_generated',
              created_at: new Date().toISOString(),
            }
      }

      const summaryBulletRW = rewrittenCV.summaryBullets?.[0]
      const previewSummary: BulletBank[] =
        summaryBulletRW && !removedAiIds.has(summaryBulletRW.bullet_id)
          ? [makeBullet(summaryBulletRW, 'summary')]
          : []

      const previewHighlights: BulletBank[] = (rewrittenCV.highlightBullets || [])
        .filter(b => !removedAiIds.has(b.bullet_id))
        .map(b => makeBullet(b, 'highlight'))

      const previewWorkExperiences = profileData.workExperiences.map(we => {
        const weRW = rewrittenCV.workExperiences.find(w => w.id === we.id)
        const bullets: BulletBank[] = (weRW?.bullets ?? [])
          .filter(b => !removedAiIds.has(b.bullet_id))
          .map(b => makeBullet(b, 'experience', we.id, we.company))
        return { ...we, bullets }
      })

      // Apply suggested skill reordering to the preview profile
      const previewProfile = rewrittenCV.skills?.reordered_core?.length
        ? {
            ...filteredProfile,
            skills_core: [
              ...[...sessionAddedSkills],
              ...rewrittenCV.skills.reordered_core.filter(s => !sessionAddedSkills.has(s)),
            ],
          }
        : filteredProfile

      return {
        profile: previewProfile,
        workExperiences: previewWorkExperiences,
        education: profileData.education,
        certifications: profileData.certifications,
        highlightBullets: previewHighlights,
        summaryBullets: previewSummary,
        skills_line: rewrittenCV.skills_line,
      }
    }

    // Normal mode: build from selected bullets
    const selectedBullets = allBulletsWithOverrides.filter((b) => selectedBulletIds.has(b.id))
    const summaryBullet = summaryBulletId ? allBulletsWithOverrides.find((b) => b.id === summaryBulletId) ?? null : null
    const manualSkillsLine = [
      ...filteredProfile.skills_core,
      ...filteredProfile.skills_proficient,
    ].slice(0, 12)
    return {
      profile: filteredProfile,
      workExperiences: profileData.workExperiences.map((we) => ({
        ...we,
        bullets: selectedBullets.filter(
          (b) => b.type === 'experience' &&
            (b.work_experience_id === we.id || (b.work_experience_id === null && b.role_context === we.company))
        ),
      })),
      education: profileData.education,
      certifications: profileData.certifications,
      skills_line: manualSkillsLine,
      highlightBullets: selectedBullets.filter((b) => b.type === 'highlight'),
      summaryBullets: summaryBullet ? [summaryBullet] : [],
    }
  }, [allBulletsWithOverrides, selectedBulletIds, summaryBulletId, profileData, deselectedSkills, sessionAddedSkills, aiReviewMode, aiRewriteResult, useOriginalForIds, removedAiIds, allBullets])

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.job) setJob(d.job) })
      .catch(err => console.error('[editor/load-job] fetch failed:', err))
  }, [id])

  // Auto-save cv_snapshot whenever selection changes (debounced 2s)
  useEffect(() => {
    if (!cvSnapshot || !id) return
    const totalBullets = [
      ...(cvSnapshot.highlightBullets || []),
      ...(cvSnapshot.workExperiences || []).flatMap((we) => we.bullets || []),
    ]
    if (totalBullets.length === 0) return

    clearTimeout(snapshotSaveTimer.current)
    snapshotSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_snapshot: cvSnapshot }),
      })
      setSnapshotSaved(true)
      setTimeout(() => setSnapshotSaved(false), 2000)
    }, 2000)

    return () => clearTimeout(snapshotSaveTimer.current)
  }, [cvSnapshot, id])

  // Full data load: only runs once per mount
  useEffect(() => {
    if (buildLoadedRef.current) return
    buildLoadedRef.current = true
    const controller = new AbortController()
    const { signal } = controller

    const load = async () => {
      setLoading(true)
      try {
        setLoadStage('profile')
        const [jobRes, profileRes, weRes, eduRes, certRes, variantRes] = await Promise.all([
          fetch(`/api/jobs/${id}`, { signal }).then((r) => r.json()),
          fetch('/api/profile/about', { signal }).then((r) => r.json()),
          fetch('/api/work-experiences', { signal }).then((r) => r.json()),
          fetch('/api/education', { signal }).then((r) => r.json()),
          fetch('/api/certifications', { signal }).then((r) => r.json()),
          fetch('/api/cv-variants', { signal }).then((r) => r.json()),
        ])
        const loadedJob: Job = jobRes.job
        setJob(loadedJob)
        if (loadedJob.preferred_cv_template) {
          setSelectedTemplate(loadedJob.preferred_cv_template as TemplateName)
        }
        if (!loadedJob.cv_snapshot) {
          setPendingTailor(true)
        }
        const loadedProfile: Profile = profileRes.profile
        setProfileData({
          profile: loadedProfile,
          workExperiences: weRes.workExperiences || [],
          education: eduRes.education || [],
          certifications: certRes.certifications || [],
        })
        setVariants(variantRes.variants || [])

        // Auto-deselect skills not relevant to this job — user can re-add
        if (loadedProfile) {
          const reqText = (loadedJob.requirements || []).join(' ').toLowerCase() + ' ' + (loadedJob.raw_text || '').toLowerCase()
          const allProfileSkills = [...(loadedProfile.skills_core || []), ...(loadedProfile.skills_proficient || [])]
          const nonMatched = allProfileSkills.filter(s =>
            !reqText.includes(s.toLowerCase()) &&
            !s.toLowerCase().split(/\s+/).some(w => w.length > 3 && reqText.includes(w))
          )
          setDeselectedSkills(new Set(nonMatched))
        }

        setLoadStage('bullets')
        const bulletRes = await fetch('/api/bullets', { signal }).then((r) => r.json())
        const bullets: BulletBank[] = bulletRes.bullets || []
        setAllBullets(bullets)

        const priorSelectedIds = new Set<string>()
        if (loadedJob.cv_snapshot) {
          const snap = loadedJob.cv_snapshot as CVSnapshot
          const allSnapBullets = [
            ...(snap.summaryBullets || []),
            ...(snap.highlightBullets || []),
            ...(snap.workExperiences || []).flatMap((we) => we.bullets || []),
          ]
          allSnapBullets.forEach((sb) => {
            const match = bullets.find((b) => b.bullet_id === sb.bullet_id)
            if (match) priorSelectedIds.add(match.id)
          })
          if (priorSelectedIds.size > 0) {
            setSelectedBulletIds(priorSelectedIds)
            if (snap.summaryBullets?.[0]) {
              const sumMatch = bullets.find((b) => b.bullet_id === snap.summaryBullets![0].bullet_id)
              if (sumMatch) setSummaryBulletId(sumMatch.id)
            }
          }
        }

        // Check ranking cache (< 24 hours old)
        const cacheAge = loadedJob.ranking_cached_at
          ? (Date.now() - new Date(loadedJob.ranking_cached_at).getTime()) / 1000 / 60 / 60
          : Infinity

        if (loadedJob.ranking_cache && cacheAge < 24) {
          const cached: BulletMatch[] = loadedJob.ranking_cache as BulletMatch[]
          const scoreMap = new Map<string, BulletMatch>()
          const autoSelected = new Set<string>()
          cached.forEach((r) => {
            scoreMap.set(r.bullet.id, r)
            if (r.recommend || priorSelectedIds.has(r.bullet.id)) autoSelected.add(r.bullet.id)
          })
          const bestSummary = cached
            .filter((r) => r.bullet.type === 'summary')
            .sort((a, b) => b.score - a.score)[0]
          if (bestSummary) {
            setSummaryBulletId(bestSummary.bullet.id)
          } else {
            const firstSummary = bullets.find((b) => b.type === 'summary')
            if (firstSummary) setSummaryBulletId(firstSummary.id)
          }
          setRankedScores(scoreMap)
          if (priorSelectedIds.size === 0) setSelectedBulletIds(autoSelected)
          setDefaultSelectedIds(new Set(cached.filter((r) => r.recommend).map((r) => r.bullet.id)))
          setLoadStage('ready')
        } else {
          setLoadStage('ranking')
          setRankingLoading(true)
          try {
            const rankRes = await fetch('/api/bullets/rank', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobText: loadedJob.raw_text || `${loadedJob.role} at ${loadedJob.company}`,
                requirements: loadedJob.requirements || [],
                archetype: loadedJob.fit_analysis?.archetype || undefined,
              }),
              signal,
            })
            const rankData = await rankRes.json()
            const ranked: BulletMatch[] = rankData.ranked || []
            const scoreMap = new Map<string, BulletMatch>()
            const autoSelected = new Set<string>()
            ranked.forEach((r) => {
              scoreMap.set(r.bullet.id, r)
              if (r.recommend || priorSelectedIds.has(r.bullet.id)) autoSelected.add(r.bullet.id)
            })
            const bestSummary = ranked
              .filter((r) => r.bullet.type === 'summary')
              .sort((a, b) => b.score - a.score)[0]
            if (bestSummary) {
              setSummaryBulletId(bestSummary.bullet.id)
            } else {
              const firstSummary = bullets.find((b) => b.type === 'summary')
              if (firstSummary) setSummaryBulletId(firstSummary.id)
            }
            setRankedScores(scoreMap)
            if (priorSelectedIds.size === 0) setSelectedBulletIds(autoSelected)
            setDefaultSelectedIds(new Set(ranked.filter((r) => r.recommend).map((r) => r.bullet.id)))

            // Save ranking to cache (fire-and-forget)
            fetch(`/api/jobs/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ranking_cache: ranked,
                ranking_cached_at: new Date().toISOString(),
              }),
            }).catch(() => {/* non-critical */})
          } catch (e) {
            if ((e as Error).name !== 'AbortError') {
              const firstSummary = bullets.find((b) => b.type === 'summary')
              if (firstSummary) setSummaryBulletId(firstSummary.id)
            }
          }
          setRankingLoading(false)
          setLoadStage('ready')
        }

        setLoading(false)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Failed to load apply page data', e)
          setLoadStage('ready')
        }
        setLoading(false)
        setRankingLoading(false)
      }
    }
    load()
    return () => {
      controller.abort()
      buildLoadedRef.current = false
    }
  }, [id])

  const toggleBullet = useCallback((bulletId: string) => {
    setSelectedBulletIds((prev) => {
      const next = new Set(prev)
      if (next.has(bulletId)) next.delete(bulletId)
      else next.add(bulletId)
      return next
    })
  }, [])

  const toggleSkill = useCallback((skill: string) => {
    setDeselectedSkills(prev => {
      const n = new Set(prev)
      n.has(skill) ? n.delete(skill) : n.add(skill)
      return n
    })
  }, [])

  const resetToRecommended = () => setSelectedBulletIds(new Set(defaultSelectedIds))

  // Auto-trigger tailor on first visit (no existing snapshot) or when user chose AI mode
  useEffect(() => {
    if (pendingTailor && loadStage === 'ready') {
      setPendingTailor(false)
      setLoadStage('tailoring')
      setLoading(true)
      handleTailorCV()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleTailorCV omitted to prevent infinite loop (it changes on selection changes); pendingTailor + loadStage are the only trigger conditions
  }, [pendingTailor, loadStage])

  // ── AI rewrite handlers ───────────────────────────────────────────────────

  const AI_REWRITE_STAGES = [
    'Reading job description...',
    'Analysing your experience...',
    'Rewriting bullets...',
    'Checking keyword alignment...',
  ]

  const handleTailorCV = useCallback(async () => {
    setPreRewriteSelection({ selectedIds: new Set(selectedBulletIds), summaryId: summaryBulletId })
    setAiRewriting(true)
    setAiRewriteError('')
    setAiRewriteStage(AI_REWRITE_STAGES[0])
    let stageIdx = 0
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, AI_REWRITE_STAGES.length - 1)
      setAiRewriteStage(AI_REWRITE_STAGES[stageIdx])
    }, 5000)

    try {
      const res = await fetch('/api/cv/rewrite-for-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, mode: 'bank' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiRewriteError(data.error || 'Rewrite failed. Please try again.')
      } else {
        const result = data as CVRewriteResponse
        setAiRewriteResult(result)
        setAiReviewMode(true)
        setRemovedAiIds(new Set())
        setUseOriginalForIds(new Set()) // default: use rewritten for all bullets
      }
    } catch {
      setAiRewriteError('Request failed. Please try again.')
    }
    clearInterval(stageTimer)
    setAiRewriting(false)
    setLoading(false)
    setLoadStage('ready')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters (setAiRewriting etc.) are stable; stage/timer locals are created fresh each call
  }, [id, selectedBulletIds, summaryBulletId])

  const handleCvRefine = useCallback(async (refinementPrompt: string) => {
    if (!aiRewriteResult) return
    setAiRefining(true)
    try {
      const res = await fetch('/api/cv/rewrite-for-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          mode: 'bank',
          refinementPrompt,
          previousRewrite: JSON.stringify(aiRewriteResult.rewrittenCV),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiRewriteResult(data as CVRewriteResponse)
        setRemovedAiIds(new Set())
        setUseOriginalForIds(new Set())
      }
    } catch {
      // silently fail — user can try again
    }
    setAiRefining(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- state setters and allBullets/useOriginalForIds are accessed via closure but don't need to re-memoize the function
  }, [id, aiRewriteResult])

  const handleConfirmRewrite = useCallback(() => {
    if (!aiRewriteResult) return
    const { rewrittenCV } = aiRewriteResult

    const newSelectedIds = new Set<string>()
    const newOverrides = new Map<string, string>()
    const newAiBullets: BulletBank[] = []
    let newSummaryId: string | null = null

    const summaryRW = rewrittenCV.summaryBullets?.[0]
    if (summaryRW) {
      const orig = allBullets.find(b => b.bullet_id === summaryRW.bullet_id)
      if (orig) {
        newSummaryId = orig.id
        if (!useOriginalForIds.has(summaryRW.bullet_id)) {
          newOverrides.set(orig.id, summaryRW.text)
        }
      }
    }

    for (const hb of (rewrittenCV.highlightBullets || [])) {
      if (removedAiIds.has(hb.bullet_id)) continue
      if (hb.bullet_id.startsWith('ai-')) {
        const synth: BulletBank = {
          id: `${hb.bullet_id}-${Date.now()}`,
          user_id: profileData.profile?.user_id ?? '', bullet_id: hb.bullet_id, type: 'highlight',
          role_context: null, work_experience_id: null, project_id: null,
          text: hb.text, skill_tags: hb.skill_tags || [],
          has_metric: hb.has_metric || false, metric_text: hb.metric_text || null,
          star_story: null, times_used: 0, last_defended_at: null,
          is_finalised: false, source: 'ai_generated', created_at: new Date().toISOString(),
        }
        newAiBullets.push(synth)
        newSelectedIds.add(synth.id)
      } else {
        const orig = allBullets.find(b => b.bullet_id === hb.bullet_id)
        if (orig) {
          newSelectedIds.add(orig.id)
          if (!useOriginalForIds.has(hb.bullet_id)) newOverrides.set(orig.id, hb.text)
        }
      }
    }

    for (const we of rewrittenCV.workExperiences) {
      for (const b of we.bullets) {
        if (removedAiIds.has(b.bullet_id)) continue
        if (b.bullet_id.startsWith('ai-')) {
          const synth: BulletBank = {
            id: `${b.bullet_id}-${Date.now()}`,
            user_id: profileData.profile?.user_id ?? '', bullet_id: b.bullet_id, type: 'experience',
            role_context: we.company, work_experience_id: we.id, project_id: null,
            text: b.text, skill_tags: b.skill_tags || [],
            has_metric: b.has_metric || false, metric_text: b.metric_text || null,
            star_story: null, times_used: 0, last_defended_at: null,
            is_finalised: false, source: 'ai_generated', created_at: new Date().toISOString(),
          }
          newAiBullets.push(synth)
          newSelectedIds.add(synth.id)
        } else {
          const orig = allBullets.find(b2 => b2.bullet_id === b.bullet_id)
          if (orig) {
            newSelectedIds.add(orig.id)
            if (!useOriginalForIds.has(b.bullet_id)) newOverrides.set(orig.id, b.text)
          }
        }
      }
    }

    setBulletTextOverrides(newOverrides)
    setAiBullets(newAiBullets)
    setSelectedBulletIds(newSelectedIds)
    setSummaryBulletId(newSummaryId)
    setSavedToBankIds(new Set())
    setAiReviewMode(false)

    // Persist session-added skills to profile so they appear in future CVs
    if (sessionAddedSkills.size > 0 && profileData.profile) {
      const mergedCore = [
        ...[...sessionAddedSkills],
        ...profileData.profile.skills_core.filter(s => !sessionAddedSkills.has(s)),
      ]
      setProfileData(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, skills_core: mergedCore } : null,
      }))
      fetch('/api/profile/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills_core: mergedCore }),
      }).then(res => {
        if (!res.ok) console.error('[editor/skills-merge] save failed:', res.status)
      }).catch(err => console.error('[editor/skills-merge] save failed:', err))
    }

    fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewrite_snapshot: aiRewriteResult, cv_rewrite_source: 'ai_tailored' }),
    }).then(res => {
      if (!res.ok) console.error('[editor/rewrite-snapshot] save failed:', res.status)
    }).catch(err => console.error('[editor/rewrite-snapshot] save failed:', err))
  }, [aiRewriteResult, allBullets, useOriginalForIds, removedAiIds, id])

  const handleSaveRewrittenBulletToBank = useCallback(async (
    bullet: { bullet_id: string; text: string; type: string; skill_tags: string[]; has_metric: boolean; metric_text: string | null },
    effectiveText: string,
    workExpId?: string,
    roleContext?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet_id: `tailored-${Date.now()}`,
          type: bullet.type,
          text: effectiveText,
          skill_tags: bullet.skill_tags,
          has_metric: bullet.has_metric,
          metric_text: bullet.metric_text,
          work_experience_id: workExpId || null,
          role_context: roleContext || null,
        }),
      })
      const data = await res.json()
      if (data.bullet) {
        setAllBullets(prev => [...prev, data.bullet])
        setSavedToBankIds(prev => new Set([...prev, bullet.bullet_id]))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const handleResetRewrite = useCallback(() => {
    setAiRewriteResult(null)
    setAiReviewMode(false)
    setBulletTextOverrides(new Map())
    setAiBullets([])
    setUseOriginalForIds(new Set())
    setSavedToBankIds(new Set())
    setRemovedAiIds(new Set())
    setSessionAddedSkills(new Set())
    if (preRewriteSelection) {
      setSelectedBulletIds(preRewriteSelection.selectedIds)
      setSummaryBulletId(preRewriteSelection.summaryId)
    }
    setPreRewriteSelection(null)
  }, [preRewriteSelection])

  // ── Inline editing handlers ───────────────────────────────────────────────

  const handleInlineEditBullet = useCallback((bulletId: string, currentText: string) => {
    setEditingBulletId(bulletId)
    setEditingText(currentText)
  }, [])

  const handleCancelEdit = useCallback(() => {
    const bulletId = editingBulletId
    if (bulletId?.startsWith('temp-')) {
      setAllBullets(prev => prev.filter(b => b.id !== bulletId))
      setSelectedBulletIds(prev => { const n = new Set(prev); n.delete(bulletId); return n })
    }
    setEditingBulletId(null)
    setEditingText('')
  }, [editingBulletId])

  const handleSaveInlineEdit = useCallback(async (bulletId: string) => {
    if (!editingText.trim()) {
      if (bulletId.startsWith('temp-')) {
        setAllBullets(prev => prev.filter(b => b.id !== bulletId))
        setSelectedBulletIds(prev => { const n = new Set(prev); n.delete(bulletId); return n })
      }
      setEditingBulletId(null)
      setEditingText('')
      return
    }

    if (bulletId.startsWith('temp-')) {
      const tempBullet = allBullets.find(b => b.id === bulletId)
      if (!tempBullet) return
      setAllBullets(prev => prev.map(b => b.id === bulletId ? { ...b, text: editingText.trim() } : b))
      setEditingBulletId(null)
      setEditingText('')

      const res = await fetch('/api/bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet_id: `cv-${Date.now()}`,
          type: tempBullet.work_experience_id ? 'experience' : 'highlight',
          text: editingText.trim(),
          skill_tags: [],
          has_metric: false,
          metric_text: null,
          work_experience_id: tempBullet.work_experience_id,
          role_context: tempBullet.role_context,
          times_used: 0,
        }),
      })
      if (res.ok) {
        const { bullet: savedBullet } = await res.json()
        setAllBullets(prev => prev.map(b => b.id === bulletId ? savedBullet : b))
        setSelectedBulletIds(prev => {
          const n = new Set(prev)
          n.delete(bulletId)
          n.add(savedBullet.id)
          return n
        })
      }
    } else {
      setAllBullets(prev => prev.map(b => b.id === bulletId ? { ...b, text: editingText.trim() } : b))
      setEditingBulletId(null)
      setEditingText('')
      await fetch(`/api/bullets/${bulletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingText.trim() }),
      })
    }
  }, [editingText, allBullets])

  const handleRewriteWithAI = useCallback(async (bulletId: string, currentText: string) => {
    if (!job) return
    setRewritingBulletId(bulletId)
    try {
      const res = await fetch('/api/bullets/rewrite-for-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulletText: currentText,
          jobRole: job.role,
          jobCompany: job.company,
          requirements: job.requirements || [],
        }),
      })
      if (res.ok) {
        const { rewrittenText } = await res.json()
        setEditingBulletId(bulletId)
        setEditingText(rewrittenText)
      }
    } catch {
      // silent fail — user still has edit mode available
    }
    setRewritingBulletId(null)
  }, [job])

  const handleAddBulletToRole = useCallback((workExpId: string | null, company: string) => {
    const tempId = `temp-${Date.now()}`
    const newBullet: BulletBank = {
      id: tempId,
      user_id: profileData.profile?.user_id ?? '',
      bullet_id: `custom-${Date.now()}`,
      type: 'experience',
      role_context: company,
      work_experience_id: workExpId,
      project_id: null,
      text: '',
      skill_tags: [],
      has_metric: false,
      metric_text: null,
      star_story: null,
      times_used: 0,
      last_defended_at: null,
      is_finalised: false,
      source: 'cv_builder',
      created_at: new Date().toISOString(),
    }
    setAllBullets(prev => [...prev, newBullet])
    setSelectedBulletIds(prev => new Set([...prev, tempId]))
    setEditingBulletId(tempId)
    setEditingText('')
  }, [])

  const handlePreviewSectionClick = useCallback((sectionType: string, data: unknown) => {
    if (sectionType === 'bullet') {
      const bulletData = data as { id: string; text: string }
      setEditingBulletId(bulletData.id)
      setEditingText(bulletData.text)
      setSection('bullets')
    }
  }, [])

  // ── Variant handlers ──────────────────────────────────────────────────────

  const handleLoadVariant = useCallback(async (variantId: string) => {
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return

    const idsToSelect = new Set<string>()
    for (const bulletId of variant.bullet_ids) {
      const match = allBullets.find(b => b.bullet_id === bulletId || b.id === bulletId)
      if (match) idsToSelect.add(match.id)
    }
    setSelectedBulletIds(idsToSelect)

    if (variant.summary_bullet_id) {
      const sumMatch = allBullets.find(b => b.bullet_id === variant.summary_bullet_id || b.id === variant.summary_bullet_id)
      if (sumMatch) setSummaryBulletId(sumMatch.id)
    }

    if (variant.deselected_skills?.length) {
      setDeselectedSkills(new Set(variant.deselected_skills))
    }

    setCurrentVariantName(variant.name)

    await fetch(`/api/cv-variants/${variantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    })
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, last_used_at: new Date().toISOString() } : v))
  }, [variants, allBullets])

  const handleSaveVariant = useCallback(async (name: string) => {
    const selectedBulletBankIds = allBullets
      .filter(b => selectedBulletIds.has(b.id))
      .map(b => b.bullet_id)

    const summaryBulletBankId = summaryBulletId
      ? allBullets.find(b => b.id === summaryBulletId)?.bullet_id ?? null
      : null

    const res = await fetch('/api/cv-variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        summary_bullet_id: summaryBulletBankId,
        bullet_ids: selectedBulletBankIds,
        deselected_skills: [...deselectedSkills],
      }),
    })
    if (res.ok) {
      const { variant } = await res.json()
      setVariants(prev => [variant, ...prev])
    }
  }, [allBullets, selectedBulletIds, summaryBulletId, deselectedSkills])

  // ── Gap handlers ──────────────────────────────────────────────────────────

  const handleGenerateGapBullet = async (gap: CategorisedGap, userNote: string) => {
    if (!job || !profileData.profile) return
    setGeneratingGapFor(gap.requirement)
    try {
      const res = await fetch('/api/bullets/generate-for-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gapRequirement: gap.requirement,
          jobRole: job.role,
          jobCompany: job.company,
          userExperienceNote: userNote.trim() || null,
          userContext: {
            workHistory: profileData.workExperiences.map((we) => ({
              company: we.company,
              title: we.title,
              description: we.description || null,
            })),
            skills_core: profileData.profile!.skills_core,
            skills_proficient: profileData.profile!.skills_proficient,
          },
        }),
      })
      const data = await res.json()
      if (data.bullets) {
        setGapSuggestions((prev) => new Map(prev).set(gap.requirement, data.bullets))
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setGeneratingGapFor(null)
    }
  }

  const handleAddGapBulletToCV = (suggestion: GapSuggestion, gapReq: string, workExpId: string | null) => {
    const tempId = `gap-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const workExp = workExpId ? profileData.workExperiences.find(we => we.id === workExpId) : null
    const tempBullet: BulletBank = {
      id: tempId,
      user_id: profileData.profile?.user_id ?? '',
      bullet_id: `gap-${Date.now()}`,
      type: workExpId ? 'experience' : 'highlight',
      role_context: workExp ? workExp.company : null,
      work_experience_id: workExpId,
      project_id: null,
      text: suggestion.text,
      skill_tags: suggestion.skill_tags,
      has_metric: suggestion.has_metric,
      metric_text: suggestion.metric_text,
      star_story: null,
      times_used: 0,
      last_defended_at: null,
      is_finalised: false,
      source: 'manual',
      created_at: new Date().toISOString(),
    }
    setAllBullets((prev) => [...prev, tempBullet])
    setSelectedBulletIds((prev) => new Set([...prev, tempId]))
    setGapSuggestions((prev) => { const next = new Map(prev); next.delete(gapReq); return next })
  }

  const handleSaveAndAddGapBullet = async (suggestion: GapSuggestion, gapReq: string, workExpId: string | null) => {
    try {
      const workExp = workExpId ? profileData.workExperiences.find(we => we.id === workExpId) : null
      const res = await fetch('/api/bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet_id: `gap-${Date.now()}`,
          type: workExpId ? 'experience' : 'highlight',
          text: suggestion.text,
          skill_tags: suggestion.skill_tags,
          has_metric: suggestion.has_metric,
          metric_text: suggestion.metric_text,
          role_context: workExp ? workExp.company : null,
          work_experience_id: workExpId || null,
        }),
      })
      const data = await res.json()
      if (data.bullet) {
        setAllBullets((prev) => [...prev, data.bullet])
        setSelectedBulletIds((prev) => new Set([...prev, data.bullet.id]))
        setGapSuggestions((prev) => { const next = new Map(prev); next.delete(gapReq); return next })
      }
    } catch {
      // silent fail
    }
  }

  // ── Download handlers ─────────────────────────────────────────────────────

  const handleDownloadCV = useCallback(async () => {
    if (!job || !cvSnapshot) return
    setGeneratingCv(true)
    setCvDownloadError('')
    try {
      const res = await fetch(`/api/jobs/${id}/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvSnapshot, template: selectedTemplate }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCvDownloadError(res.status === 402 || res.status === 429 ? (data.error || 'Not enough credits.') : (data.error || 'Download failed. Please try again.'))
        setGeneratingCv(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV-${job.company}-${job.role}.docx`
      a.click()
      URL.revokeObjectURL(url)
      fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_snapshot: cvSnapshot, preferred_cv_template: selectedTemplate, cv_downloaded_at: new Date().toISOString() }),
      }).then(res => {
        if (!res.ok) console.error('[editor/cv-snapshot] save failed:', res.status)
      }).catch(err => console.error('[editor/cv-snapshot] save failed:', err))
    } catch {
      setCvDownloadError('Failed to generate CV. Please try again.')
    }
    setGeneratingCv(false)
  }, [job, cvSnapshot, id, selectedTemplate])

  const handleDownloadPDF = useCallback(async () => {
    if (!job || !cvSnapshot) return
    setGeneratingPdf(true)
    setCvDownloadError('')
    try {
      const res = await fetch('/api/cv/download/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvSnapshot,
          template: selectedTemplate,
          filename: `CV-${job.company}-${job.role}.pdf`,
          jobTitle: job.role,
          jobRequirements: job.raw_text,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCvDownloadError(data.error || 'PDF generation failed. Please try again.')
        setGeneratingPdf(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV-${job.company}-${job.role}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_snapshot: cvSnapshot, preferred_cv_template: selectedTemplate, cv_downloaded_at: new Date().toISOString() }),
      }).catch(() => {})
    } catch {
      setCvDownloadError('Failed to generate PDF. Please try again.')
    }
    setGeneratingPdf(false)
  }, [job, cvSnapshot, id, selectedTemplate])

  const handleGenerateCoverLetter = async () => {
    if (!job || !profileData.profile) return
    setCoverLetterError('')
    const selectedBulletTexts = allBullets.filter((b) => selectedBulletIds.has(b.id)).map((b) => b.text)
    if (selectedBulletTexts.length === 0) {
      setCoverLetterError('Select at least one bullet before generating a cover letter.')
      return
    }
    setGeneratingCL(true)
    setCoverLetter('')
    const res = await fetch('/api/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: { company: job.company, role: job.role, requirements: job.requirements, raw_text: job.raw_text },
        selectedBulletTexts,
        profile: {
          bio: profileData.profile.bio,
          positioning_headline: profileData.profile.positioning_headline,
          full_name: profileData.profile.full_name,
          skills_core: profileData.profile.skills_core,
        },
      }),
    })
    if (res.status === 402 || res.status === 429) {
      const data = await res.json()
      setCoverLetterError(data.error)
      setGeneratingCL(false)
      return
    }
    if (res.ok && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setCoverLetter(text)
      }
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_letter: text,
          cover_letter_version: (job.cover_letter_version || 1) + (job.cover_letter ? 1 : 0),
        }),
      })
    }
    setGeneratingCL(false)
  }

  const handleDownloadCoverLetter = async () => {
    if (!coverLetter || !job) return
    setDownloadingCL(true)
    setClDownloadError('')
    try {
      const res = await fetch(`/api/jobs/${id}/generate-cover-letter-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetterText: coverLetter }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 402 || res.status === 429) {
          setClDownloadError(errData.error || 'Not enough credits.')
        } else {
          setClDownloadError('Download failed. Please try again.')
        }
        setDownloadingCL(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CoverLetter-${job.company}.docx`
      a.click()
      URL.revokeObjectURL(url)
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_letter_downloaded_at: new Date().toISOString() }),
      })
    } catch {
      setClDownloadError('Download failed. Please try again.')
    }
    setDownloadingCL(false)
  }

  const handleDownloadCoverLetterPDF = async () => {
    if (!coverLetter || !job) return
    setDownloadingCLPdf(true)
    setClDownloadError('')
    try {
      const res = await fetch('/api/cover-letter/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetterText: coverLetter, filename: `CoverLetter-${job.company}.pdf` }),
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
    if (!coverLetter) return
    try {
      await navigator.clipboard.writeText(coverLetter)
      setClCopied(true)
      setTimeout(() => setClCopied(false), 2000)
    } catch {
      // fallback: select the textarea content
    }
  }

  // ─── Build mode loading ──────────────────────────────────────────────────────

  if ((loading && loadStage !== 'idle') || loadStage === 'tailoring') {
    const stages: LoadStage[] = ['profile', 'bullets', 'ranking', 'tailoring']
    const currentIdx = stages.indexOf(loadStage as LoadStage)
    return (
      <div className="flex flex-col min-h-screen">
        <div className="border-b border-gray-100 bg-white px-4 md:px-8 py-4">
          <Link href={`/jobs/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← {job?.company || 'Back to job'}
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="px-4 md:px-8 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-4 flex-wrap">
            {stages.map((stage, i) => {
              const done = currentIdx > i
              const active = currentIdx === i
              return (
                <div key={stage} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    done ? 'bg-green-500' : active ? 'bg-[var(--accent)] animate-pulse' : 'bg-gray-200'
                  }`} />
                  <span className={`text-xs ${active ? 'text-gray-900 font-medium' : done ? 'text-gray-400 line-through' : 'text-gray-300'}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Skeleton layout */}
        <div className="flex flex-col md:flex-row flex-1">
          <div className="md:w-2/5 p-4 space-y-3">
            <BulletGroupSkeleton />
            <BulletGroupSkeleton />
            <BulletGroupSkeleton />
          </div>
          <div className="md:flex-1 p-4">
            <div className="bg-white shadow rounded-lg">
              <CVPreviewSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="border-b border-gray-100 bg-white px-4 md:px-8 py-4">
          <Link href="/jobs" className="text-sm text-gray-400 hover:text-gray-600">← Jobs</Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  // ─── Derived values (build mode) ─────────────────────────────────────────────

  const summaryBullets = allBullets.filter((b) => b.type === 'summary')
  const selectedCount = selectedBulletIds.size + (summaryBulletId ? 1 : 0)

  const skillGaps = (job?.fit_analysis?.categorisedGaps || []).filter((g) => g.category === 'skill')

  const gapCoverage = new Map<string, boolean>()
  if (rankedScores.size > 0) {
    const selectedList = allBullets.filter((b) => selectedBulletIds.has(b.id))
    for (const gap of skillGaps) {
      const gapWords = gap.requirement.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
      const covered = selectedList.some((b) => {
        const isGapBullet = b.id.startsWith('gap-')
        if (!isGapBullet && (rankedScores.get(b.id)?.score ?? 0) <= 40) return false
        const bulletText = (b.text + ' ' + b.skill_tags.join(' ')).toLowerCase()
        return gapWords.some((word) => bulletText.includes(word))
      })
      gapCoverage.set(gap.requirement, covered)
    }
  }

  // Group non-summary bullets by role
  const roleGroups: RoleGroup[] = []
  for (const we of profileData.workExperiences) {
    const weBullets = allBullets
      .filter(
        b =>
          b.type === 'experience' &&
          (b.work_experience_id === we.id ||
            (b.work_experience_id === null && b.role_context === we.company)),
      )
      .sort((a, b) => (rankedScores.get(b.id)?.score ?? 0) - (rankedScores.get(a.id)?.score ?? 0))
    if (weBullets.length > 0) {
      roleGroups.push({
        workExpId: we.id,
        company: we.company,
        title: we.title,
        bullets: weBullets,
      })
    }
  }

  const highlightBullets = allBullets
    .filter(b => b.type === 'highlight')
    .sort((a, b) => (rankedScores.get(b.id)?.score ?? 0) - (rankedScores.get(a.id)?.score ?? 0))

  const projectBullets = allBullets
    .filter(b => b.type === 'project')
    .sort((a, b) => (rankedScores.get(b.id)?.score ?? 0) - (rankedScores.get(a.id)?.score ?? 0))

  const navItems: [Section, string][] = [['bullets', '1. Select bullets'], ['cover', '2. Cover letter']]

  // ─── Main UI ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header — top nav + mobile panel switcher together */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 py-3 flex items-center gap-2 flex-wrap">
          <Link href={`/jobs/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← {job?.company}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium">CV editor</span>
        </div>
        {/* Section nav — scrollable on mobile */}
        <div className="overflow-x-auto border-t border-gray-50">
          <div className="flex gap-1 min-w-max px-4 md:px-8 py-2">
            {navItems.map(([s, label]) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  section === s ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Mobile panel switcher — lives inside the sticky header so it never scrolls away */}
        {section === 'bullets' && (
          <div className="md:hidden flex border-t border-gray-100">
            <button
              onClick={() => setMobilePanel('selector')}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === 'selector' ? 'border-b-2 border-[var(--navy)] text-[var(--text-primary)]' : 'text-gray-400'
              }`}
            >
              Select bullets ({selectedCount})
            </button>
            <button
              onClick={() => setMobilePanel('preview')}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === 'preview' ? 'border-b-2 border-[var(--navy)] text-[var(--text-primary)]' : 'text-gray-400'
              }`}
            >
              CV preview
            </button>
          </div>
        )}
      </div>

      {/* ── Section: Select bullets ── */}
      {section === 'bullets' && (
        <>
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left panel — structured CV editor */}
          <div className={`md:w-2/5 md:border-r md:border-gray-100 md:flex md:flex-col md:overflow-hidden ${mobilePanel === 'selector' ? 'flex flex-col flex-1' : 'hidden md:flex'}`}>
            {/* Single scrollable area containing everything */}
            <div className="flex-1 overflow-y-auto">

              {/* AI Review mode — replaces normal bullet selection */}
              {aiReviewMode && aiRewriteResult && (
                <AIRewriteReview
                  rewriteResult={aiRewriteResult}
                  allBullets={allBullets}
                  useOriginalForIds={useOriginalForIds}
                  removedAiIds={removedAiIds}
                  sessionAddedSkills={sessionAddedSkills}
                  savedToBankIds={savedToBankIds}
                  onToggleOriginal={(bulletId) => setUseOriginalForIds(prev => {
                    const n = new Set(prev)
                    n.has(bulletId) ? n.delete(bulletId) : n.add(bulletId)
                    return n
                  })}
                  onToggleRemove={(bulletId) => setRemovedAiIds(prev => {
                    const n = new Set(prev)
                    n.has(bulletId) ? n.delete(bulletId) : n.add(bulletId)
                    return n
                  })}
                  onToggleAddSkill={(skill) => setSessionAddedSkills(prev => {
                    const n = new Set(prev)
                    n.has(skill) ? n.delete(skill) : n.add(skill)
                    return n
                  })}
                  onSaveToBank={handleSaveRewrittenBulletToBank}
                  onConfirm={handleConfirmRewrite}
                  onReset={handleResetRewrite}
                  onRefine={handleCvRefine}
                  isRefining={aiRefining}
                />
              )}

              {/* Normal bullet selection — hidden when in AI review mode */}
              {!aiReviewMode && (
              <>

              {/* Bullets area */}
              <div className="p-4 space-y-4">

              {/* Summary section — same card style as role groups */}
              {summaryBullets.length > 0 && (
                <SummarySection
                  bullets={summaryBullets}
                  selectedId={summaryBulletId}
                  onSelect={(id) => setSummaryBulletId(id)}
                />
              )}

              {rankingLoading && (
                <p className="text-xs text-gray-400 py-2">Analysing your bullets against this role…</p>
              )}

              {/* Gap section */}
              <GapSection
                skillGaps={skillGaps}
                gapCoverage={gapCoverage}
                gapSuggestions={gapSuggestions}
                generatingGapFor={generatingGapFor}
                profileLoaded={!!profileData.profile}
                workExperiences={profileData.workExperiences}
                onGenerate={handleGenerateGapBullet}
                onAddToCV={handleAddGapBulletToCV}
                onSaveAndAdd={handleSaveAndAddGapBullet}
              />

              {/* Skills — only job-relevant skills shown, add more available */}
              {!rankingLoading && profileData.profile && (
                <SkillsSection
                  allSkills={[...profileData.profile.skills_core, ...profileData.profile.skills_proficient]}
                  requirements={job?.requirements || []}
                  deselectedSkills={deselectedSkills}
                  onToggle={toggleSkill}
                />
              )}

              {/* Role groups */}
              {roleGroups.map((group) => (
                <RoleGroupSection
                  key={group.workExpId || group.company}
                  group={group}
                  rankedScores={rankedScores}
                  selectedBulletIds={selectedBulletIds}
                  onToggle={toggleBullet}
                  onEditBullet={handleInlineEditBullet}
                  onSaveEdit={handleSaveInlineEdit}
                  onCancelEdit={handleCancelEdit}
                  onRewriteWithAI={handleRewriteWithAI}
                  onAddBullet={handleAddBulletToRole}
                  editingBulletId={editingBulletId}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  rewritingBulletId={rewritingBulletId}
                />
              ))}

              {/* Highlights group */}
              {highlightBullets.length > 0 && (
                <HighlightGroupSection
                  bullets={highlightBullets}
                  rankedScores={rankedScores}
                  selectedBulletIds={selectedBulletIds}
                  onToggle={toggleBullet}
                  onEditBullet={handleInlineEditBullet}
                  onSaveEdit={handleSaveInlineEdit}
                  onCancelEdit={handleCancelEdit}
                  onRewriteWithAI={handleRewriteWithAI}
                  editingBulletId={editingBulletId}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  rewritingBulletId={rewritingBulletId}
                />
              )}

              {/* Project bullets */}
              {projectBullets.length > 0 && (
                <ProjectGroupSection
                  bullets={projectBullets}
                  rankedScores={rankedScores}
                  selectedBulletIds={selectedBulletIds}
                  onToggle={toggleBullet}
                  onEditBullet={handleInlineEditBullet}
                  onSaveEdit={handleSaveInlineEdit}
                  onCancelEdit={handleCancelEdit}
                  onRewriteWithAI={handleRewriteWithAI}
                  editingBulletId={editingBulletId}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  rewritingBulletId={rewritingBulletId}
                />
              )}

              {roleGroups.length === 0 && highlightBullets.length === 0 && !rankingLoading && (
                <p className="text-xs text-gray-400">No bullets yet. Add bullets from your profile.</p>
              )}
            </div>
              </>
              )}

            </div>{/* end flex-1 overflow-y-auto */}

            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{selectedCount} bullets selected</span>
                {snapshotSaved && (
                  <span className="text-xs text-green-600 transition-opacity">Selection saved ✓</span>
                )}
              </div>
              <button onClick={resetToRecommended} className="text-xs text-gray-500 hover:text-gray-900 underline">
                Reset to recommended
              </button>
            </div>
          </div>

          {/* Right panel — template selector + interactive live CV preview */}
          <div className={`md:flex-1 md:flex md:flex-col md:overflow-hidden ${mobilePanel === 'preview' ? 'flex flex-col flex-1' : 'hidden md:flex'}`}>
            {/* Template selector — above the preview so selection is visible alongside it */}
            <div className="px-4 pt-4 pb-2 border-b border-gray-100">
              <TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
            </div>
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Live preview — click any bullet to edit</p>
              <span className="text-xs font-medium text-[var(--navy)] bg-[var(--accent-light)] border border-[var(--accent)] px-2 py-0.5 rounded-full">
                {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white shadow rounded-lg p-8 max-w-2xl mx-auto">
                <CVPreview
                  cvSnapshot={cvSnapshot}
                  jobRequirements={job?.requirements || []}
                  onSectionClick={handlePreviewSectionClick}
                  interactive={true}
                  job={job}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-3">
              {cvDownloadError && <p className="text-xs text-red-500">{cvDownloadError}</p>}
              <div className="flex gap-2 ml-auto flex-wrap">
                <button
                  onClick={handleDownloadPDF}
                  disabled={generatingPdf || !cvSnapshot}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--navy)] text-[var(--navy)] rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy)] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10M6 9l4 4 4-4M4 17h12" />
                  </svg>
                  {generatingPdf ? 'Building…' : 'Download PDF'}
                </button>
                <button
                  onClick={handleDownloadCV}
                  disabled={generatingCv || !cvSnapshot}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10M6 9l4 4 4-4M4 17h12" />
                  </svg>
                  {generatingCv ? 'Building…' : `Download Word (.docx)`}
                </button>
                <button
                  onClick={() => setSection('cover')}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cover letter →
                </button>
              </div>
              </div>
            </div>
          </div>
          </div>{/* end flex-col md:flex-row */}
        </>
      )}

      {/* ── Section: Cover letter ── */}
      {section === 'cover' && (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1 mb-6 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit">
              {([
                ['generate', 'Generate with BulletBank'],
                ['skip', 'Skip this step'],
              ] as [CoverMode, string][]).map(([cm, label]) => (
                <button
                  key={cm}
                  onClick={() => setCoverMode(cm)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    coverMode === cm ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {coverMode === 'generate' && (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-600 space-y-1">
                  <p>Based on: <strong>{selectedCount} selected bullets</strong></p>
                  <p>For: <strong>{job?.role} at {job?.company}</strong></p>
                  <p>Using your profile bio and positioning headline</p>
                </div>
                {coverLetterError && <p className="text-sm text-red-600 mb-4">{coverLetterError}</p>}
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCL}
                  className="mb-5 px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
                >
                  {generatingCL ? 'Generating cover letter…' : coverLetter ? 'Regenerate →' : 'Generate cover letter →'}
                </button>
                {coverLetter && (
                  <>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={18}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                    />
                    {clDownloadError && <p className="text-xs text-red-500 mt-2">{clDownloadError}</p>}
                    <div className="flex justify-between mt-4">
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadCoverLetter}
                          disabled={downloadingCL}
                          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          {downloadingCL ? 'Generating document...' : 'Download Word →'}
                        </button>
                        <button
                          onClick={handleDownloadCoverLetterPDF}
                          disabled={downloadingCLPdf}
                          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          {downloadingCLPdf ? 'Generating PDF...' : 'Download PDF →'}
                        </button>
                        <button
                          onClick={handleCopyCoverLetter}
                          title="Copy to clipboard"
                          className="px-3 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 hover:text-gray-700 transition-colors"
                        >
                          {clCopied ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 10l4 4 8-8" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="8" y="2" width="10" height="13" rx="1.5" />
                              <path d="M4 6H3a1 1 0 00-1 1v10a1 1 0 001 1h9a1 1 0 001-1v-1" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <Link
                        href={`/jobs/${id}`}
                        className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
                      >
                        Done — view job record →
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}

            {coverMode === 'skip' && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 mb-6">No cover letter will be attached to this application.</p>
                <Link
                  href={`/jobs/${id}`}
                  className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
                >
                  Done — view job record →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
