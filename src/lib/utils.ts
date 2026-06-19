import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { JobStatus, BulletBank } from '@/types'

export const ARCHETYPE_LABELS: Record<string, string> = {
  IC_Technical:   '🔧 Individual Contributor — Technical',
  IC_Clinical:    '🏥 Individual Contributor — Clinical',
  Technical_Lead: '⚡ Technical Lead',
  Management:     '👥 Management',
  Commercial:     '📈 Commercial',
  Research:       '🔬 Research',
  Other:          'General',
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const STATUS_COLORS: Record<string, string> = {
  'Saved':               'bg-slate-50 text-slate-600 border-slate-200',
  'Applied':             'bg-blue-50 text-blue-700 border-blue-200',
  'Screening':           'bg-purple-50 text-purple-700 border-purple-200',
  'Interview Scheduled': 'bg-amber-50 text-amber-700 border-amber-200',
  'Offer':               'bg-green-50 text-green-700 border-green-200',
  'Rejected':            'bg-red-50 text-red-700 border-red-200',
  'Withdrawn':           'bg-gray-50 text-gray-600 border-gray-200',
}

export const STATUSES: JobStatus[] = ['Saved', 'Applied', 'Screening', 'Interview Scheduled', 'Offer', 'Rejected', 'Withdrawn']

export function bulletStrength(bullet: BulletBank): 'Strong' | 'Good' | 'Needs work' {
  if (bullet.is_finalised) return 'Good'
  let score = 0
  if (bullet.has_metric) score++
  if (/^(Built|Led|Designed|Deployed|Developed|Reduced|Increased|Created|Implemented|Managed|Architected|Delivered|Optimized|Launched|Automated|Scaled)/i.test(bullet.text)) score++
  if (bullet.text.length > 30 && bullet.skill_tags.length > 0) score++
  if (score >= 3) return 'Strong'
  if (score >= 2) return 'Good'
  return 'Needs work'
}

export function bulletNeedsWork(bullet: BulletBank): boolean {
  if (bullet.is_finalised) return false
  return bulletStrength(bullet) === 'Needs work'
}

export function fmtMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

