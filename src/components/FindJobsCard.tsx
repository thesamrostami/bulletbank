'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FindJobsCardProps {
  initialData?: {
    job_titles: string[]
    job_search_locations: string[]
    location_city: string | null
    preferred_work_type: string
  }
}

function buildSearchLinks(role: string, location: string, isRemote: boolean) {
  const q   = encodeURIComponent(role)
  const loc = encodeURIComponent(location)
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return [
    {
      label: 'Reed',
      url: location
        ? `https://www.reed.co.uk/jobs/${slug(role)}-jobs-in-${slug(location)}`
        : `https://www.reed.co.uk/jobs/${slug(role)}-jobs`,
      style: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    },
    {
      label: 'Adzuna',
      url: `https://www.adzuna.co.uk/jobs/in/${slug(location) || 'uk'}?q=${q}${isRemote ? '+remote' : ''}`,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    },
    {
      label: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}${location ? `&location=${loc}` : ''}${isRemote ? '&f_WT=2' : ''}`,
      style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      label: 'Indeed',
      url: `https://uk.indeed.com/jobs?q=${q}${location ? `&l=${loc}` : ''}`,
      style: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    },
    {
      label: 'Google Jobs',
      url: `https://www.google.co.uk/search?q=${q}+jobs${location ? `+in+${loc}` : ''}${isRemote ? '+remote' : ''}&ibp=htl;jobs`,
      style: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    },
  ]
}

export default function FindJobsCard({ initialData }: FindJobsCardProps) {
  const [data, setData] = useState<FindJobsCardProps['initialData'] | null>(initialData ?? null)
  const [ready, setReady] = useState(!!initialData)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (initialData) return
    fetch('/api/profile/about')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.profile) { setReady(true); return }
        setData({
          job_titles: json.profile.job_titles ?? [],
          job_search_locations: json.profile.job_search_locations ?? [],
          location_city: json.profile.location_city ?? null,
          preferred_work_type: json.profile.preferred_work_type ?? 'Hybrid',
        })
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [initialData])

  if (!ready) return null
  if (!data || !data.job_titles || data.job_titles.length === 0) return null

  const location = data.job_search_locations[0] || data.location_city || ''
  const isRemote = data.preferred_work_type === 'Remote'

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm">

      {/* Card header — clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-start justify-between gap-3 p-5 text-left"
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <svg className="w-4 h-4 text-[var(--accent)] shrink-0" viewBox="0 0 16 16"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4.5"/>
              <path d="M11.5 11.5l2.5 2.5"/>
            </svg>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Find relevant jobs
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] ml-6">
            Searches built from your profile · opens in a new tab
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5">
          {/* "Found one? Add it →" link */}
          <div className="flex justify-end mb-4 -mt-1">
            <Link
              href="/jobs/new"
              className="shrink-0 text-xs text-[var(--accent)] hover:underline whitespace-nowrap"
              onClick={e => e.stopPropagation()}
            >
              Found one? Add it →
            </Link>
          </div>

          {/* One block per job title, max 3 */}
          <div className="space-y-4">
            {data.job_titles.slice(0, 3).map((title) => {
              const links = buildSearchLinks(title, location, isRemote)
              return (
                <div key={title}>
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    {title}
                    {location && <span className="text-gray-400 font-normal"> · {location}</span>}
                    {isRemote && <span className="text-gray-400 font-normal"> · Remote</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {links.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${link.style}`}
                      >
                        {link.label}
                        <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 10 10" fill="none"
                             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M2 8L8 2M4.5 2H8v3.5"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer when more than 3 titles */}
          {data.job_titles.length > 3 && (
            <p className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              +{data.job_titles.length - 3} more role{data.job_titles.length - 3 > 1 ? 's' : ''} in your profile —
              <Link href="/profile/about" className="ml-1 text-[var(--accent)] hover:underline">
                edit targets
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
