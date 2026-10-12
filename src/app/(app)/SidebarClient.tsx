'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import MicroCapture from '@/components/MicroCapture'
import Logo, { LogoMark } from '@/components/Logo'
import UsageBadge from '@/components/UsageBadge'

interface Props {
  onboardingComplete: boolean
  fullName: string | null
  email: string | null
  signOutAction: () => Promise<void>
  workExperiences: Array<{ id: string; company: string; title: string }>
  hasUpcomingInterviews?: boolean
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Icons ──────────────────────────────────────────────────────────────────
function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  )
}

const icons = {
  home:     <Icon d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" d2="M7 18V11h6v7" />,
  jobs:     <Icon d="M6 2h8a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" d2="M8 6h4M8 9h4M8 12h2" />,
  bullets:  <Icon d="M7 5h9M7 10h9M7 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01" />,
  review:   <Icon d="M6 2h8a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" d2="M7.5 10.5l2 2 3.5-4" />,
  profile:  <Icon d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 18a6.5 6.5 0 0113 0" />,
  credits:  <Icon d="M10 2a8 8 0 100 16A8 8 0 0010 2zM10 6v4M10 10l2.5 2.5" d2="M10 14h.01" />,
  capture:  <Icon d="M10 4v12M4 10h12" />,
  signout:  <Icon d="M13 15l3-5-3-5M16 10H7M11 4H5a1 1 0 00-1 1v10a1 1 0 001 1h6" />,
  collapse: <Icon d="M13 4L7 10l6 6" />,
  expand:   <Icon d="M7 4l6 6-6 6" />,
  close:    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l8 8M14 6l-8 8" /></svg>,
  menu:     <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14" /></svg>,
}

export default function SidebarClient({ onboardingComplete, fullName, email, signOutAction, workExperiences, hasUpcomingInterviews }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--border-subtle)] sticky top-0 z-40">
        <Link href="/dashboard"><Logo size={18} /></Link>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? icons.close : icons.menu}
        </button>
      </div>

      {/* ── Mobile backdrop ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/20 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile slide-in sidebar ────────────────────────────── */}
      <aside className={`
        md:hidden fixed inset-y-0 left-0 z-40
        w-64 bg-white border-r border-[var(--border-subtle)]
        flex flex-col shrink-0
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
      `}>
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}><Logo size={18} /></Link>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            {icons.close}
          </button>
        </div>
        <ExpandedNav
          onboardingComplete={onboardingComplete}
          fullName={fullName}
          email={email}
          signOutAction={signOutAction}
          workExperiences={workExperiences}
          hasUpcomingInterviews={hasUpcomingInterviews}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className={`
        hidden md:flex flex-col h-screen shrink-0
        bg-white border-r border-[var(--border-subtle)]
        transition-[width] duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-[52px]' : 'w-56'}
      `}>
        {collapsed ? (
          <CollapsedNav
            onboardingComplete={onboardingComplete}
            fullName={fullName}
            signOutAction={signOutAction}
            workExperiences={workExperiences}
            hasUpcomingInterviews={hasUpcomingInterviews}
            onExpand={() => setCollapsed(false)}
          />
        ) : (
          <ExpandedNav
            onboardingComplete={onboardingComplete}
            fullName={fullName}
            email={email}
            signOutAction={signOutAction}
            workExperiences={workExperiences}
            hasUpcomingInterviews={hasUpcomingInterviews}
            onCollapse={() => setCollapsed(true)}
          />
        )}
      </aside>
    </>
  )
}

// ── Expanded sidebar ──────────────────────────────────────────────────────────
function ExpandedNav({
  onboardingComplete, fullName, email, signOutAction, workExperiences, hasUpcomingInterviews,
  onCollapse, onNavClick,
}: {
  onboardingComplete: boolean
  fullName: string | null
  email: string | null
  signOutAction: () => Promise<void>
  workExperiences: Array<{ id: string; company: string; title: string }>
  hasUpcomingInterviews?: boolean
  onCollapse?: () => void
  onNavClick?: () => void
}) {
  const initials = getInitials(fullName)

  return (
    <div className="flex flex-col h-full px-3 py-4 w-56 overflow-y-auto scrollbar-none">
      {/* Logo + collapse button */}
      <div className="flex items-center justify-between mb-4 px-1">
        <Link href="/dashboard">
          <Logo size={18} />
        </Link>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Collapse sidebar"
          >
            {icons.collapse}
          </button>
        )}
      </div>

      {/* ── User identity ─────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-2 py-2 mb-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-semibold text-white leading-none">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          {fullName && (
            <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">{fullName}</p>
          )}
          {email && (
            <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">{email}</p>
          )}
          {!fullName && !email && (
            <p className="text-[11px] text-[var(--text-muted)]">My account</p>
          )}
        </div>
      </div>

      {!onboardingComplete && (
        <Link
          href="/profile/onboarding"
          onClick={onNavClick}
          className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 hover:bg-amber-100 transition-colors block"
        >
          Build your profile first →
        </Link>
      )}

      {/* ── Nav ───────────────────────────────────────────────── */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1">Menu</p>
      <nav className="flex flex-col gap-0.5 flex-1" aria-label="Main navigation">
        <NavLink href="/dashboard" exact icon={icons.home} onClick={onNavClick}>Home</NavLink>
        <NavLink href="/jobs" exact icon={icons.jobs} dot={hasUpcomingInterviews} onClick={onNavClick}>My Jobs</NavLink>
        <NavLink href="/profile/bullets" icon={icons.bullets} onClick={onNavClick}>Bullet Bank</NavLink>
        <NavLink href="/review-pack" icon={icons.review} onClick={onNavClick}>Review pack</NavLink>
        <NavLink href="/profile/about" icon={icons.profile} excludePrefix="/profile/bullets" onClick={onNavClick}>My Profile</NavLink>
        <NavLink href="/credits" icon={icons.credits} onClick={onNavClick}>Credits</NavLink>

        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1">Quick Add</p>
          <MicroCapture workExperiences={workExperiences} onSaved={onNavClick} />
        </div>
      </nav>

      {/* Usage badge */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <UsageBadge />
      </div>

      <form action={signOutAction} className="mt-3 px-1">
        <button type="submit" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {icons.signout}
          <span>Sign out</span>
        </button>
      </form>
    </div>
  )
}

// ── Collapsed icon-rail ───────────────────────────────────────────────────────
function CollapsedNav({
  onboardingComplete, fullName, signOutAction, workExperiences, hasUpcomingInterviews, onExpand,
}: {
  onboardingComplete: boolean
  fullName: string | null
  signOutAction: () => Promise<void>
  workExperiences: Array<{ id: string; company: string; title: string }>
  hasUpcomingInterviews?: boolean
  onExpand: () => void
}) {
  const initials = getInitials(fullName)

  return (
    <div className="flex flex-col h-full items-center py-4 w-[52px] overflow-y-auto scrollbar-none">
      {/* Logo / expand button */}
      <button onClick={onExpand} className="mb-3" aria-label="Expand sidebar">
        <LogoMark size={20} />
      </button>
      <button
        onClick={onExpand}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors mb-3"
        aria-label="Expand sidebar"
      >
        {icons.expand}
      </button>

      {/* User initials */}
      <div className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center shrink-0 mb-3">
        <span className="text-[11px] font-semibold text-white leading-none">{initials}</span>
      </div>

      {!onboardingComplete && (
        <Link
          href="/profile/onboarding"
          title="Build your profile first"
          className="mb-3 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M10 4v6M10 14h.01" />
          </svg>
        </Link>
      )}

      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-1.5">
        <IconLink href="/dashboard" exact title="Home">{icons.home}</IconLink>
        <IconLink href="/jobs" exact title="My Jobs" dot={hasUpcomingInterviews}>{icons.jobs}</IconLink>
        <IconLink href="/profile/bullets" title="Bullet Bank">{icons.bullets}</IconLink>
        <IconLink href="/review-pack" title="Review pack">{icons.review}</IconLink>
        <IconLink href="/profile/about" title="My Profile" excludePrefix="/profile/bullets">{icons.profile}</IconLink>
        <IconLink href="/credits" title="Credits">{icons.credits}</IconLink>
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] w-full flex justify-center">
          <MicroCapture workExperiences={workExperiences} iconOnly />
        </div>
      </nav>

      {/* Collapsed usage badge */}
      <div className="mt-3 w-full px-1.5">
        <UsageBadge collapsed />
      </div>

      <form action={signOutAction} className="mt-3">
        <button type="submit" title="Sign out" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          {icons.signout}
        </button>
      </form>
    </div>
  )
}

// ── Nav primitives ────────────────────────────────────────────────────────────
function NavLink({
  href, exact, excludePrefix, icon, onClick, children, dot,
}: {
  href: string
  exact?: boolean
  excludePrefix?: string
  icon?: React.ReactNode
  onClick?: () => void
  children: React.ReactNode
  dot?: boolean
}) {
  const pathname = usePathname()
  let active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  if (active && excludePrefix && pathname.startsWith(excludePrefix)) active = false
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 pl-[5px] pr-2 py-2 text-sm rounded-xl transition-all duration-200 border-l-[3px] ${
        active
          ? 'bg-[var(--navy-tint)] border-[var(--navy)] text-[var(--navy)] font-semibold'
          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon && (
        <span className={active ? 'text-[var(--navy)]' : 'text-gray-400'}>
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {dot && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-label="Upcoming interview" />}
    </Link>
  )
}

function IconLink({
  href, exact, excludePrefix, title, children, dot,
}: {
  href: string
  exact?: boolean
  excludePrefix?: string
  title: string
  children: React.ReactNode
  dot?: boolean
}) {
  const pathname = usePathname()
  let active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  if (active && excludePrefix && pathname.startsWith(excludePrefix)) active = false
  return (
    <Link
      href={href}
      title={title}
      className={`relative flex items-center justify-center p-2 rounded-xl transition-all duration-200 w-full border-b-[3px] ${
        active
          ? 'bg-[var(--navy-tint)] border-[var(--navy)] text-[var(--navy)]'
          : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {children}
      {dot && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" aria-label="Upcoming interview" />}
    </Link>
  )
}
