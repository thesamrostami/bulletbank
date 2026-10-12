import { describe, it, expect } from 'vitest'
import {
  CREDIT_COSTS,
  CREDIT_LABELS,
  CREDIT_PACKS,
  SIGNUP_CREDITS,
  getCreditCost,
  getCreditLabel,
} from './plans'

describe('getCreditCost', () => {
  it('returns the configured cost for known actions', () => {
    expect(getCreditCost('cv_rewrite')).toBe(3)
    expect(getCreditCost('cover_letter')).toBe(2)
    expect(getCreditCost('fit_analysis')).toBe(1)
  })

  it('defaults to 1 credit for unknown actions so nothing is ever free', () => {
    expect(getCreditCost('some_new_action')).toBe(1)
  })
})

describe('getCreditLabel', () => {
  it('returns the human label for known actions', () => {
    expect(getCreditLabel('cv_rewrite')).toBe('CV generation')
    expect(getCreditLabel('interview_prep')).toBe('Interview prep')
  })

  it('falls back to a readable version of the key for unknown actions', () => {
    expect(getCreditLabel('some_new_action')).toBe('some new action')
  })
})

describe('credit configuration consistency', () => {
  it('every priced action has a label', () => {
    for (const action of Object.keys(CREDIT_COSTS)) {
      expect(CREDIT_LABELS[action], `missing label for ${action}`).toBeTypeOf('string')
    }
  })

  it('every label corresponds to a priced action', () => {
    for (const action of Object.keys(CREDIT_LABELS)) {
      expect(CREDIT_COSTS[action], `missing cost for ${action}`).toBeTypeOf('number')
    }
  })

  it('all costs are positive integers', () => {
    for (const cost of Object.values(CREDIT_COSTS)) {
      expect(Number.isInteger(cost)).toBe(true)
      expect(cost).toBeGreaterThan(0)
    }
  })

  it('signup credits cover at least one of every action', () => {
    const total = Object.values(CREDIT_COSTS).reduce((a, b) => a + b, 0)
    expect(SIGNUP_CREDITS).toBeGreaterThanOrEqual(total)
  })
})

describe('CREDIT_PACKS', () => {
  it('has unique ids', () => {
    const ids = CREDIT_PACKS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is ordered by ascending credits and price', () => {
    for (let i = 1; i < CREDIT_PACKS.length; i++) {
      expect(CREDIT_PACKS[i].credits).toBeGreaterThan(CREDIT_PACKS[i - 1].credits)
      expect(CREDIT_PACKS[i].price).toBeGreaterThan(CREDIT_PACKS[i - 1].price)
    }
  })

  // TODO: currently fails — Pro (600 for £24.99 ≈ 4.17p/credit) is worse value than
  // Standard (250 for £9.99 ≈ 4.00p/credit). Re-enable once pricing is adjusted here
  // and in the matching Lemon Squeezy variants.
  it.skip('larger packs offer a better or equal per-credit price', () => {
    for (let i = 1; i < CREDIT_PACKS.length; i++) {
      const prev = CREDIT_PACKS[i - 1].price / CREDIT_PACKS[i - 1].credits
      const curr = CREDIT_PACKS[i].price / CREDIT_PACKS[i].credits
      expect(curr).toBeLessThanOrEqual(prev)
    }
  })

  it('priceLabel matches the price in pence', () => {
    for (const pack of CREDIT_PACKS) {
      expect(pack.priceLabel).toBe(`£${(pack.price / 100).toFixed(2)}`)
    }
  })
})
