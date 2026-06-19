'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface WorkExperienceBasic {
  id: string
  company: string
  title: string
}

interface SavedBullet {
  bullet_id?: string
  text: string
}

const DAILY_PROMPTS = [
  'What did you work on today?',
  'Any wins — big or small — worth capturing?',
  'What problem did you solve this week?',
  'What have you delivered recently?',
  'What are you proud of this month?',
  'What challenge did you overcome?',
  'Any feedback you received worth noting?',
]

function getDailyPrompt(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length]
}

interface Props {
  workExperiences: WorkExperienceBasic[]
  onSaved?: (count: number) => void
  iconOnly?: boolean
  forceOpen?: boolean
  onClose?: () => void
}

export default function MicroCapture({ workExperiences, onSaved, iconOnly, forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(forceOpen ?? false)

  const handleClose = useCallback(() => {
    setOpen(false)
    onClose?.()
  }, [onClose])

  // Global keyboard shortcut: Cmd+J or Ctrl+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (forceOpen) {
    // Controlled by parent — close only when user explicitly dismisses
    return open ? (
      <CaptureModal workExperiences={workExperiences} onSaved={(n) => onSaved?.(n)} onClose={handleClose} />
    ) : null
  }

  return (
    <>
      {iconOnly ? (
        <button
          onClick={() => setOpen(true)}
          title="Log an achievement (⌘J)"
          className="flex items-center justify-center p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors w-full"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-xl transition-colors w-full text-left font-medium"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span>Log achievement</span>
          <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)] opacity-60">⌘J</span>
        </button>
      )}

      {/* Close only when user explicitly dismisses (Done button or Escape) — not on save,
          so the inline bullet preview is visible before the modal closes. */}
      {open && <CaptureModal workExperiences={workExperiences} onSaved={(n) => onSaved?.(n)} onClose={() => setOpen(false)} />}
    </>
  )
}

function CaptureModal({
  workExperiences,
  onSaved,
  onClose,
}: {
  workExperiences: WorkExperienceBasic[]
  onSaved?: (count: number) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [selectedExpId, setSelectedExpId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [savedBullets, setSavedBullets] = useState<SavedBullet[] | null>(null)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dailyPrompt = getDailyPrompt()

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bullets/micro-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), workExperienceId: selectedExpId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setSavedBullets(data.bullets)
      onSaved?.(data.bullets.length)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">Log an achievement</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {savedBullets ? (
          // ── Inline bullet preview after save ───────────────
          <div className="animate-fadeIn">
            <p className="text-sm text-green-700 font-medium mb-3">
              {savedBullets.length} bullet{savedBullets.length !== 1 ? 's' : ''} added to your bank
            </p>
            <div className="space-y-2 mb-4">
              {savedBullets.map((b, i) => (
                <div key={i} className="flex gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">{b.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
              >
                Done
              </button>
              <button
                onClick={() => { setSavedBullets(null); setText(''); setSelectedExpId('') }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Log another
              </button>
            </div>
          </div>
        ) : (
          // ── Input form ──────────────────────────────────────
          <>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              placeholder={dailyPrompt + ' Any numbers, impact, or team involvement helps.'}
              className="w-full text-sm text-gray-800 border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none leading-relaxed mb-3 transition-all"
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit() }}
            />

            {workExperiences.length > 0 && (
              <select
                value={selectedExpId}
                onChange={e => setSelectedExpId(e.target.value)}
                className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-gray-700"
              >
                <option value="">Which role? (optional)</option>
                {workExperiences.map(we => (
                  <option key={we.id} value={we.id}>{we.title} at {we.company}</option>
                ))}
              </select>
            )}

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">⌘↵ to save</p>
              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                className="px-4 py-2 bg-[var(--navy)] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--navy-light)] transition-colors"
              >
                {loading ? 'Saving…' : 'Save to bullet bank →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
