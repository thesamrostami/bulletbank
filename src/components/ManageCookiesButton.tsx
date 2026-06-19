'use client'
import { CONSENT_KEY } from '@/lib/analytics-consent'

export default function ManageCookiesButton({ className }: { className?: string }) {
  const handleClick = () => {
    try {
      localStorage.removeItem(CONSENT_KEY)
    } catch {}
    window.dispatchEvent(new Event('show-cookie-banner'))
  }

  return (
    <button
      onClick={handleClick}
      className={className ?? 'text-sm text-gray-500 underline hover:text-gray-800'}
    >
      Manage cookie preferences
    </button>
  )
}
