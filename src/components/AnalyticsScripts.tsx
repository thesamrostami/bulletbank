'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { getConsent, type ConsentValue } from '@/lib/analytics-consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

export default function AnalyticsScripts() {
  const [consent, setConsent] = useState<ConsentValue>(null)

  useEffect(() => {
    setConsent(getConsent())
    const handler = () => setConsent(getConsent())
    window.addEventListener('analytics-consent-updated', handler)
    return () => window.removeEventListener('analytics-consent-updated', handler)
  }, [])

  if (consent !== 'accepted' || (!GA_ID && !CLARITY_ID)) return null

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
        </>
      )}

      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${CLARITY_ID}");
        `}</Script>
      )}
    </>
  )
}
