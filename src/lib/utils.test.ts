import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BulletBank } from '@/types'
import { cn, daysUntil, formatDate, fmtMonthYear, bulletStrength, bulletNeedsWork, STATUSES, STATUS_COLORS } from './utils'

function makeBullet(overrides: Partial<BulletBank> = {}): BulletBank {
  return {
    id: 'b1',
    user_id: 'u1',
    bullet_id: 'B-001',
    type: 'achievement' as BulletBank['type'],
    role_context: null,
    work_experience_id: null,
    project_id: null,
    text: 'Did some things',
    skill_tags: [],
    has_metric: false,
    metric_text: null,
    star_story: null,
    times_used: 0,
    last_defended_at: null,
    is_finalised: false,
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('lets later Tailwind utilities override earlier conflicting ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

describe('date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('daysUntil counts whole days ahead, rounding up', () => {
    expect(daysUntil('2026-03-13T12:00:00Z')).toBe(3)
    expect(daysUntil('2026-03-13T13:00:00Z')).toBe(4)
  })

  it('daysUntil is negative for past dates', () => {
    expect(daysUntil('2026-03-08T12:00:00Z')).toBe(-2)
  })

  it('formatDate renders en-GB short form', () => {
    expect(formatDate('2026-03-10T12:00:00Z')).toBe('10 Mar 2026')
  })

  it('fmtMonthYear renders month and year', () => {
    expect(fmtMonthYear('2024-07-15')).toBe('Jul 2024')
  })

  it('fmtMonthYear renders a dash for missing values', () => {
    expect(fmtMonthYear(null)).toBe('—')
    expect(fmtMonthYear(undefined)).toBe('—')
    expect(fmtMonthYear('')).toBe('—')
  })
})

describe('bulletStrength', () => {
  it('returns Good for finalised bullets regardless of content', () => {
    expect(bulletStrength(makeBullet({ is_finalised: true, text: 'x' }))).toBe('Good')
  })

  it('returns Strong when it has a metric, a strong verb and tags', () => {
    const b = makeBullet({
      has_metric: true,
      text: 'Reduced deployment time by 40% across the platform',
      skill_tags: ['CI/CD'],
    })
    expect(bulletStrength(b)).toBe('Strong')
  })

  it('returns Good with two of the three signals', () => {
    const b = makeBullet({
      has_metric: true,
      text: 'Reduced things',
      skill_tags: [],
    })
    expect(bulletStrength(b)).toBe('Good')
  })

  it('returns Needs work with one or zero signals', () => {
    expect(bulletStrength(makeBullet({ text: 'Responsible for stuff' }))).toBe('Needs work')
    expect(bulletStrength(makeBullet({ text: 'Led the team' }))).toBe('Needs work')
  })

  it('matches the action verb case-insensitively', () => {
    const b = makeBullet({ has_metric: true, text: 'built a thing', skill_tags: [] })
    expect(bulletStrength(b)).toBe('Good')
  })

  it('requires both length and tags for the third signal', () => {
    const longNoTags = makeBullet({ has_metric: true, text: 'Built a very long description of a thing that works', skill_tags: [] })
    expect(bulletStrength(longNoTags)).toBe('Good')
    const shortWithTags = makeBullet({ has_metric: true, text: 'Built it', skill_tags: ['x'] })
    expect(bulletStrength(shortWithTags)).toBe('Good')
  })
})

describe('bulletNeedsWork', () => {
  it('is false for finalised bullets', () => {
    expect(bulletNeedsWork(makeBullet({ is_finalised: true }))).toBe(false)
  })

  it('mirrors bulletStrength === Needs work', () => {
    expect(bulletNeedsWork(makeBullet({ text: 'meh' }))).toBe(true)
    expect(bulletNeedsWork(makeBullet({ has_metric: true, text: 'Built x' }))).toBe(false)
  })
})

describe('status configuration', () => {
  it('every status has a colour class', () => {
    for (const status of STATUSES) {
      expect(STATUS_COLORS[status], `missing colour for ${status}`).toBeTypeOf('string')
    }
  })
})
