import { describe, it, expect } from 'vitest'
import {
  validateExtractedJob,
  validateFitAnalysis,
  validateCvRewrite,
  validateBulletArray,
  validateInterviewQuestions,
  validateRankedBullets,
} from './validate-ai-output'

describe('validateExtractedJob', () => {
  const valid = { company: 'Acme', role: 'Engineer', requirements: ['TypeScript'] }

  it('accepts a well-formed job', () => {
    expect(() => validateExtractedJob(valid)).not.toThrow()
  })

  it.each([null, undefined, 'string', 42])('rejects non-object %s', (input) => {
    expect(() => validateExtractedJob(input)).toThrow('AI returned non-object')
  })

  it('rejects a missing company', () => {
    expect(() => validateExtractedJob({ ...valid, company: undefined })).toThrow('missing company')
  })

  it('rejects a missing role', () => {
    expect(() => validateExtractedJob({ ...valid, role: 123 })).toThrow('missing role')
  })

  it('rejects requirements that are not an array', () => {
    expect(() => validateExtractedJob({ ...valid, requirements: 'TypeScript' })).toThrow('missing requirements array')
  })
})

describe('validateFitAnalysis', () => {
  const valid = { matched: ['a'], gaps: [], summary: 'Good fit' }

  it('accepts a well-formed analysis', () => {
    expect(() => validateFitAnalysis(valid)).not.toThrow()
  })

  it('rejects a non-object', () => {
    expect(() => validateFitAnalysis(null)).toThrow('AI returned non-object')
  })

  it('rejects missing matched array', () => {
    expect(() => validateFitAnalysis({ ...valid, matched: undefined })).toThrow('missing matched array')
  })

  it('rejects missing gaps array', () => {
    expect(() => validateFitAnalysis({ ...valid, gaps: 'none' })).toThrow('missing gaps array')
  })

  it('rejects missing summary', () => {
    expect(() => validateFitAnalysis({ ...valid, summary: null })).toThrow('missing summary')
  })
})

describe('validateCvRewrite', () => {
  it('accepts a well-formed rewrite', () => {
    const valid = { rewrittenCV: { workExperiences: [], summaryBullets: [] } }
    expect(() => validateCvRewrite(valid)).not.toThrow()
  })

  it('rejects a non-object', () => {
    expect(() => validateCvRewrite('nope')).toThrow('AI returned non-object')
  })

  it('rejects when rewrittenCV is absent', () => {
    expect(() => validateCvRewrite({})).toThrow('missing rewrittenCV')
  })

  it('rejects when rewrittenCV is not an object', () => {
    expect(() => validateCvRewrite({ rewrittenCV: 'text' })).toThrow('missing rewrittenCV')
  })

  it('rejects when workExperiences is not an array', () => {
    expect(() => validateCvRewrite({ rewrittenCV: { workExperiences: {} } })).toThrow('missing workExperiences array')
  })
})

describe('validateBulletArray', () => {
  it('accepts an array of bullets with text', () => {
    expect(() => validateBulletArray([{ text: 'a' }, { text: 'b', extra: 1 }])).not.toThrow()
  })

  it('accepts an empty array', () => {
    expect(() => validateBulletArray([])).not.toThrow()
  })

  it('rejects a non-array', () => {
    expect(() => validateBulletArray({ text: 'a' })).toThrow('non-array for bullets')
  })

  it('rejects a bullet without a text field', () => {
    expect(() => validateBulletArray([{ text: 'ok' }, { body: 'missing' }])).toThrow('missing text field')
  })

  it('rejects a null entry', () => {
    expect(() => validateBulletArray([null])).toThrow('missing text field')
  })

  it('rejects a bullet whose text is not a string', () => {
    expect(() => validateBulletArray([{ text: 42 }])).toThrow('missing text field')
  })
})

describe('validateInterviewQuestions', () => {
  it('accepts a non-empty array', () => {
    expect(() => validateInterviewQuestions([{ question: 'Why us?', type: 'motivation' }])).not.toThrow()
  })

  it('rejects a non-array', () => {
    expect(() => validateInterviewQuestions({})).toThrow('non-array for questions')
  })

  it('rejects an empty array', () => {
    expect(() => validateInterviewQuestions([])).toThrow('empty questions array')
  })
})

describe('validateRankedBullets', () => {
  it('accepts an array', () => {
    expect(() => validateRankedBullets([])).not.toThrow()
    expect(() => validateRankedBullets([{ id: '1', score: 9, recommend: true }])).not.toThrow()
  })

  it('rejects a non-array', () => {
    expect(() => validateRankedBullets(null)).toThrow('non-array for ranked bullets')
  })
})
