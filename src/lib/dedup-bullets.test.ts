import { describe, it, expect } from 'vitest'
import { findDuplicateBullets, bulletOverlapsDescription, flagDuplicateIds } from './dedup-bullets'

const A = 'Led migration of the payments service to Kubernetes, cutting deploy time by 40%'
const A_PARAPHRASE = 'Led the migration of payments service to Kubernetes and cut deploy time by 40%'
const B = 'Designed onboarding flow for new hires, reducing ramp-up from six weeks to three'

describe('findDuplicateBullets', () => {
  it('returns no flags for an empty list', () => {
    expect(findDuplicateBullets([])).toEqual([])
  })

  it('returns no flags for a single bullet', () => {
    expect(findDuplicateBullets([A])).toEqual([])
  })

  it('flags identical bullets with similarity 1', () => {
    const flags = findDuplicateBullets([A, A])
    expect(flags).toHaveLength(1)
    expect(flags[0]).toMatchObject({ bulletA: A, bulletB: A, similarity: 1 })
  })

  it('flags paraphrases that differ only by stop words and punctuation', () => {
    const flags = findDuplicateBullets([A, A_PARAPHRASE])
    expect(flags).toHaveLength(1)
    expect(flags[0].similarity).toBeGreaterThanOrEqual(0.6)
  })

  it('does not flag bullets about different things', () => {
    expect(findDuplicateBullets([A, B])).toEqual([])
  })

  it('is case-insensitive', () => {
    expect(findDuplicateBullets([A, A.toUpperCase()])).toHaveLength(1)
  })

  it('respects a custom threshold', () => {
    // A threshold above 1 can never be met, even by identical bullets.
    expect(findDuplicateBullets([A, A], 1.01)).toEqual([])
    // A threshold of 0 flags every pair, even unrelated ones.
    expect(findDuplicateBullets([A, B], 0)).toHaveLength(1)
  })

  it('checks every pair, not just neighbours', () => {
    const flags = findDuplicateBullets([A, B, A])
    expect(flags).toHaveLength(1)
    expect(flags[0].bulletA).toBe(A)
    expect(flags[0].bulletB).toBe(A)
  })
})

describe('bulletOverlapsDescription', () => {
  it('returns false for an empty description', () => {
    expect(bulletOverlapsDescription(A, '')).toBe(false)
  })

  it('returns true when the bullet is essentially the description', () => {
    expect(bulletOverlapsDescription(A, A_PARAPHRASE)).toBe(true)
  })

  it('returns false when the bullet adds substantially new content', () => {
    expect(bulletOverlapsDescription(A, B)).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(bulletOverlapsDescription(A, A, 1.01)).toBe(false)
  })
})

describe('flagDuplicateIds', () => {
  it('returns an empty set when nothing overlaps', () => {
    const result = flagDuplicateIds([
      { id: '1', text: A },
      { id: '2', text: B },
    ])
    expect(result.size).toBe(0)
  })

  it('returns both ids of an overlapping pair', () => {
    const result = flagDuplicateIds([
      { id: '1', text: A },
      { id: '2', text: B },
      { id: '3', text: A_PARAPHRASE },
    ])
    expect([...result].sort()).toEqual(['1', '3'])
  })

  it('handles an empty list', () => {
    expect(flagDuplicateIds([]).size).toBe(0)
  })
})
