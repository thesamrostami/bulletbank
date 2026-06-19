'use client'

import { createPortal } from 'react-dom'

interface Props {
  message: string
  onClose: () => void
}

export default function LimitReachedModal({ message, onClose }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Daily limit reached</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Upgrade options coming soon. Your limit resets at midnight.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[var(--navy)] text-white rounded-xl text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  )
}
