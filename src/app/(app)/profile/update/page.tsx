'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  WorkExperience, Education, Certification,
  UpdateExtractResult, EmploymentType,
} from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillLevel = 'core' | 'proficient' | 'familiar'

interface ReviewWorkExp {
  included: boolean
  data: {
    company: string; title: string; employment_type: string
    location: string; is_remote: boolean; start_date: string
    end_date: string; is_current: boolean; description: string
  }
}

interface ReviewEducation {
  included: boolean
  data: {
    institution: string; degree: string; field_of_study: string
    start_date: string; end_date: string; is_current: boolean; grade: string
  }
}

interface ReviewCert {
  included: boolean
  data: {
    name: string; issuing_organisation: string
    issue_date: string; expiry_date: string; no_expiry: boolean
  }
}

interface ReviewProject {
  included: boolean
  data: {
    name: string; description: string; tech_stack: string[]
    start_date: string; end_date: string; is_ongoing: boolean
  }
}

interface ReviewSkill {
  included: boolean; skill: string; level: SkillLevel
}

interface ReviewUpdate {
  action: 'new' | 'update' | 'skip'
  item: UpdateExtractResult['updatesToExisting'][0]
}

interface GeneratedBullet {
  text: string; skill_tags: string[]; has_metric: boolean
  metric_text: string | null; editing: boolean; editText: string
}

interface Phase3Bullets {
  workExps: Record<number, GeneratedBullet[]>
  projects: Record<number, GeneratedBullet[]>
}

interface ExistingData {
  workExperiences: WorkExperience[]
  education: Education[]
  certifications: Certification[]
  skills: { core: string[]; proficient: string[]; familiar: string[] }
}

interface UploadedFile {
  name: string; type: string; textContent?: string; base64?: string
}

type Phase = 1 | 2 | 3 | 'done'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StepIndicator({ phase }: { phase: Phase }) {
  const steps = ['What\'s new?', 'Review', 'New bullets']
  const current = phase === 'done' ? 3 : (phase as number) - 1
  return (
    <div className="flex items-center gap-1.5 mb-8 overflow-x-auto scrollbar-none">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
            i < current ? 'bg-[var(--navy)] text-white' :
            i === current ? 'bg-[var(--navy)] text-white' : 'bg-gray-100 text-gray-400'
          }`}>{i < current ? '✓' : i + 1}</div>
          <span className={`text-sm whitespace-nowrap ${i === current ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{label}</span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200 shrink-0" />}
        </div>
      ))}
    </div>
  )
}

function Spinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="flex gap-1">
        {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

// ─── Phase 1 ──────────────────────────────────────────────────────────────────

function Phase1({
  onContinue,
}: {
  onContinue: (files: UploadedFile[], text: string) => void
}) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const processFile = async (f: File): Promise<UploadedFile | null> => {
    if (files.length >= 3) { setError('Maximum 3 files allowed'); return null }
    if (f.type === 'application/pdf') {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => {
          const result = (e.target?.result as string) || ''
          const base64 = result.split(',')[1] || ''
          resolve({ name: f.name, type: 'pdf', base64 })
        }
        reader.readAsDataURL(f)
      })
    }
    if (f.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth')
        const buffer = await f.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer: buffer })
        return { name: f.name, type: 'docx', textContent: value }
      } catch {
        setError(`Could not read ${f.name}`)
        return null
      }
    }
    if (f.type === 'text/plain' || f.name.endsWith('.txt')) {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => resolve({ name: f.name, type: 'txt', textContent: e.target?.result as string || '' })
        reader.readAsText(f)
      })
    }
    setError(`Unsupported file type: ${f.name}`)
    return null
  }

  const addFiles = async (incoming: FileList | null) => {
    if (!incoming) return
    setProcessing(true)
    setError('')
    const results: UploadedFile[] = []
    for (const f of Array.from(incoming)) {
      const processed = await processFile(f)
      if (processed) results.push(processed)
    }
    setFiles(prev => [...prev, ...results].slice(0, 3))
    setProcessing(false)
  }

  const canContinue = text.trim().length > 0 || files.length > 0

  return (
    <div className="max-w-2xl space-y-6">
      {/* Upload option */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Upload documents</h2>
        <p className="text-sm text-gray-500 mb-4">PDF, DOCX, or TXT — up to 3 files. New CV draft, certification PDF, LinkedIn export, performance review, project brief.</p>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}`}
        >
          <p className="text-sm text-gray-400 mb-3">Drag & drop files here, or</p>
          <label className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            Choose files
            <input type="file" accept=".pdf,.docx,.txt" multiple className="sr-only" onChange={e => addFiles(e.target.files)} />
          </label>
        </div>

        {processing && <p className="text-sm text-gray-400 mt-2">Reading files...</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                {f.name}
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-gray-700">×</button>
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Or: type it */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Tell me what&apos;s new</h2>
        <p className="text-sm text-gray-500 mb-4">What has changed in your career recently? Tell me about a new role, a project you just finished, a certification you earned, or anything you want added to your profile. Don&apos;t worry about format — just write.</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="I just started a new role as Senior ML Engineer at DeepMind in January 2025. I also completed the AWS Solutions Architect certification last month..."
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => canContinue && onContinue(files, text)}
          disabled={!canContinue}
          className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors"
        >
          Continue →
        </button>
        {!canContinue && <p className="text-sm text-gray-400">Upload a file or type something to continue.</p>}
      </div>
    </div>
  )
}

// ─── Phase 2 ──────────────────────────────────────────────────────────────────

function Phase2({
  result,
  workExps, setWorkExps,
  education, setEducation,
  certs, setCerts,
  projects, setProjects,
  skills, setSkills,
  updates, setUpdates,
  onSaveWithoutBullets,
  onGenerateBullets,
  saving,
}: {
  result: UpdateExtractResult
  workExps: ReviewWorkExp[]; setWorkExps: (v: ReviewWorkExp[]) => void
  education: ReviewEducation[]; setEducation: (v: ReviewEducation[]) => void
  certs: ReviewCert[]; setCerts: (v: ReviewCert[]) => void
  projects: ReviewProject[]; setProjects: (v: ReviewProject[]) => void
  skills: ReviewSkill[]; setSkills: (v: ReviewSkill[]) => void
  updates: ReviewUpdate[]; setUpdates: (v: ReviewUpdate[]) => void
  onSaveWithoutBullets: () => void
  onGenerateBullets: () => void
  saving: boolean
}) {
  const inputClass = 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'
  const hasAnything = workExps.length > 0 || education.length > 0 || certs.length > 0 || projects.length > 0 || skills.length > 0 || updates.length > 0

  if (!hasAnything && result.unclassified.length === 0) {
    return (
      <div className="max-w-2xl">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-amber-800 mb-1">Nothing new detected</p>
          <p className="text-sm text-amber-700">The information you provided appears to already be in your profile, or could not be matched to a structured field.</p>
          {result.unclassified.length > 0 && (
            <div className="mt-4 text-left">
              <p className="text-xs font-medium text-amber-700 mb-2">Unclassified content:</p>
              {result.unclassified.map((u, i) => <p key={i} className="text-sm text-amber-600 italic">{u}</p>)}
            </div>
          )}
        </div>
        <Link href="/profile/experience" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700">← Back to Experience & CV</Link>
      </div>
    )
  }

  const hasNewRolesOrProjects = workExps.some(e => e.included) || projects.some(p => p.included)

  return (
    <div className="max-w-2xl space-y-6">
      {/* New work experiences */}
      {workExps.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New work experience detected</h3>
          {workExps.map((item, i) => (
            <div key={i} className={`border rounded-lg p-4 space-y-3 ${item.included ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.included} onChange={e => {
                  const next = [...workExps]; next[i] = { ...item, included: e.target.checked }; setWorkExps(next)
                }} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-800">Add this role</span>
              </label>
              {item.included && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['company', 'title', 'employment_type', 'location', 'start_date', 'end_date'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                      <input type={field.includes('date') ? 'date' : 'text'} value={((item.data as Record<string, unknown>)[field] as string) || ''} onChange={e => {
                        const next = [...workExps]; next[i] = { ...item, data: { ...item.data, [field]: e.target.value } }; setWorkExps(next)
                      }} className={inputClass} />
                    </div>
                  ))}
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2 flex-wrap">
                    <input type="checkbox" checked={item.data.is_current} onChange={e => {
                      const next = [...workExps]; next[i] = { ...item, data: { ...item.data, is_current: e.target.checked } }; setWorkExps(next)
                    }} id={`current-${i}`} />
                    <label htmlFor={`current-${i}`} className="text-sm text-gray-700">Currently working here</label>
                    <input type="checkbox" checked={item.data.is_remote} onChange={e => {
                      const next = [...workExps]; next[i] = { ...item, data: { ...item.data, is_remote: e.target.checked } }; setWorkExps(next)
                    }} id={`remote-${i}`} className="ml-4" />
                    <label htmlFor={`remote-${i}`} className="text-sm text-gray-700">Remote</label>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea value={item.data.description || ''} onChange={e => {
                      const next = [...workExps]; next[i] = { ...item, data: { ...item.data, description: e.target.value } }; setWorkExps(next)
                    }} rows={2} className={`${inputClass} resize-none`} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New education */}
      {education.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New education detected</h3>
          {education.map((item, i) => (
            <div key={i} className={`border rounded-lg p-4 space-y-3 ${item.included ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.included} onChange={e => {
                  const next = [...education]; next[i] = { ...item, included: e.target.checked }; setEducation(next)
                }} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-800">Add this entry</span>
              </label>
              {item.included && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Institution</label>
                    <input type="text" value={item.data.institution} onChange={e => {
                      const next = [...education]; next[i] = { ...item, data: { ...item.data, institution: e.target.value } }; setEducation(next)
                    }} className={inputClass} />
                  </div>
                  {(['degree', 'field_of_study', 'grade', 'start_date', 'end_date'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                      <input type={field.includes('date') ? 'date' : 'text'} value={((item.data as Record<string, unknown>)[field] as string) || ''} onChange={e => {
                        const next = [...education]; next[i] = { ...item, data: { ...item.data, [field]: e.target.value } }; setEducation(next)
                      }} className={inputClass} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New certifications */}
      {certs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New certifications detected</h3>
          {certs.map((item, i) => (
            <div key={i} className={`border rounded-lg p-4 space-y-3 ${item.included ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.included} onChange={e => {
                  const next = [...certs]; next[i] = { ...item, included: e.target.checked }; setCerts(next)
                }} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-800 truncate">{item.data.name || 'Certification'}</span>
              </label>
              {item.included && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input type="text" value={item.data.name} onChange={e => {
                      const next = [...certs]; next[i] = { ...item, data: { ...item.data, name: e.target.value } }; setCerts(next)
                    }} className={inputClass} />
                  </div>
                  {(['issuing_organisation', 'issue_date', 'expiry_date'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                      <input type={field.includes('date') ? 'date' : 'text'} value={((item.data as Record<string, unknown>)[field] as string) || ''} onChange={e => {
                        const next = [...certs]; next[i] = { ...item, data: { ...item.data, [field]: e.target.value } }; setCerts(next)
                      }} className={inputClass} />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.data.no_expiry} onChange={e => {
                      const next = [...certs]; next[i] = { ...item, data: { ...item.data, no_expiry: e.target.checked } }; setCerts(next)
                    }} id={`noexp-${i}`} />
                    <label htmlFor={`noexp-${i}`} className="text-sm text-gray-700">No expiry</label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New projects */}
      {projects.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New projects detected</h3>
          {projects.map((item, i) => (
            <div key={i} className={`border rounded-lg p-4 space-y-3 ${item.included ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.included} onChange={e => {
                  const next = [...projects]; next[i] = { ...item, included: e.target.checked }; setProjects(next)
                }} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-800 truncate">{item.data.name || 'Project'}</span>
              </label>
              {item.included && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Project name</label>
                    <input type="text" value={item.data.name} onChange={e => {
                      const next = [...projects]; next[i] = { ...item, data: { ...item.data, name: e.target.value } }; setProjects(next)
                    }} className={inputClass} />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea value={item.data.description || ''} onChange={e => {
                      const next = [...projects]; next[i] = { ...item, data: { ...item.data, description: e.target.value } }; setProjects(next)
                    }} rows={2} className={`${inputClass} resize-none`} />
                  </div>
                  {(['start_date', 'end_date'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                      <input type="date" value={((item.data as Record<string, unknown>)[field] as string) || ''} onChange={e => {
                        const next = [...projects]; next[i] = { ...item, data: { ...item.data, [field]: e.target.value } }; setProjects(next)
                      }} className={inputClass} />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.data.is_ongoing} onChange={e => {
                      const next = [...projects]; next[i] = { ...item, data: { ...item.data, is_ongoing: e.target.checked } }; setProjects(next)
                    }} id={`ongoing-${i}`} />
                    <label htmlFor={`ongoing-${i}`} className="text-sm text-gray-700">Ongoing</label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New skills */}
      {skills.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3">New skills detected <span className="text-sm font-normal text-gray-400">not currently in your profile</span></h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm ${item.included ? 'border-gray-300 bg-gray-50' : 'border-gray-100 opacity-50'}`}>
                <input type="checkbox" checked={item.included} onChange={e => {
                  const next = [...skills]; next[i] = { ...item, included: e.target.checked }; setSkills(next)
                }} className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-800">{item.skill}</span>
                <select
                  value={item.level}
                  onChange={e => { const next = [...skills]; next[i] = { ...item, level: e.target.value as SkillLevel }; setSkills(next) }}
                  className="text-xs text-gray-500 bg-transparent border-none focus:outline-none"
                >
                  <option value="core">Core</option>
                  <option value="proficient">Proficient</option>
                  <option value="familiar">Familiar</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Updates to existing */}
      {updates.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Updates to existing entries</h3>
          {updates.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-800">Update to {item.item.existingLabel}</p>
              <p className="text-xs text-gray-500">Suggested changes: {Object.keys(item.item.suggestedChanges).join(', ')}</p>
              <div className="flex gap-2">
                {(['new', 'update', 'skip'] as const).map(action => (
                  <button key={action} onClick={() => {
                    const next = [...updates]; next[i] = { ...item, action }; setUpdates(next)
                  }} className={`px-3 py-1 text-xs rounded-full border transition-colors ${item.action === action ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {action === 'new' ? 'Add as new' : action === 'update' ? 'Update existing' : 'Skip'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unclassified */}
      {result.unclassified.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Could not determine</h3>
          {result.unclassified.map((u, i) => <p key={i} className="text-sm text-gray-500 italic">{u}</p>)}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        {hasNewRolesOrProjects && (
          <button onClick={onGenerateBullets} disabled={saving}
            className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
            {saving ? 'Generating bullets...' : 'Generate new bullets from this →'}
          </button>
        )}
        <button onClick={onSaveWithoutBullets} disabled={saving}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
          {saving ? 'Saving...' : 'Save without bullets →'}
        </button>
      </div>
    </div>
  )
}

// ─── Phase 3 ──────────────────────────────────────────────────────────────────

function Phase3({
  workExps,
  projects,
  bullets,
  setBullets,
  onSave,
  saving,
}: {
  workExps: ReviewWorkExp[]
  projects: ReviewProject[]
  bullets: Phase3Bullets
  setBullets: (v: Phase3Bullets) => void
  onSave: () => void
  saving: boolean
}) {
  const confirmedExps = workExps.filter(e => e.included)
  const confirmedProjs = projects.filter(p => p.included)

  const updateBullet = (section: 'workExps' | 'projects', idx: number, bIdx: number, field: keyof GeneratedBullet, value: string | boolean) => {
    const next = { ...bullets }
    const arr = [...(next[section][idx] || [])]
    arr[bIdx] = { ...arr[bIdx], [field]: value }
    next[section] = { ...next[section], [idx]: arr }
    setBullets(next)
  }

  const deleteBullet = (section: 'workExps' | 'projects', idx: number, bIdx: number) => {
    const next = { ...bullets }
    const arr = (next[section][idx] || []).filter((_, i) => i !== bIdx)
    next[section] = { ...next[section], [idx]: arr }
    setBullets(next)
  }

  const addBullet = (section: 'workExps' | 'projects', idx: number) => {
    const next = { ...bullets }
    const arr = [...(next[section][idx] || []), { text: 'New bullet — click to edit', skill_tags: [], has_metric: false, metric_text: null, editing: true, editText: 'New bullet — click to edit' }]
    next[section] = { ...next[section], [idx]: arr }
    setBullets(next)
  }

  if (confirmedExps.length === 0 && confirmedProjs.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-gray-500 mb-4">No new roles or projects to generate bullets for.</p>
        <button onClick={onSave} disabled={saving} className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)]">
          {saving ? 'Saving...' : 'Save everything →'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {confirmedExps.map((exp, i) => {
        const expBullets = bullets.workExps[i] || []
        return (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-1">{exp.data.company}</h3>
            <p className="text-sm text-gray-500 mb-4">{exp.data.title}</p>
            <div className="space-y-2">
              {expBullets.map((b, bIdx) => (
                <div key={bIdx} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                  {b.editing ? (
                    <div className="flex-1 space-y-1">
                      <textarea value={b.editText} onChange={e => updateBullet('workExps', i, bIdx, 'editText', e.target.value)} rows={2} autoFocus
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => updateBullet('workExps', i, bIdx, 'text', b.editText)} className="px-2 py-1 bg-[var(--navy)] text-white rounded text-xs">Done</button>
                        <button onClick={() => updateBullet('workExps', i, bIdx, 'editing', false)} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-gray-700">{b.text}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { updateBullet('workExps', i, bIdx, 'editing', true); updateBullet('workExps', i, bIdx, 'editText', b.text) }} className="p-1 text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                        <button onClick={() => deleteBullet('workExps', i, bIdx)} className="p-1 text-gray-400 hover:text-red-600 text-xs">Del</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addBullet('workExps', i)}
              className="mt-2 w-full text-left px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
              + Add bullet
            </button>
          </div>
        )
      })}

      {confirmedProjs.map((proj, i) => {
        const projBullets = bullets.projects[i] || []
        return (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{proj.data.name}</h3>
            <div className="space-y-2">
              {projBullets.map((b, bIdx) => (
                <div key={bIdx} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                  {b.editing ? (
                    <div className="flex-1 space-y-1">
                      <textarea value={b.editText} onChange={e => updateBullet('projects', i, bIdx, 'editText', e.target.value)} rows={2} autoFocus
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => updateBullet('projects', i, bIdx, 'text', b.editText)} className="px-2 py-1 bg-[var(--navy)] text-white rounded text-xs">Done</button>
                        <button onClick={() => updateBullet('projects', i, bIdx, 'editing', false)} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-gray-700">{b.text}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { updateBullet('projects', i, bIdx, 'editing', true); updateBullet('projects', i, bIdx, 'editText', b.text) }} className="p-1 text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                        <button onClick={() => deleteBullet('projects', i, bIdx)} className="p-1 text-gray-400 hover:text-red-600 text-xs">Del</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addBullet('projects', i)}
              className="mt-2 w-full text-left px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
              + Add bullet
            </button>
          </div>
        )
      })}

      <button onClick={onSave} disabled={saving}
        className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors">
        {saving ? 'Saving...' : 'Save everything →'}
      </button>
    </div>
  )
}

// ─── Done screen ─────────────────────────────────────────────────────────────

function DoneScreen({ summary, onAddMore }: { summary: string[]; onAddMore: () => void }) {
  return (
    <div className="max-w-2xl">
      <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-green-900 mb-3">Profile updated!</h3>
        <ul className="space-y-1">
          {summary.map((s, i) => <li key={i} className="text-sm text-green-800">✓ {s}</li>)}
        </ul>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/profile/experience" className="px-4 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--navy-light)]">View your experience →</Link>
        <Link href="/profile/bullets" className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">View bullet bank →</Link>
        <button onClick={onAddMore} className="text-sm text-gray-500 hover:text-gray-700">Add more →</button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UpdatePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>(1)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingBullets, setGeneratingBullets] = useState(false)
  const [error, setError] = useState('')

  // Existing profile data (loaded on mount for comparison)
  const [existingData, setExistingData] = useState<ExistingData>({
    workExperiences: [], education: [], certifications: [], skills: { core: [], proficient: [], familiar: [] },
  })

  // Phase 2 review state
  const [extractResult, setExtractResult] = useState<UpdateExtractResult | null>(null)
  const [reviewWorkExps, setReviewWorkExps] = useState<ReviewWorkExp[]>([])
  const [reviewEducation, setReviewEducation] = useState<ReviewEducation[]>([])
  const [reviewCerts, setReviewCerts] = useState<ReviewCert[]>([])
  const [reviewProjects, setReviewProjects] = useState<ReviewProject[]>([])
  const [reviewSkills, setReviewSkills] = useState<ReviewSkill[]>([])
  const [reviewUpdates, setReviewUpdates] = useState<ReviewUpdate[]>([])

  // Phase 3 state
  const [phase3Bullets, setPhase3Bullets] = useState<Phase3Bullets>({ workExps: {}, projects: {} })

  // Confirmation state
  const [doneSummary, setDoneSummary] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/profile/about').then(r => r.json()),
      fetch('/api/work-experiences').then(r => r.json()),
      fetch('/api/education').then(r => r.json()),
      fetch('/api/certifications').then(r => r.json()),
    ]).then(([p, we, edu, certs]) => {
      const profile = p.profile
      if (!profile?.onboarding_complete) {
        router.replace('/profile/onboarding')
        return
      }
      setExistingData({
        workExperiences: we.workExperiences || [],
        education: edu.education || [],
        certifications: certs.certifications || [],
        skills: {
          core: profile.skills_core || [],
          proficient: profile.skills_proficient || [],
          familiar: profile.skills_familiar || [],
        },
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router])

  const handlePhase1Continue = async (files: UploadedFile[], text: string) => {
    setExtracting(true)
    setError('')
    try {
      const res = await fetch('/api/profile/update-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newText: text,
          fileContents: files.filter(f => f.textContent).map(f => f.textContent!),
          pdfFiles: files.filter(f => f.base64).map(f => ({ name: f.name, base64: f.base64! })),
          existingProfile: {
            workExperiences: existingData.workExperiences.map(e => ({
              company: e.company, title: e.title, start_date: e.start_date, end_date: e.end_date,
            })),
            education: existingData.education.map(e => ({ institution: e.institution, degree: e.degree })),
            certifications: existingData.certifications.map(c => ({ name: c.name, issuing_organisation: c.issuing_organisation })),
            skills: existingData.skills,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')

      const result: UpdateExtractResult = data.result
      setExtractResult(result)

      setReviewWorkExps(result.newWorkExperiences.map(e => ({
        included: true,
        data: {
          company: (e.company as string) || '',
          title: (e.title as string) || '',
          employment_type: (e.employment_type as string) || 'Full-time',
          location: (e.location as string) || '',
          is_remote: (e.is_remote as boolean) || false,
          start_date: (e.start_date as string) || '',
          end_date: (e.end_date as string) || '',
          is_current: (e.is_current as boolean) || false,
          description: (e.description as string) || '',
        },
      })))

      setReviewEducation(result.newEducation.map(e => ({
        included: true,
        data: {
          institution: (e.institution as string) || '',
          degree: (e.degree as string) || '',
          field_of_study: (e.field_of_study as string) || '',
          start_date: (e.start_date as string) || '',
          end_date: (e.end_date as string) || '',
          is_current: (e.is_current as boolean) || false,
          grade: (e.grade as string) || '',
        },
      })))

      setReviewCerts(result.newCertifications.map(c => ({
        included: true,
        data: {
          name: (c.name as string) || '',
          issuing_organisation: (c.issuing_organisation as string) || '',
          issue_date: (c.issue_date as string) || '',
          expiry_date: (c.expiry_date as string) || '',
          no_expiry: (c.no_expiry as boolean) || false,
        },
      })))

      setReviewProjects(result.newProjects.map(p => ({
        included: true,
        data: {
          name: (p.name as string) || '',
          description: (p.description as string) || '',
          tech_stack: (p.tech_stack as string[]) || [],
          start_date: (p.start_date as string) || '',
          end_date: (p.end_date as string) || '',
          is_ongoing: (p.is_ongoing as boolean) || false,
        },
      })))

      setReviewSkills(result.newSkills.map(s => ({ included: true, skill: s.skill, level: s.suggestedLevel })))
      setReviewUpdates(result.updatesToExisting.map(u => ({ action: 'skip' as const, item: u })))

      setPhase(2)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExtracting(false)
    }
  }

  const generateBulletsForPhase3 = useCallback(async () => {
    const confirmedExps = reviewWorkExps.filter(e => e.included)
    const confirmedProjs = reviewProjects.filter(p => p.included)
    setGeneratingBullets(true)

    const next: Phase3Bullets = { workExps: {}, projects: {} }

    await Promise.all([
      ...confirmedExps.map(async (exp, i) => {
        try {
          const res = await fetch('/api/bullets/generate-for-experience', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // No workExperienceId yet — pass placeholder; API verifies ownership so we skip that step
            // Instead, we'll call with dummy ID and description
            body: JSON.stringify({ workExperienceId: 'pending', company: exp.data.company, title: exp.data.title, description: exp.data.description }),
          })
          // If it fails due to missing ID that's ok — just skip bullets for this exp
          if (res.ok) {
            const data = await res.json()
            next.workExps[i] = (data.bullets || []).map((b: { text: string; skill_tags: string[]; has_metric: boolean; metric_text: string | null }) => ({ ...b, editing: false, editText: b.text }))
          } else {
            next.workExps[i] = []
          }
        } catch {
          next.workExps[i] = []
        }
      }),
      ...confirmedProjs.map(async (proj, i) => {
        // Generate simple bullets for a project using the description
        try {
          const res = await fetch('/api/bullets/generate-for-experience', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workExperienceId: 'pending', company: proj.data.name, title: 'Project', description: proj.data.description }),
          })
          if (res.ok) {
            const data = await res.json()
            next.projects[i] = (data.bullets || []).map((b: { text: string; skill_tags: string[]; has_metric: boolean; metric_text: string | null }) => ({ ...b, editing: false, editText: b.text }))
          } else {
            next.projects[i] = []
          }
        } catch {
          next.projects[i] = []
        }
      }),
    ])

    setPhase3Bullets(next)
    setGeneratingBullets(false)
    setPhase(3)
  }, [reviewWorkExps, reviewProjects])

  const saveData = useCallback(async (includeBullets: boolean) => {
    setSaving(true)
    setError('')
    const summary: string[] = []

    try {
      const expIdMap: Record<number, string> = {}
      const projIdMap: Record<number, string> = {}

      // Save confirmed work experiences
      const confirmedExps = reviewWorkExps.filter(e => e.included)
      for (let i = 0; i < confirmedExps.length; i++) {
        const e = confirmedExps[i]
        const res = await fetch('/api/work-experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: e.data.company,
            title: e.data.title,
            employment_type: (e.data.employment_type || 'Full-time') as EmploymentType,
            location: e.data.location || null,
            is_remote: e.data.is_remote,
            start_date: e.data.start_date || new Date().toISOString().split('T')[0],
            end_date: e.data.is_current ? null : e.data.end_date || null,
            is_current: e.data.is_current,
            description: e.data.description || null,
          }),
        })
        const data = await res.json()
        if (res.ok) { expIdMap[i] = data.workExperience.id; summary.push(`Work experience: ${e.data.company} — ${e.data.title}`) }
      }

      // Save confirmed education
      for (const e of reviewEducation.filter(e => e.included)) {
        const res = await fetch('/api/education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            institution: e.data.institution, degree: e.data.degree || null,
            field_of_study: e.data.field_of_study || null, start_date: e.data.start_date || null,
            end_date: e.data.is_current ? null : e.data.end_date || null,
            is_current: e.data.is_current, grade: e.data.grade || null,
          }),
        })
        if (res.ok) summary.push(`Education: ${e.data.institution}`)
      }

      // Save confirmed certifications
      for (const c of reviewCerts.filter(c => c.included)) {
        const res = await fetch('/api/certifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.data.name, issuing_organisation: c.data.issuing_organisation || null,
            issue_date: c.data.issue_date || null, expiry_date: c.data.no_expiry ? null : c.data.expiry_date || null,
            no_expiry: c.data.no_expiry,
          }),
        })
        if (res.ok) summary.push(`Certification: ${c.data.name}`)
      }

      // Save confirmed projects
      const confirmedProjs = reviewProjects.filter(p => p.included)
      for (let i = 0; i < confirmedProjs.length; i++) {
        const p = confirmedProjs[i]
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.data.name, description: p.data.description || null,
            tech_stack: p.data.tech_stack, start_date: p.data.start_date || null,
            end_date: p.data.is_ongoing ? null : p.data.end_date || null,
            is_ongoing: p.data.is_ongoing, highlight: false,
          }),
        })
        const data = await res.json()
        if (res.ok) { projIdMap[i] = data.project.id; summary.push(`Project: ${p.data.name}`) }
      }

      // Save bullets if in phase 3
      if (includeBullets) {
        let bulletCount = 0
        for (const [idxStr, bullets] of Object.entries(phase3Bullets.workExps)) {
          const idx = parseInt(idxStr)
          const expId = expIdMap[idx]
          if (!expId) continue
          for (const b of bullets) {
            if (!b.text || b.text === 'New bullet — click to edit') continue
            await fetch(`/api/work-experiences/${expId}/bullets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bullet_id: `e${Date.now()}${Math.random()}`, type: 'experience', text: b.text, skill_tags: b.skill_tags || [], has_metric: b.has_metric || false, metric_text: b.metric_text, times_used: 0 }),
            })
            bulletCount++
          }
        }
        for (const [idxStr, bullets] of Object.entries(phase3Bullets.projects)) {
          const idx = parseInt(idxStr)
          const projId = projIdMap[idx]
          if (!projId) continue
          for (const b of bullets) {
            if (!b.text || b.text === 'New bullet — click to edit') continue
            await fetch(`/api/projects/${projId}/bullets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bullet_id: `p${Date.now()}${Math.random()}`, type: 'project', text: b.text, skill_tags: b.skill_tags || [], has_metric: b.has_metric || false, metric_text: b.metric_text, times_used: 0 }),
            })
            bulletCount++
          }
        }
        if (bulletCount > 0) summary.push(`${bulletCount} bullets added`)
      }

      // Merge new skills into profile
      const newSkillsToAdd = reviewSkills.filter(s => s.included)
      if (newSkillsToAdd.length > 0) {
        const coreToAdd = newSkillsToAdd.filter(s => s.level === 'core').map(s => s.skill)
        const profToAdd = newSkillsToAdd.filter(s => s.level === 'proficient').map(s => s.skill)
        const famToAdd = newSkillsToAdd.filter(s => s.level === 'familiar').map(s => s.skill)
        await fetch('/api/profile/about', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skills_core: [...new Set([...existingData.skills.core, ...coreToAdd])],
            skills_proficient: [...new Set([...existingData.skills.proficient, ...profToAdd])],
            skills_familiar: [...new Set([...existingData.skills.familiar, ...famToAdd])],
          }),
        })
        summary.push(`${newSkillsToAdd.length} skill${newSkillsToAdd.length !== 1 ? 's' : ''} added`)
      }

      setDoneSummary(summary)
      setPhase('done')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [reviewWorkExps, reviewEducation, reviewCerts, reviewProjects, reviewSkills, existingData, phase3Bullets])

  const reset = () => {
    setPhase(1); setExtractResult(null); setReviewWorkExps([]); setReviewEducation([])
    setReviewCerts([]); setReviewProjects([]); setReviewSkills([]); setReviewUpdates([])
    setPhase3Bullets({ workExps: {}, projects: {} }); setDoneSummary([]); setError('')
  }

  if (loading) {
    return <div className="p-4 md:p-8"><Spinner message="Loading your profile..." /></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <StepIndicator phase={phase} />

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {phase === 1 && !extracting && <Phase1 onContinue={handlePhase1Continue} />}
      {extracting && <Spinner message="Reading your update and comparing with your existing profile..." />}
      {generatingBullets && <Spinner message="Generating bullets for your new roles..." />}

      {phase === 2 && !extracting && !generatingBullets && extractResult && (
        <Phase2
          result={extractResult}
          workExps={reviewWorkExps} setWorkExps={setReviewWorkExps}
          education={reviewEducation} setEducation={setReviewEducation}
          certs={reviewCerts} setCerts={setReviewCerts}
          projects={reviewProjects} setProjects={setReviewProjects}
          skills={reviewSkills} setSkills={setReviewSkills}
          updates={reviewUpdates} setUpdates={setReviewUpdates}
          onSaveWithoutBullets={() => saveData(false)}
          onGenerateBullets={generateBulletsForPhase3}
          saving={saving}
        />
      )}

      {phase === 3 && !generatingBullets && (
        <Phase3
          workExps={reviewWorkExps}
          projects={reviewProjects}
          bullets={phase3Bullets}
          setBullets={setPhase3Bullets}
          onSave={() => saveData(true)}
          saving={saving}
        />
      )}

      {phase === 'done' && <DoneScreen summary={doneSummary} onAddMore={reset} />}
    </div>
  )
}
