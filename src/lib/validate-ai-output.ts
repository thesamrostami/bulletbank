export function validateExtractedJob(data: unknown): asserts data is { company: string; role: string; requirements: string[] } {
  if (!data || typeof data !== 'object') throw new Error('AI returned non-object')
  const d = data as Record<string, unknown>
  if (typeof d.company !== 'string') throw new Error('AI output missing company')
  if (typeof d.role !== 'string') throw new Error('AI output missing role')
  if (!Array.isArray(d.requirements)) throw new Error('AI output missing requirements array')
}

export function validateFitAnalysis(data: unknown): asserts data is { matched: string[]; gaps: string[]; summary: string } {
  if (!data || typeof data !== 'object') throw new Error('AI returned non-object')
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.matched)) throw new Error('AI output missing matched array')
  if (!Array.isArray(d.gaps)) throw new Error('AI output missing gaps array')
  if (typeof d.summary !== 'string') throw new Error('AI output missing summary')
}

export function validateCvRewrite(data: unknown): asserts data is { rewrittenCV: { workExperiences: unknown[]; summaryBullets: unknown[] } } {
  if (!data || typeof data !== 'object') throw new Error('AI returned non-object')
  const d = data as Record<string, unknown>
  const cv = d.rewrittenCV as Record<string, unknown> | undefined
  if (!cv || typeof cv !== 'object') throw new Error('AI output missing rewrittenCV')
  if (!Array.isArray(cv.workExperiences)) throw new Error('AI output missing workExperiences array')
}

export function validateBulletArray(data: unknown): asserts data is Array<{ text: string }> {
  if (!Array.isArray(data)) throw new Error('AI returned non-array for bullets')
  for (const item of data) {
    if (!item || typeof item !== 'object' || typeof (item as Record<string, unknown>).text !== 'string') {
      throw new Error('AI bullet missing text field')
    }
  }
}

export function validateInterviewQuestions(data: unknown): asserts data is Array<{ question: string; type: string }> {
  if (!Array.isArray(data)) throw new Error('AI returned non-array for questions')
  if (data.length === 0) throw new Error('AI returned empty questions array')
}

export function validateRankedBullets(data: unknown): asserts data is Array<{ id: string; score: number; recommend: boolean }> {
  if (!Array.isArray(data)) throw new Error('AI returned non-array for ranked bullets')
}
