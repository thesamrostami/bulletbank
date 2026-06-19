'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CREDIT_PACKS, CREDIT_COSTS, CREDIT_LABELS, SIGNUP_CREDITS } from '@/lib/plans'

interface Transaction {
  id: string
  amount: number
  balance_after: number
  type: string
  action: string | null
  description: string | null
  created_at: string
}

type TxFilter = 'all' | 'purchases' | 'usage'
type PollState = 'waiting' | 'confirmed' | 'timeout'

// ── Icons ──────────────────────────────────────────────────────────────────

function ActionIcon({ action }: { action: string }) {
  const paths: Record<string, string> = {
    job_extraction:      'M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V9l-5-5zM8 4v5h8',
    fit_analysis:        'M3 17l4-6 4 3 4-7 4 10',
    cv_rewrite:          'M4 4h12v12H4zM7 8h6M7 11h6M7 14h3',
    cv_refine:           'M13.5 3.5l3 3-9 9H4.5v-3l9-9z',
    cover_letter:        'M3 7l7 5 7-5M3 7v8a1 1 0 001 1h12a1 1 0 001-1V7',
    cover_letter_refine: 'M13.5 3.5l3 3-9 9H4.5v-3l9-9z',
    interview_prep:      'M4 4h12v8H4zM4 8h12M9 12v3M7 15h6',
    bullet_generation:   'M7 5h9M7 10h9M7 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01',
    bullet_rewrite:      'M4 4v5h5M16 16v-5h-5M3.5 12.5a7 7 0 0013.4.5M16.5 7.5a7 7 0 00-13.4-.5',
    chat_message:        'M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H8l-4 4V5a1 1 0 011-1z',
    profile_extraction:  'M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 18a6.5 6.5 0 0113 0',
  }
  const d = paths[action] ?? 'M10 10m-7 0a7 7 0 1014 0 7 7 0 10-14 0'
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function CreditDots({ count }: { count: number }) {
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="w-[7px] h-[7px] rounded-full bg-[var(--navy)] opacity-70" />
      ))}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function formatTxDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (dStart === todayStart) return `Today, ${timeStr}`
  if (dStart === todayStart - 86400000) return `Yesterday, ${timeStr}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + timeStr
}

const PER_APP_ACTIONS = ['job_extraction', 'fit_analysis', 'cv_rewrite', 'cover_letter']
const OTHER_ACTIONS = Object.keys(CREDIT_COSTS).filter(a => !PER_APP_ACTIONS.includes(a))

// ── Main content ───────────────────────────────────────────────────────────

function CreditsContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'

  const [balance, setBalance] = useState<number | null>(null)
  const [peakBalance, setPeakBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [balanceError, setBalanceError] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [txPage, setTxPage] = useState(1)
  const [txFilter, setTxFilter] = useState<TxFilter>('all')
  const [pollState, setPollState] = useState<PollState>('waiting')

  // Refs to avoid stale closure issues and prevent state updates after unmount
  const mountedRef = useRef(true)
  const initialBalanceRef = useRef<number | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    if (pollTimeoutRef.current)  { clearTimeout(pollTimeoutRef.current);  pollTimeoutRef.current = null  }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  const fetchData = useCallback(async () => {
    try {
      const [balRes, histRes] = await Promise.all([
        fetch('/api/credits/balance'),
        fetch('/api/credits/history?limit=200'),
      ])

      if (!mountedRef.current) return

      if (balRes.ok) {
        const d = await balRes.json()
        setBalance(d.balance)
        setPeakBalance(prev => prev === null ? d.balance : Math.max(prev, d.balance))
        setBalanceError(false)
      } else {
        setBalanceError(true)
      }

      if (histRes.ok) {
        const d = await histRes.json()
        setTransactions(Array.isArray(d.transactions) ? d.transactions : [])
        setHistoryError(false)
      } else {
        setHistoryError(true)
      }
    } catch {
      if (!mountedRef.current) return
      setBalanceError(true)
      setHistoryError(true)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // After first load, kick off polling if we arrived from a successful checkout
  const fetchDataAndMaybeStartPolling = useCallback(async () => {
    await fetchData()

    if (!success || !mountedRef.current) return

    // Record the balance we saw on arrival so we can detect when it changes
    setBalance(prev => {
      initialBalanceRef.current = prev
      return prev
    })

    // Poll balance every 2.5 s for up to 30 s
    pollIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current) return
      try {
        const res = await fetch('/api/credits/balance')
        if (!res.ok || !mountedRef.current) return
        const { balance: newBalance } = await res.json()
        if (!mountedRef.current) return
        setBalance(newBalance)
        setPeakBalance(prev => prev === null ? newBalance : Math.max(prev, newBalance))

        if (initialBalanceRef.current !== null && newBalance > initialBalanceRef.current) {
          // Credits arrived — stop polling, refresh history, update banner
          stopPolling()
          setPollState('confirmed')
          // Refresh transaction list to show the new purchase entry
          fetch('/api/credits/history?limit=200')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d && mountedRef.current) setTransactions(Array.isArray(d.transactions) ? d.transactions : [])
            })
            .catch(() => null)
        }
      } catch { /* ignore transient errors during polling */ }
    }, 2500)

    // Stop polling after 30 s regardless
    pollTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      stopPolling()
      // Only show the timeout warning if credits haven't arrived yet
      setPollState(prev => prev === 'waiting' ? 'timeout' : prev)
    }, 30_000)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialBalanceRef and poll*Refs are stable refs; mountedRef is a stable ref; all real reactive deps are listed
  }, [fetchData, success, stopPolling])

  useEffect(() => {
    fetchDataAndMaybeStartPolling()
    window.addEventListener('focus', fetchData)
    return () => window.removeEventListener('focus', fetchData)
  }, [fetchDataAndMaybeStartPolling, fetchData])

  const handleBuy = async (packId: string) => {
    setLoadingPack(packId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.')
        setLoadingPack(null)
      }
    } catch {
      alert('Network error. Please try again.')
      setLoadingPack(null)
    }
  }

  const isLow = balance !== null && balance <= 5
  const appsLeft = balance !== null ? Math.floor(balance / 7) : null
  // The denominator is the peak (high-water mark) balance seen this session, floored
  // at SIGNUP_CREDITS. This means spending credits always decreases the bar — a user
  // who had 350 and spent 100 sees 250/350 = 71%, not 250/250 = 100%.
  const barDenominator = Math.max(SIGNUP_CREDITS, peakBalance ?? 0)
  const barPct = balance !== null ? (balance / barDenominator) * 100 : 0

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'purchases') return tx.amount > 0
    if (txFilter === 'usage') return tx.amount < 0
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredTx.length / PAGE_SIZE))
  const safePage = Math.min(txPage, totalPages)
  const pageTx = filteredTx.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const totalSpent = transactions.reduce((s, t) => t.amount < 0 ? s + Math.abs(t.amount) : s, 0)
  const totalBought = transactions.reduce((s, t) => t.amount > 0 ? s + t.amount : s, 0)

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6 animate-fadeIn">

      {/* ── Success / payment banner ───────────────────────── */}
      {success && pollState === 'waiting' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Payment received! Your credits will appear shortly…
        </div>
      )}
      {success && pollState === 'confirmed' && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          Your credits have been added successfully!
        </div>
      )}
      {success && pollState === 'timeout' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Your payment was received. Credits may take a moment to appear — try refreshing if your balance hasn&apos;t updated.
        </div>
      )}

      {/* ── 3.1 Hero balance ──────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 md:p-8 text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)' }}
      >
        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Balance</p>
          {isLow && (
            <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
              Running low
            </span>
          )}
        </div>
        {balanceError ? (
          <p className="text-blue-200 text-sm mb-4">Couldn&apos;t load balance — please refresh.</p>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-bold leading-none tabular-nums">
                {balance === null ? '…' : balance}
              </span>
              <span className="text-blue-200 text-base mb-1 leading-tight">credits remaining</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-white/70 transition-all duration-700"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <p className="text-blue-200 text-sm">
              ~{appsLeft ?? '…'} full application{appsLeft !== 1 ? 's' : ''} remaining
            </p>
          </>
        )}
      </div>

      {/* ── 3.2 + 3.3: Two-column packs + cost reference ─────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Credit packs — 60% */}
        <div className="flex-[3] min-w-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Buy credits</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Credits never expire. One-time purchase, no subscription.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CREDIT_PACKS.map(pack => {
              const isPopular = pack.id === 'standard'
              const perApp = ((pack.price / 100) / Math.floor(pack.credits / 7)).toFixed(2)
              return (
                <div
                  key={pack.id}
                  className={`relative bg-white border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default ${
                    isPopular
                      ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] shadow-sm scale-[1.02]'
                      : 'border-[var(--border)] shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold text-[var(--navy)]">{pack.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">~{Math.floor(pack.credits / 7)} full applications</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--text-primary)]">{pack.priceLabel}</p>
                    <p className="text-xs text-[var(--text-muted)]">£{perApp} per application</p>
                  </div>
                  <button
                    onClick={() => handleBuy(pack.id)}
                    disabled={loadingPack !== null}
                    className={`mt-auto w-full py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                      isPopular
                        ? 'bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]'
                        : 'bg-white text-[var(--navy)] border border-[var(--navy)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    {loadingPack === pack.id ? 'Loading…' : 'Buy'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Secure checkout via Lemon Squeezy.
          </p>
        </div>

        {/* ── 3.3 Cost reference — 40% ──────────────────────── */}
        <div className="flex-[2] min-w-0 bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Cost per action</h2>

          {/* Per-application group */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Per application</p>
          <div className="space-y-2 mb-2">
            {PER_APP_ACTIONS.map(action => (
              <div key={action} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ActionIcon action={action} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{CREDIT_LABELS[action]}</span>
                </div>
                <CreditDots count={CREDIT_COSTS[action]} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-[var(--border)] pt-2 mb-4">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Subtotal</span>
            <div className="flex items-center gap-1.5">
              <CreditDots count={7} />
              <span className="text-xs font-semibold text-[var(--navy)]">7 credits</span>
            </div>
          </div>

          {/* Other actions */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Other actions</p>
          <div className="space-y-2">
            {OTHER_ACTIONS.map(action => (
              <div key={action} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ActionIcon action={action} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{CREDIT_LABELS[action]}</span>
                </div>
                <CreditDots count={CREDIT_COSTS[action]} />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 3.4 Transaction history ──────────────────────────── */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Transaction history</h2>
            {!loading && !historyError && transactions.length > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {totalBought > 0 && <span className="text-green-600 font-medium">+{totalBought} purchased</span>}
                {totalBought > 0 && totalSpent > 0 && <span className="mx-1.5 text-gray-300">·</span>}
                {totalSpent > 0 && <span>{totalSpent} used</span>}
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            {(['all', 'purchases', 'usage'] as TxFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setTxFilter(f); setTxPage(1) }}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                  txFilter === f
                    ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                    : 'bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="skeleton w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-40 rounded" />
                  <div className="skeleton h-2.5 w-24 rounded" />
                </div>
                <div className="skeleton h-3 w-10 rounded" />
              </div>
            ))}
          </div>
        ) : historyError ? (
          <p className="text-sm text-[var(--text-muted)] px-5 py-8">
            Couldn&apos;t load your transactions. Please refresh the page.
          </p>
        ) : filteredTx.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <svg className="w-10 h-10 text-gray-200" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="8" width="28" height="24" rx="3" />
              <path d="M13 16h14M13 22h10" />
            </svg>
            <p className="text-sm text-[var(--text-muted)]">
              {txFilter === 'all'
                ? 'No transactions yet. Start applying to see your usage here.'
                : `No ${txFilter} found.`}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="divide-y divide-[var(--border-subtle)]">
              {pageTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  {/* Icon */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    tx.amount > 0 ? 'bg-green-50' : 'bg-gray-100'
                  }`}>
                    {tx.amount > 0 ? (
                      <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M10 16V4M5 9l5-5 5 5" />
                      </svg>
                    ) : (
                      <ActionIcon action={tx.action ?? ''} />
                    )}
                  </div>

                  {/* Description + date */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-secondary)] truncate leading-snug">
                      {tx.description ?? CREDIT_LABELS[tx.action ?? ''] ?? tx.type}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{formatTxDate(tx.created_at)}</p>
                  </div>

                  {/* Amount + balance */}
                  <div className="text-right shrink-0 min-w-[4.5rem]">
                    <p className={`text-sm font-semibold tabular-nums ${tx.amount > 0 ? 'text-green-600' : 'text-[var(--text-secondary)]'}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums">→ {tx.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-gray-50/50">
              <p className="text-xs text-[var(--text-muted)]">
                {filteredTx.length === 1
                  ? '1 transaction'
                  : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredTx.length)} of ${filteredTx.length}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTxPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--navy)] hover:text-[var(--navy)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Previous page"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 12L6 8l4-4" />
                  </svg>
                </button>

                {/* Page number pills — show at most 5 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-[var(--text-muted)]">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setTxPage(item as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          item === safePage
                            ? 'bg-[var(--navy)] text-white'
                            : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )
                }

                <button
                  onClick={() => setTxPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--navy)] hover:text-[var(--navy)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Next page"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="p-6 md:p-10 max-w-5xl">
        <div className="rounded-2xl p-8 bg-[var(--navy)]">
          <div className="skeleton h-12 w-24 rounded-lg bg-white/20 mb-2" />
          <div className="skeleton h-4 w-32 rounded bg-white/10" />
        </div>
      </div>
    }>
      <CreditsContent />
    </Suspense>
  )
}
