'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getConsent, setConsent } from '@/lib/analytics-consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show banner automatically only if no decision has been made yet
    if (getConsent() === null) setVisible(true)

    // "Manage cookies" is an explicit user action — always re-open the banner,
    // regardless of any previously stored choice.
    const handler = () => setVisible(true)
    window.addEventListener('show-cookie-banner', handler)
    return () => window.removeEventListener('show-cookie-banner', handler)
  }, [])

  const handleAccept = () => {
    setConsent('accepted')
    window.dispatchEvent(new Event('analytics-consent-updated'))
    setVisible(false)
  }

  const handleReject = () => {
    setConsent('rejected')
    setVisible(false)
    // If analytics scripts are already in the DOM they can't be removed without a
    // reload — GA and Clarity keep running even after React unmounts the <Script>
    // tags. We check the DOM directly because localStorage may already be null if
    // the user got here via "Manage cookies" (which clears consent before showing
    // the banner), making getConsent() === 'accepted' unreliable at this point.
    const analyticsRunning = !!document.querySelector(
      'script[src*="googletagmanager"], script[src*="clarity.ms"]'
    )
    if (analyticsRunning) {
      window.location.reload()
    } else {
      window.dispatchEvent(new Event('analytics-consent-updated'))
    }
  }

  if (!visible) return null

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg px-5 py-4">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          We use session cookies to keep you signed in (required). We&apos;d also like to use analytics
          cookies (Google Analytics, Microsoft Clarity) to understand how the product is used and
          improve it. These are optional and require your consent.{' '}
          <Link href="/privacy" className="underline hover:text-gray-900">Privacy notice →</Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={handleReject}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 bg-[var(--navy)] text-white text-sm font-medium rounded-xl hover:bg-[var(--navy-light)] transition-colors"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  )
}
