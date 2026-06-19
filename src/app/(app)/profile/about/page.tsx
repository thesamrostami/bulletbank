'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, WorkType, Seniority } from '@/types'

// ─── Reset modal ─────────────────────────────────────────────────────────────

function ResetModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const canConfirm = confirmText === 'DELETE'

  const handleReset = async () => {
    setResetting(true)
    setError('')
    try {
      const res = await fetch('/api/profile/reset', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      onReset()
    } catch (err) {
      setError((err as Error).message)
      setResetting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">This will permanently delete your profile data</h2>
        </div>

        <div className="space-y-1.5 mb-5 pl-1">
          {[
            'All work experience entries and their bullets',
            'All education entries',
            'All certifications',
            'All projects and their bullets',
            'All bullet bank entries',
            'Your profile information (bio, skills, positioning)',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-red-400">×</span>
              <span>{item}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <span className="text-green-500">✓</span>
            <span>Your email address and password will NOT be deleted</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!canConfirm || resetting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            {resetting ? 'Resetting...' : 'Permanently reset my profile'}
          </button>
          <button
            onClick={onClose}
            disabled={resetting}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteAccountModal({
  onClose,
  onDeleted,
}: {
  onClose: () => void
  onDeleted: () => void
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const confirmed = input === 'DELETE MY ACCOUNT'

  const handleDelete = async () => {
    if (!confirmed) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/profile/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Deletion failed. Please try again.')
        setLoading(false)
        return
      }
      onDeleted()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-red-600 text-lg">⚠</span>
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            Permanently delete your account
          </h2>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          This will permanently and irreversibly delete:
        </p>
        <ul className="text-xs text-gray-500 space-y-1 mb-5 ml-4 list-disc">
          <li>Your profile, bio, skills, and positioning</li>
          <li>All work experience, education, and certifications</li>
          <li>Your entire bullet bank</li>
          <li>All job applications, CVs, and cover letters</li>
          <li>All uploaded documents</li>
          <li>Your login — you will not be able to sign in again</li>
        </ul>

        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE MY ACCOUNT</span> to confirm
        </label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
          placeholder="DELETE MY ACCOUNT"
          autoComplete="off"
        />

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            {loading ? 'Deleting everything…' : 'Permanently delete my account'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-[var(--border)] text-[var(--text-primary)] rounded-xl text-sm hover:bg-[var(--surface)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[]
  onAdd: (t: string) => void
  onRemove: (i: number) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
            {tag}
            <button type="button" onClick={() => onRemove(i)} className="text-gray-400 hover:text-gray-700 leading-none text-base">×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault()
            onAdd(input.trim())
            setInput('')
          }
        }}
        placeholder={placeholder || 'Type and press Enter to add...'}
        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
    </div>
  )
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            value === opt ? 'bg-[var(--navy)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface)]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function SaveButton({ saving, saved, error, onClick }: { saving: boolean; saved: boolean; error: string; onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
      {saved && <span className="text-sm text-green-600 animate-fade">Saved ✓</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AdditionalLink = { label: string; url: string }

type FormProfile = {
  full_name: string
  email: string
  phone: string
  location_city: string
  location_country: string
  linkedin_url: string
  portfolio_url: string
  website_url: string
  additional_links: AdditionalLink[]
  job_search_locations: string[]
  work_authorisation: string
  willing_to_relocate: boolean
  preferred_work_type: WorkType
  positioning_headline: string
  bio: string
  skills_core: string[]
  skills_proficient: string[]
  skills_familiar: string[]
  languages: string[]
  job_titles: string[]
  seniority: Seniority
  years_experience: string
  experience: string
}

const empty: FormProfile = {
  full_name: '', email: '', phone: '',
  location_city: '', location_country: '',
  linkedin_url: '', portfolio_url: '', website_url: '',
  additional_links: [],
  job_search_locations: [],
  work_authorisation: '',
  willing_to_relocate: false,
  preferred_work_type: 'Hybrid',
  positioning_headline: '', bio: '',
  skills_core: [], skills_proficient: [], skills_familiar: [], languages: [],
  job_titles: [], seniority: 'Mid-level', years_experience: '',
  experience: '',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormProfile>(empty)
  const [loading, setLoading] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savedPersonal, setSavedPersonal] = useState(false)
  const [errorPersonal, setErrorPersonal] = useState('')

  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedPrefs, setSavedPrefs] = useState(false)
  const [errorPrefs, setErrorPrefs] = useState('')

  const [savingSummary, setSavingSummary] = useState(false)
  const [savedSummary, setSavedSummary] = useState(false)
  const [errorSummary, setErrorSummary] = useState('')

  const [savingSkills, setSavingSkills] = useState(false)
  const [savedSkills, setSavedSkills] = useState(false)
  const [errorSkills, setErrorSkills] = useState('')

  const [savingCareer, setSavingCareer] = useState(false)
  const [savedCareer, setSavedCareer] = useState(false)
  const [errorCareer, setErrorCareer] = useState('')

  const [savingStory, setSavingStory] = useState(false)
  const [savedStory, setSavedStory] = useState(false)
  const [errorStory, setErrorStory] = useState('')

  const [regenHeadline, setRegenHeadline] = useState(false)
  const [regenBio, setRegenBio] = useState(false)
  const [dangerExpanded, setDangerExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/profile/about')
      .then(r => r.json())
      .then(({ profile }: { profile: Profile | null }) => {
        if (!profile) {
          setLoading(false)
          // Redirect to onboarding if profile doesn't exist
          router.replace('/profile/onboarding')
          return
        }
        if (!profile.onboarding_complete) {
          router.replace('/profile/onboarding')
          return
        }
        setForm({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location_city: profile.location_city || '',
          location_country: profile.location_country || '',
          linkedin_url: profile.linkedin_url || '',
          portfolio_url: profile.portfolio_url || profile.website_url || '',
          website_url: profile.website_url || '',
          additional_links: profile.additional_links ||
            (profile.github_url ? [{ label: 'GitHub', url: profile.github_url }] : []),
          job_search_locations: profile.job_search_locations || [],
          work_authorisation: profile.work_authorisation || '',
          willing_to_relocate: profile.willing_to_relocate || false,
          preferred_work_type: profile.preferred_work_type || 'Hybrid',
          positioning_headline: profile.positioning_headline || '',
          bio: profile.bio || '',
          skills_core: profile.skills_core || [],
          skills_proficient: profile.skills_proficient || [],
          skills_familiar: profile.skills_familiar || [],
          languages: profile.languages || [],
          job_titles: profile.job_titles || [],
          seniority: (profile.seniority as Seniority) || 'Mid-level',
          years_experience: profile.years_experience?.toString() || '',
          experience: profile.experience || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const set = useCallback(<K extends keyof FormProfile>(field: K, value: FormProfile[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const patchAndFlash = async (
    fields: Partial<Record<string, unknown>>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
    setError: (v: string) => void,
  ) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const savePersonal = () => patchAndFlash({
    full_name: form.full_name || null,
    phone: form.phone || null,
    location_city: form.location_city || null,
    location_country: form.location_country || null,
    linkedin_url: form.linkedin_url || null,
    portfolio_url: form.portfolio_url || null,
    website_url: form.website_url || null,
    additional_links: form.additional_links.filter(l => l.label.trim() || l.url.trim()),
  }, setSavingPersonal, setSavedPersonal, setErrorPersonal)

  const savePrefs = () => patchAndFlash({
    job_search_locations: form.job_search_locations,
    work_authorisation: form.work_authorisation || null,
    willing_to_relocate: form.willing_to_relocate,
    preferred_work_type: form.preferred_work_type,
  }, setSavingPrefs, setSavedPrefs, setErrorPrefs)

  const saveSummary = () => patchAndFlash({
    positioning_headline: form.positioning_headline || null,
    bio: form.bio || null,
  }, setSavingSummary, setSavedSummary, setErrorSummary)

  const saveSkills = () => patchAndFlash({
    skills_core: form.skills_core,
    skills_proficient: form.skills_proficient,
    skills_familiar: form.skills_familiar,
    languages: form.languages,
  }, setSavingSkills, setSavedSkills, setErrorSkills)

  const saveCareer = () => patchAndFlash({
    job_titles: form.job_titles,
    seniority: form.seniority,
    years_experience: form.years_experience ? parseInt(form.years_experience) : null,
  }, setSavingCareer, setSavedCareer, setErrorCareer)

  const saveStory = () => patchAndFlash({
    experience: form.experience || null,
  }, setSavingStory, setSavedStory, setErrorStory)

  const regenField = async (field: 'positioning_headline' | 'bio') => {
    const setRegen = field === 'positioning_headline' ? setRegenHeadline : setRegenBio
    setRegen(true)
    try {
      const res = await fetch('/api/profile/positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData: {
            jobTitles: form.job_titles,
            skills: [...form.skills_core, ...form.skills_proficient],
            yearsExperience: parseInt(form.years_experience) || 0,
            seniority: form.seniority,
            summary: form.bio,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (field === 'positioning_headline' && data.positioningHeadline) {
          set('positioning_headline', data.positioningHeadline)
        } else if (field === 'bio') {
          // Use the positioning headline as a bio seed if nothing else
          if (data.positioningHeadline) set('bio', data.positioningHeadline)
        }
      }
    } catch { /* silent */ }
    setRegen(false)
  }

  const inputClass = 'w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">

      {showResetModal && (
        <ResetModal
          onClose={() => setShowResetModal(false)}
          onReset={() => router.push('/profile/onboarding')}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => {
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/'
          }}
        />
      )}

      {/* Section 1: Personal Information */}
      <SectionCard title="Personal information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name">
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputClass} placeholder="Jane Smith" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} disabled className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="+44 7700 000000" />
          </Field>
          <Field label="City">
            <input type="text" value={form.location_city} onChange={e => set('location_city', e.target.value)} className={inputClass} placeholder="London" />
          </Field>
          <Field label="Country">
            <input type="text" value={form.location_country} onChange={e => set('location_country', e.target.value)} className={inputClass} placeholder="United Kingdom" />
          </Field>
          <Field label="LinkedIn URL">
            <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="Portfolio / Website">
            <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} className={inputClass} placeholder="https://yoursite.com" />
          </Field>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Additional links</label>
          <div className="space-y-2">
            {form.additional_links.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={link.label}
                  onChange={e => {
                    const next = [...form.additional_links]
                    next[i] = { ...next[i], label: e.target.value }
                    set('additional_links', next)
                  }}
                  placeholder="GitHub"
                  className="w-32 shrink-0 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={e => {
                    const next = [...form.additional_links]
                    next[i] = { ...next[i], url: e.target.value }
                    set('additional_links', next)
                  }}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => set('additional_links', form.additional_links.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {form.additional_links.length < 5 && (
            <button
              type="button"
              onClick={() => set('additional_links', [...form.additional_links, { label: '', url: '' }])}
              className="mt-2 text-sm text-[var(--accent)] hover:underline"
            >
              + Add link
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1.5">GitHub links only appear on tech-role CVs. All others always show.</p>
        </div>

        <SaveButton saving={savingPersonal} saved={savedPersonal} error={errorPersonal} onClick={savePersonal} />
      </SectionCard>

      {/* Section 2: Job Search Preferences */}
      <SectionCard title="Job search preferences">
        <div className="space-y-4">
          <Field label="Where are you looking?" hint="Type a city, country, or 'Remote' and press Enter">
            <TagInput
              tags={form.job_search_locations}
              onAdd={t => set('job_search_locations', [...form.job_search_locations, t])}
              onRemove={i => set('job_search_locations', form.job_search_locations.filter((_, idx) => idx !== i))}
              placeholder="London, Remote, Berlin..."
            />
          </Field>
          <Field label="Work authorisation">
            <input type="text" value={form.work_authorisation} onChange={e => set('work_authorisation', e.target.value)} className={inputClass} placeholder="e.g. UK right to work, EU citizen, Requires sponsorship" />
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('willing_to_relocate', !form.willing_to_relocate)}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.willing_to_relocate ? 'bg-[var(--accent)]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${form.willing_to_relocate ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-gray-700">Willing to relocate</span>
          </div>
          <Field label="Preferred work type">
            <SegmentedControl<WorkType>
              options={['Remote', 'Hybrid', 'On-site', 'Flexible']}
              value={form.preferred_work_type}
              onChange={v => set('preferred_work_type', v)}
            />
          </Field>
        </div>
        <SaveButton saving={savingPrefs} saved={savedPrefs} error={errorPrefs} onClick={savePrefs} />
      </SectionCard>

      {/* Section 3: Professional Summary */}
      <SectionCard title="Professional summary">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Positioning headline</label>
              <span className="text-xs text-gray-400">{form.positioning_headline.length}/200</span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={form.positioning_headline}
                onChange={e => set('positioning_headline', e.target.value.slice(0, 200))}
                className={inputClass}
                placeholder="e.g. Senior software engineer specialising in distributed systems and team leadership"
              />
              <button
                type="button"
                onClick={() => regenField('positioning_headline')}
                disabled={regenHeadline}
                className="self-start px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 transition-colors"
              >
                {regenHeadline ? '...' : 'Regenerate with AI →'}
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Bio</label>
              <span className="text-xs text-gray-400">{form.bio.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <div className="flex flex-col gap-2">
              <textarea
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="A brief professional summary for cover letters and applications..."
              />
              <button
                type="button"
                onClick={() => regenField('bio')}
                disabled={regenBio}
                className="self-start px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 transition-colors"
              >
                {regenBio ? '...' : 'Regenerate with AI →'}
              </button>
            </div>
          </div>
        </div>
        <SaveButton saving={savingSummary} saved={savedSummary} error={errorSummary} onClick={saveSummary} />
      </SectionCard>

      {/* Section 4: Skills */}
      <SectionCard title="Skills">
        <div className="space-y-5">
          <Field label="Core skills" hint="Primary expertise — skills you'd stake your reputation on">
            <TagInput
              tags={form.skills_core}
              onAdd={t => set('skills_core', [...form.skills_core, t])}
              onRemove={i => set('skills_core', form.skills_core.filter((_, idx) => idx !== i))}
              placeholder="React, Python, System Design..."
            />
          </Field>
          <Field label="Proficient skills" hint="Solid working knowledge — can do independently">
            <TagInput
              tags={form.skills_proficient}
              onAdd={t => set('skills_proficient', [...form.skills_proficient, t])}
              onRemove={i => set('skills_proficient', form.skills_proficient.filter((_, idx) => idx !== i))}
              placeholder="TypeScript, PostgreSQL, Docker..."
            />
          </Field>
          <Field label="Familiar skills" hint="Used before but not primary — comfortable getting up to speed">
            <TagInput
              tags={form.skills_familiar}
              onAdd={t => set('skills_familiar', [...form.skills_familiar, t])}
              onRemove={i => set('skills_familiar', form.skills_familiar.filter((_, idx) => idx !== i))}
              placeholder="Go, Kubernetes, GraphQL..."
            />
          </Field>
          <Field label="Languages">
            <TagInput
              tags={form.languages}
              onAdd={t => set('languages', [...form.languages, t])}
              onRemove={i => set('languages', form.languages.filter((_, idx) => idx !== i))}
              placeholder="English (Native), Arabic (Fluent)..."
            />
          </Field>
        </div>
        <SaveButton saving={savingSkills} saved={savedSkills} error={errorSkills} onClick={saveSkills} />
      </SectionCard>

      {/* Section 5: Career Metadata */}
      <SectionCard title="Career metadata">
        <div className="space-y-4">
          <Field label="Target job titles" hint="Roles you're actively applying for">
            <TagInput
              tags={form.job_titles}
              onAdd={t => set('job_titles', [...form.job_titles, t])}
              onRemove={i => set('job_titles', form.job_titles.filter((_, idx) => idx !== i))}
              placeholder="Senior Software Engineer, Tech Lead..."
            />
          </Field>
          <Field label="Seniority level">
            <SegmentedControl<Seniority>
              options={['Graduate', 'Mid-level', 'Senior', 'Lead', 'Head']}
              value={form.seniority}
              onChange={v => set('seniority', v)}
            />
          </Field>
          <Field label="Years of experience">
            <input
              type="number"
              min={0}
              max={50}
              value={form.years_experience}
              onChange={e => set('years_experience', e.target.value)}
              className={`${inputClass} max-w-32`}
              placeholder="5"
            />
          </Field>
        </div>
        <SaveButton saving={savingCareer} saved={savedCareer} error={errorCareer} onClick={saveCareer} />
      </SectionCard>

      {/* Section 6: Career Story */}
      <SectionCard title="Career story">
        <div className="space-y-3">
          {/* Pro tip callout */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">Pro tip:</span> The more detail you add here, the better your AI-tailored CVs become. Include specific achievements, technologies, team sizes, and business impact — anything relevant across job applications.
            </p>
          </div>
          {(() => {
            const wordCount = form.experience.split(/\s+/).filter(Boolean).length
            const quality = wordCount < 200
              ? { label: 'Basic — add more detail for better results', color: 'text-amber-600' }
              : wordCount < 500
              ? { label: 'Good', color: 'text-blue-600' }
              : { label: 'Excellent — AI has rich context to work with', color: 'text-green-600' }
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Your career story (detailed background for AI tailoring)</label>
                  {wordCount > 0 && (
                    <span className={`text-xs font-medium ${quality.color}`}>{quality.label}</span>
                  )}
                </div>
                {/* Floating word count */}
                <div className="relative">
                  <textarea
                    value={form.experience}
                    onChange={e => set('experience', e.target.value)}
                    rows={10}
                    className={`${inputClass} resize-none pb-6`}
                    placeholder="Describe your career in detail — roles, responsibilities, achievements, projects, technologies used, team sizes, business impact. The more specific and concrete, the better the AI can tailor your CV for each role you apply to."
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-gray-400 pointer-events-none bg-white px-1">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
        <SaveButton saving={savingStory} saved={savedStory} error={errorStory} onClick={saveStory} />
      </SectionCard>

      {/* ── Danger zone (collapsible) ─────────────────────────── */}
      <div className="mt-16">
        <button
          type="button"
          onClick={() => setDangerExpanded(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Danger zone
          </span>
          <svg
            className={`w-4 h-4 text-red-500 transition-transform duration-200 ${dangerExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {dangerExpanded && (
          <div className="mt-2 bg-white border border-red-100 rounded-xl p-6">
            <p className="text-xs text-gray-400 mb-5">These actions are permanent and cannot be undone.</p>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">Reset profile and start fresh</p>
                <p className="text-sm text-gray-500 max-w-sm">
                  This permanently deletes your work history, education, certifications, projects, and all bullet points. Your email and password are kept. You will go through the profile setup process again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="self-start shrink-0 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
              >
                Reset my profile →
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-red-100">
              <p className="text-sm font-medium text-red-800 mb-1">Delete account permanently</p>
              <p className="text-xs text-gray-500 mb-4">
                Permanently deletes all your data — profile, bullet bank, applications, documents, and your login.
                This cannot be undone. Your email address is freed immediately.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete my account →
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
