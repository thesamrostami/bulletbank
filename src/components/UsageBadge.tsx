'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SIGNUP_CREDITS } from '@/lib/plans'

const CREDITS_PER_APP = 7

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-3.5 h-3.5'} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M11.618 2.073a.75.75 0 01.197.784l-2.3 6.393H15a.75.75 0 01.548 1.262l-7.25 7.75a.75.75 0 01-1.27-.569l.8-5.608H3a.75.75 0 01-.547-1.262l8.25-8.75a.75.75 0 01.915-.2z" />
    </svg>
  )
}

export default function UsageBadge({ collapsed }: { collapsed?: boolean }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [peakBalance, setPeakBalance] = useState<number | null>(null)
  const pathname = usePathname()

  const fetchBalance = useCallback(() => {
    fetch('/api/credits/balance')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBalance(data.balance)
          setPeakBalance(prev => prev === null ? data.balance : Math.max(prev, data.balance))
        }
      })
      .catch(() => null)
  }, [])

  useEffect(() => { fetchBalance() }, [fetchBalance, pathname])
  useEffect(() => {
    window.addEventListener('focus', fetchBalance)
    return () => window.removeEventListener('focus', fetchBalance)
  }, [fetchBalance])

  const isLow = balance !== null && balance <= 5
  const appsLeft = balance !== null ? Math.floor(balance / CREDITS_PER_APP) : null
  // The denominator is the peak (high-water mark) balance seen this session, floored
  // at SIGNUP_CREDITS. This means spending credits always decreases the bar — a user
  // who had 350 and spent 100 sees 250/350 = 71%, not 250/250 = 100%.
  const barDenominator = Math.max(SIGNUP_CREDITS, peakBalance ?? 0)
  const barPct = balance !== null ? (balance / barDenominator) * 100 : 0
  const barColor = balance === null ? 'bg-gray-300'
    : balance > 30 ? 'bg-green-500'
    : balance > 10 ? 'bg-amber-400'
    : 'bg-red-400'

  // ── Collapsed: just lightning icon + number stacked ──────────────────────
  if (collapsed) {
    return (
      <div className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl border ${isLow ? 'bg-amber-50 border-amber-200' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}>
        <LightningIcon className={`w-3.5 h-3.5 ${isLow ? 'text-amber-500' : 'text-[var(--navy)]'}`} />
        <span className={`text-[11px] font-semibold leading-none ${isLow ? 'text-amber-600' : 'text-[var(--navy)]'}`}>
          {balance ?? '…'}
        </span>
      </div>
    )
  }

  // ── Expanded ──────────────────────────────────────────────────────────────
  return (
    <div className={`px-3 py-2.5 rounded-xl border ${isLow ? 'bg-amber-50 border-amber-200' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}>
      {/* Top row: icon + balance + "Buy more →" */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <LightningIcon className={`w-3.5 h-3.5 ${isLow ? 'text-amber-500' : 'text-[var(--navy)]'}`} />
          <span className={`text-sm font-semibold leading-none ${isLow ? 'text-amber-700' : 'text-[var(--navy)]'}`}>
            {balance ?? '…'}
          </span>
          <span className="text-[11px] text-gray-400 leading-none">credits</span>
        </div>
        <Link href="/credits" className="text-[10px] text-[var(--accent)] hover:underline shrink-0">
          Buy more →
        </Link>
      </div>

      {/* Capacity bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Apps left */}
      <p className="text-[10px] text-gray-400 leading-none">
        {appsLeft !== null ? `~${appsLeft} application${appsLeft !== 1 ? 's' : ''} left` : '…'}
      </p>
    </div>
  )
}
