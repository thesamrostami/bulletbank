'use client'

import { useState } from 'react'
import MicroCapture from './MicroCapture'

interface Props {
  workExperiences: Array<{ id: string; company: string; title: string }>
}

/**
 * Floating action button — shown on mobile, always visible in bottom-right.
 * Opens the MicroCapture modal for quick achievement logging.
 */
export default function FAB({ workExperiences }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FAB button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] active:scale-95 transition-all flex items-center justify-center"
        aria-label="Log an achievement"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <MicroCapture
          workExperiences={workExperiences}
          onSaved={() => setOpen(false)}
          forceOpen
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
