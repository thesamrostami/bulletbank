'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

function TabIcon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  )
}

const BASE_TABS = [
  {
    label: 'About me',
    href: '/profile/about',
    icon: <TabIcon d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 18a6.5 6.5 0 0113 0" />,
  },
  {
    label: 'Experience & CV',
    href: '/profile/experience',
    icon: <TabIcon d="M6 4h8a1 1 0 011 1v2H5V5a1 1 0 011-1z" d2="M3 7h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />,
  },
  {
    label: 'Bullet bank',
    href: '/profile/bullets',
    icon: <TabIcon d="M7 5h9M7 10h9M7 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01" />,
  },
]

const UPDATE_TAB = {
  label: 'Update profile',
  href: '/profile/update',
  icon: <TabIcon d="M10 4v12M4 10h12" />,
}

interface Props {
  onboardingComplete: boolean
}

export default function ProfileTabs({ onboardingComplete }: Props) {
  const pathname = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [pathname])

  if (pathname === '/profile/onboarding') return null

  const tabs = onboardingComplete ? [...BASE_TABS, UPDATE_TAB] : BASE_TABS

  return (
    <div className="border-b border-gray-100 bg-[var(--surface)] px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
      <h1 className="text-2xl font-semibold mb-4">My profile</h1>
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={active ? activeRef : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap shrink-0 transition-all duration-150 ${
                active
                  ? 'bg-white shadow-sm text-[var(--navy)] font-semibold border border-b-0 border-[var(--border)] -mb-px relative z-10'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 border border-transparent'
              }`}
            >
              <span className={active ? 'text-[var(--navy)]' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
