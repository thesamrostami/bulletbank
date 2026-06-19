'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { IntakeQuestion, CVSnapshot, WorkExperience, BulletBank } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('Could not read file'))
    r.readAsText(file)
  })
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = () => rej(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

function Spinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      {message && <p className="text-sm text-gray-500">{message}</p>}
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2.5 h-2.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Phase 1: Upload ──────────────────────────────────────────────────────────

interface FileState {
  file: File
  content?: string
  base64?: string
}

function parseTitleCompany(raw: string): { title: string; company: string } {
  const idx = raw.indexOf(' at ')
  if (idx !== -1) return { title: raw.slice(0, idx).trim(), company: raw.slice(idx + 4).trim() }
  return { title: raw.trim(), company: '' }
}

function ScratchForm({ onComplete }: { onComplete: (extracted: Partial<CVSnapshot> | null) => void }) {
  const [roleField, setRoleField] = useState('')
  const [workField, setWorkField] = useState('')
  const [proudField, setProudField] = useState('')

  const handleContinue = () => {
    const { title, company } = parseTitleCompany(roleField)
    const description = [workField.trim(), proudField.trim()].filter(Boolean).join('\n')
    const currentYear = new Date().getFullYear()
    const workExperience = {
      title,
      company,
      description,
      is_current: true,
      start_date: `${currentYear}-01`,
      end_date: null,
    } as WorkExperience
    const extracted: Partial<CVSnapshot> = {
      workExperiences: [{ ...workExperience, bullets: [] as BulletBank[] }],
    }
    onComplete(extracted)
  }

  const canContinue = roleField.trim().length > 0

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tell us about your most recent role</h2>
        <p className="text-gray-500">Just write in plain English — we&apos;ll turn it into a structured profile in the next step.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Job title and company</label>
          <input
            type="text"
            value={roleField}
            onChange={e => setRoleField(e.target.value)}
            placeholder="e.g. Product Manager at Acme Ltd"
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">What did you work on?</label>
          <textarea
            value={workField}
            onChange={e => setWorkField(e.target.value)}
            rows={3}
            placeholder="Describe your main responsibilities and projects in plain English — don't worry about making it sound professional"
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">What are you most proud of?</label>
          <textarea
            value={proudField}
            onChange={e => setProudField(e.target.value)}
            rows={3}
            placeholder="Any results, improvements, or things you delivered — numbers are great if you have them"
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors disabled:opacity-40"
        >
          Build my profile →
        </button>
      </div>
    </>
  )
}

// ─── LinkedIn import form ─────────────────────────────────────────────────────

function LinkedInForm({ onComplete }: { onComplete: (extracted: Partial<CVSnapshot> | null) => void }) {
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleProcess = async () => {
    if (!zipFile) return
    setProcessing(true)
    setError('')
    try {
      const JSZip = (await import('jszip')).default
      const Papa = (await import('papaparse')).default

      const ab = await zipFile.arrayBuffer()
      const zip = await JSZip.loadAsync(ab)

      const readCsv = async (name: string): Promise<Record<string, string>[]> => {
        const file = zip.file(name) || zip.file(`${name}`) || zip.file(new RegExp(name.replace('.', '\\.'), 'i'))[0]
        if (!file) return []
        const text = await file.async('text')
        const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
        return result.data
      }

      const [positions, education, skills, certifications, profile] = await Promise.all([
        readCsv('Positions.csv'),
        readCsv('Education.csv'),
        readCsv('Certifications.csv'),
        readCsv('Skills.csv'),
        readCsv('Profile.csv'),
      ])

      const lines: string[] = []

      if (profile.length > 0) {
        const p = profile[0]
        const name = [p['First Name'], p['Last Name']].filter(Boolean).join(' ')
        if (name) lines.push(`Name: ${name}`)
        if (p['Headline']) lines.push(`Headline: ${p['Headline']}`)
        if (p['Summary']) lines.push(`\nSummary:\n${p['Summary']}`)
      }

      if (positions.length > 0) {
        lines.push('\nWork Experience:')
        for (const pos of positions) {
          const title = pos['Title'] || pos['Position'] || ''
          const company = pos['Company Name'] || pos['Company'] || ''
          const startDate = pos['Started On'] || pos['Start Date'] || ''
          const endDate = pos['Finished On'] || pos['End Date'] || 'Present'
          const description = pos['Description'] || ''
          lines.push(`\n${title} at ${company} (${startDate} – ${endDate})`)
          if (description) lines.push(description.slice(0, 1000))
        }
      }

      if (education.length > 0) {
        lines.push('\nEducation:')
        for (const edu of education) {
          const school = edu['School Name'] || edu['School'] || ''
          const degree = edu['Degree Name'] || edu['Degree'] || ''
          const field = edu['Field Of Study'] || edu['Field'] || ''
          const startDate = edu['Start Date'] || ''
          const endDate = edu['End Date'] || ''
          lines.push(`${school}${degree ? `, ${degree}` : ''}${field ? ` in ${field}` : ''} (${startDate}–${endDate})`)
        }
      }

      if (certifications.length > 0) {
        lines.push('\nCertifications:')
        for (const cert of certifications) {
          const name = cert['Name'] || cert['Certification Name'] || ''
          const authority = cert['Authority'] || cert['Issuing Organization'] || ''
          if (name) lines.push(`${name}${authority ? ` (${authority})` : ''}`)
        }
      }

      if (skills.length > 0) {
        const skillNames = skills.map(s => s['Name'] || s['Skill Name'] || '').filter(Boolean)
        if (skillNames.length > 0) lines.push(`\nSkills: ${skillNames.join(', ')}`)
      }

      const combinedText = lines.join('\n').trim()
      if (!combinedText) {
        setError('Could not extract data from this ZIP. Make sure it is a LinkedIn data export.')
        setProcessing(false)
        return
      }

      const res = await fetch('/api/profile/extract-from-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContents: [combinedText], pdfFiles: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      onComplete(data.extracted)
    } catch (err) {
      setError((err as Error).message || 'Could not process the ZIP file.')
    }
    setProcessing(false)
  }

  if (processing) return <Spinner message="Reading your LinkedIn export and extracting profile data…" />

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Import from LinkedIn</h2>
        <p className="text-gray-500 text-sm">
          Download your LinkedIn data export and upload it here. We&apos;ll extract your work history, education, and skills automatically.
        </p>
        <a
          href="https://www.linkedin.com/mypreferences/d/download-my-data"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-[var(--accent)] underline underline-offset-2"
        >
          How to download your LinkedIn data →
        </a>
      </div>

      {/* ZIP dropzone */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f && f.name.endsWith('.zip')) setZipFile(f)
          else setError('Please upload a .zip file from LinkedIn data export.')
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) setZipFile(f)
          }}
        />
        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
          <path d="M12 4v12M8 12l4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-gray-600 font-medium text-sm">Drop your LinkedIn export ZIP here</p>
        <p className="text-xs text-gray-400 mt-0.5">Usually named <span className="font-mono">Basic_LinkedInDataExport_*.zip</span></p>
      </div>

      {zipFile && (
        <div className="mt-3 flex items-center justify-between px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-gray-700">{zipFile.name}</span>
          <button onClick={() => setZipFile(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="mt-5">
        <button
          onClick={handleProcess}
          disabled={!zipFile}
          className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors disabled:opacity-40"
        >
          Import LinkedIn data →
        </button>
      </div>
    </>
  )
}

function Phase1({
  onComplete,
}: {
  onComplete: (extracted: Partial<CVSnapshot> | null) => void
}) {
  const [tab, setTab] = useState<'upload' | 'scratch' | 'linkedin'>('upload')
  const [files, setFiles] = useState<FileState[]>([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File): Promise<FileState | null> => {
    const ext = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) return null
    if (ext === 'txt') {
      const content = await readAsText(file)
      return { file, content }
    }
    if (ext === 'pdf') {
      const base64 = await readAsBase64(file)
      return { file, base64 }
    }
    try {
      const mammoth = await import('mammoth')
      const ab = await file.arrayBuffer()
      const { value } = await mammoth.extractRawText({ arrayBuffer: ab })
      return { file, content: value }
    } catch {
      return { file, content: `[Could not extract text from ${file.name}]` }
    }
  }, [])

  const addFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return
    const toAdd = Array.from(newFiles).slice(0, 3 - files.length)
    const processed = await Promise.all(toAdd.map(processFile))
    setFiles(prev => [...prev, ...processed.filter(Boolean) as FileState[]])
  }, [files.length, processFile])

  const handleContinue = async () => {
    if (files.length === 0) {
      onComplete(null)
      return
    }
    setProcessing(true)
    setError('')
    try {
      const textContents = files.filter(f => f.content).map(f => f.content!)
      const pdfFiles = files.filter(f => f.base64).map(f => ({ name: f.file.name, base64: f.base64! }))
      const res = await fetch('/api/profile/extract-from-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContents, pdfFiles }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      onComplete(data.extracted)
    } catch (err) {
      setError((err as Error).message)
    }
    setProcessing(false)
  }

  if (processing) return <Spinner message="Reading your documents and extracting CV data..." />

  return (
    <div className="max-w-xl mx-auto">
      {/* Tab toggle */}
      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl mb-8">
        <button
          onClick={() => setTab('upload')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'upload'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload CV
        </button>
        <button
          onClick={() => setTab('linkedin')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'linkedin'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          LinkedIn
        </button>
        <button
          onClick={() => setTab('scratch')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'scratch'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          From scratch
        </button>
      </div>

      {tab === 'scratch' ? (
        <ScratchForm onComplete={onComplete} />
      ) : tab === 'linkedin' ? (
        <LinkedInForm onComplete={onComplete} />
      ) : (
        <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload your documents</h2>
            <p className="text-gray-500">Upload your existing CV, a portfolio, or any career document. We&apos;ll extract everything we can automatically.</p>
          </div>

          {/* Dropzone */}
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={async e => {
              e.preventDefault()
              setDragging(false)
              await addFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 40 40">
              <path d="M20 8v16M13 15l7-7 7 7M8 30h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-gray-600 font-medium">Drop files here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT · Max 3 files</p>
          </div>

          {/* Attached files */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 16 16">
                      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm text-gray-700">{f.file.name}</span>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-700">×</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
            >
              {files.length > 0 ? 'Extract & continue →' : 'Continue →'}
            </button>
            {files.length > 0 && (
              <button onClick={() => onComplete(null)} className="text-sm text-gray-400 hover:text-gray-600 text-center">
                Skip — I&apos;ll fill in manually →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Phase 2: Questions ───────────────────────────────────────────────────────

function TagInput({
  value,
  onChange,
  inputValue,
  onInputChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
  inputValue: string
  onInputChange: (v: string) => void
}) {
  const commitInput = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const entries = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    onChange([...value, ...entries])
    onInputChange('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--navy)] text-white rounded-full text-sm">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-gray-300 hover:text-white leading-none ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commitInput(inputValue)
            }
          }}
          placeholder={value.length === 0 ? 'Type a role and tap Add →' : 'Add another…'}
          className="w-full px-3 py-3 pr-20 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => commitInput(inputValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--navy)] text-white text-xs font-medium rounded-lg hover:bg-[var(--navy-light)] transition-colors"
          >
            Add
          </button>
        )}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-gray-400 mt-1.5">
          Type a role and tap <span className="font-medium text-gray-600">Add</span> or press Enter.
        </p>
      )}
      {value.length > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">{value.length} added · tap × to remove one</p>
      )}
    </div>
  )
}

function Phase2({
  extracted,
  onComplete,
}: {
  extracted: Partial<CVSnapshot> | null
  onComplete: (answers: Array<{ field: string; question: string; answer: string }>) => void
}) {
  const [questions, setQuestions] = useState<IntakeQuestion[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [tagInputValues, setTagInputValues] = useState<Record<string, string>>({})
  const [prefillSet, setPrefillSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!questions) return
    const q = questions[currentIndex]
    if ((q.type === 'text' || q.type === 'textarea') && q.placeholder && !answers[q.id]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(a => ({ ...a, [q.id]: q.placeholder! }))
      setPrefillSet(prev => new Set([...prev, q.id]))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setAnswers and setPrefillSet are stable state setters; prefillSet intentionally omitted to avoid clearing user edits on re-render
  }, [currentIndex, questions])

  useEffect(() => {
    fetch('/api/profile/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractedData: extracted || {} }),
    })
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || [])
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return <Spinner message="Generating personalised questions for you..." />
  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!questions || questions.length === 0) {
    onComplete([])
    return null
  }

  const q = questions[currentIndex]
  const total = questions.length
  const answer = answers[q.id]

  const submitAnswers = () => {
    const result = questions!.map(q => ({
      field: q.field,
      question: q.question,
      answer: Array.isArray(answers[q.id])
        ? (answers[q.id] as string[]).join(', ')
        : (answers[q.id] as string) || '',
    }))
    onComplete(result)
  }

  const next = () => {
    if (q.type === 'tags') {
      const pending = tagInputValues[q.id]?.trim()
      if (pending) {
        const entries = pending.split(',').map(s => s.trim()).filter(Boolean)
        const current = (answers[q.id] as string[]) || []
        setAnswers(a => ({ ...a, [q.id]: [...current, ...entries] }))
        setTagInputValues(prev => ({ ...prev, [q.id]: '' }))
        setTimeout(() => {
          if (currentIndex < total - 1) {
            setCurrentIndex(i => i + 1)
          } else {
            submitAnswers()
          }
        }, 50)
        return
      }
    }

    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      submitAnswers()
    }
  }

  const canContinue = !q.required || (
    Array.isArray(answer)
      ? answer.length > 0 || Boolean(tagInputValues[q.id]?.trim())
      : Boolean(answer?.toString().trim())
  )

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Question {currentIndex + 1} of {total}</span>
          <span className="text-sm text-gray-400">{Math.round(((currentIndex + 1) / total) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{q.question}</h2>

        {q.type === 'text' && (
          <input
            type="text"
            value={(answer as string) || ''}
            onChange={e => {
              setAnswers(a => ({ ...a, [q.id]: e.target.value }))
              setPrefillSet(prev => { const n = new Set(prev); n.delete(q.id); return n })
            }}
            onFocus={e => e.target.select()}
            autoFocus
            className={`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors ${
              prefillSet.has(q.id) ? 'text-gray-400 italic' : 'text-gray-900'
            }`}
          />
        )}

        {q.type === 'textarea' && (
          <div>
            <textarea
              value={(answer as string) || ''}
              onChange={e => {
                setAnswers(a => ({ ...a, [q.id]: e.target.value }))
                setPrefillSet(prev => { const n = new Set(prev); n.delete(q.id); return n })
              }}
              onFocus={e => e.target.select()}
              rows={4}
              autoFocus
              className={`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none transition-colors ${
                prefillSet.has(q.id) ? 'text-gray-400 italic' : 'text-gray-900'
              }`}
            />
            {prefillSet.has(q.id) && (
              <p className="text-xs text-gray-400 mt-1.5">
                This is an example — edit it to match your own experience, or clear it and write your own.
              </p>
            )}
          </div>
        )}

        {q.type === 'tags' && (
          <TagInput
            value={(answer as string[]) || []}
            onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
            inputValue={tagInputValues[q.id] || ''}
            onInputChange={v => setTagInputValues(prev => ({ ...prev, [q.id]: v }))}
          />
        )}

        {q.type === 'select' && q.options && (
          <div>
            <p className="text-xs text-gray-400 mb-3">Select all that apply</p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map(opt => {
                const selected = Array.isArray(answer)
                  ? (answer as string[]).includes(opt)
                  : answer === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const current: string[] = Array.isArray(answer)
                        ? [...(answer as string[])]
                        : answer ? [answer as string] : []
                      const next = current.includes(opt)
                        ? current.filter(v => v !== opt)
                        : [...current, opt]
                      setAnswers(a => ({ ...a, [q.id]: next }))
                    }}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors text-left flex items-center gap-2 ${
                      selected
                        ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                        : 'bg-white text-gray-700 border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? 'border-white bg-white' : 'border-gray-400'
                    }`}>
                      {selected && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
            {Array.isArray(answer) && (answer as string[]).length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                {(answer as string[]).length} selected · tap any to deselect
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {currentIndex > 0 && (
          <button onClick={() => setCurrentIndex(i => i - 1)} className="px-4 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl text-sm hover:bg-[var(--surface)] transition-colors">
            ← Back
          </button>
        )}
        <button
          onClick={next}
          disabled={!canContinue}
          className="flex-1 py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--navy-light)] transition-colors"
        >
          {currentIndex < total - 1 ? 'Next →' : 'Generate my profile →'}
        </button>
      </div>
    </div>
  )
}

// ─── Phase 3: Preview ─────────────────────────────────────────────────────────

interface ProcessedData {
  profile: Record<string, unknown>
  workExperiences: Array<WorkExperience & { bullets: BulletBank[] }>
  education: Array<Record<string, unknown>>
  certifications: Array<Record<string, unknown>>
  projects: Array<Record<string, unknown>>
  summaryBullets: BulletBank[]
  highlightBullets: BulletBank[]
}

function Phase3({
  processed,
  onSave,
}: {
  processed: ProcessedData
  onSave: () => void
}) {
  const p = processed.profile as {
    full_name?: string
    positioning_headline?: string
    bio?: string
    skills_core?: string[]
    skills_proficient?: string[]
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your profile preview</h2>
        <p className="text-gray-500">Here&apos;s what we generated from your information. You can refine everything in detail after saving.</p>
      </div>

      {/* CV Preview */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-8 space-y-6 mb-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{p.full_name || 'Your Name'}</h1>
          {p.positioning_headline && <p className="text-gray-600 mt-1">{p.positioning_headline}</p>}
        </div>

        {/* Summary */}
        {p.bio && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Professional Summary</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{p.bio}</p>
          </div>
        )}

        {/* Work experience */}
        {processed.workExperiences && processed.workExperiences.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Experience</h3>
            <div className="space-y-4">
              {processed.workExperiences.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{exp.title}</span>
                      <span className="text-sm text-gray-600"> · {exp.company}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {exp.start_date?.slice(0, 7)} — {exp.is_current ? 'Present' : exp.end_date?.slice(0, 7)}
                    </span>
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.slice(0, 3).map((b, j) => (
                        <li key={j} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-gray-400 shrink-0">•</span>
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {processed.education && processed.education.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Education</h3>
            {processed.education.map((edu, i) => {
              const e = edu as { institution: string; degree?: string; field_of_study?: string }
              return (
                <div key={i} className="text-sm text-gray-700">
                  {e.institution} {e.degree && `· ${e.degree}`} {e.field_of_study && `· ${e.field_of_study}`}
                </div>
              )
            })}
          </div>
        )}

        {/* Skills */}
        {p.skills_core && p.skills_core.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Core Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {p.skills_core.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-6">
        <p className="text-sm font-medium text-amber-900 mb-3">Before saving, check:</p>
        <div className="space-y-2">
          {['Work experience dates look correct', 'Job titles and companies are accurate', 'Skills are grouped correctly', 'Bullet points represent your real achievements'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-amber-800">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
      >
        Save and go to my profile →
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Phase = 'upload' | 'questions' | 'processing' | 'preview' | 'saving'

export default function OnboardingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('upload')
  const [extracted, setExtracted] = useState<Partial<CVSnapshot> | null>(null)
  const [processed, setProcessed] = useState<ProcessedData | null>(null)
  const [error, setError] = useState('')

  const handlePhase1Complete = (data: Partial<CVSnapshot> | null) => {
    setExtracted(data)
    setPhase('questions')
  }

  const handlePhase2Complete = async (answers: Array<{ field: string; question: string; answer: string }>) => {
    setPhase('processing')
    setError('')
    try {
      const res = await fetch('/api/profile/process-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: extracted || {}, questionAnswers: answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Processing failed')
      setProcessed(data.processed)
      setPhase('preview')
    } catch (err) {
      setError((err as Error).message)
      setPhase('questions')
    }
  }

  const handleSave = async () => {
    if (!processed) return
    setPhase('saving')
    setError('')
    try {
      const { profile, workExperiences, education, certifications, projects, summaryBullets, highlightBullets } = processed

      const res = await fetch('/api/profile/save-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, workExperiences, education, certifications, projects, summaryBullets, highlightBullets }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      router.push('/profile/about')
    } catch (err) {
      setError((err as Error).message)
      setPhase('preview')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['upload', 'questions', 'preview'] as const).map((p, i) => {
              const done = phase === 'preview' ? i < 2 : phase === 'questions' ? i < 1 : phase === 'processing' ? i < 1 : false
              const active = (phase === 'upload' && i === 0) || (phase === 'questions' && i === 1) || ((phase === 'preview' || phase === 'saving') && i === 2)
              return (
                <div key={p} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-12 h-0.5 ${done ? 'bg-[var(--navy)]' : 'bg-[var(--border)]'}`} />}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    done ? 'bg-[var(--navy)] text-white' : active ? 'bg-[var(--navy)] text-white ring-4 ring-[var(--accent-light)]' : 'bg-gray-100 text-gray-400'
                  }`}>{done ? '✓' : i + 1}</div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {phase === 'upload' ? 'Step 1 — Upload documents' : phase === 'questions' ? 'Step 2 — Answer a few questions' : 'Step 3 — Review your profile'}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {phase === 'upload' && <Phase1 onComplete={handlePhase1Complete} />}
        {phase === 'questions' && <Phase2 extracted={extracted} onComplete={handlePhase2Complete} />}
        {phase === 'processing' && <Spinner message="Building your complete profile and bullet bank. This takes about 30 seconds..." />}
        {phase === 'preview' && processed && <Phase3 processed={processed} onSave={handleSave} />}
        {phase === 'saving' && <Spinner message="Saving your profile..." />}
      </div>
    </div>
  )
}
