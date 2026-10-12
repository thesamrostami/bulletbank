export const CREDIT_COSTS: Record<string, number> = {
  job_extraction:    1,
  fit_analysis:      1,
  cv_rewrite:        3,
  cv_refine:         1,
  cover_letter:      2,
  cover_letter_refine: 1,
  interview_prep:    2,
  bullet_generation: 1,
  bullet_rewrite:    1,
  chat_message:      1,
  profile_extraction: 1,
  review_pack:       3,
}

export const CREDIT_LABELS: Record<string, string> = {
  job_extraction:    'Job import',
  fit_analysis:      'Fit analysis',
  cv_rewrite:        'CV generation',
  cv_refine:         'CV refinement',
  cover_letter:      'Cover letter',
  cover_letter_refine: 'Cover letter refinement',
  interview_prep:    'Interview prep',
  bullet_generation: 'Bullet generation',
  bullet_rewrite:    'Bullet rewrite',
  chat_message:      'AI chat',
  profile_extraction: 'Profile import',
  review_pack:       'Review pack',
}

export const SIGNUP_CREDITS = 150

export const CREDIT_PACKS = [
  { id: 'starter',  credits: 100, price: 499,  label: '100 credits', priceLabel: '£4.99' },
  { id: 'standard', credits: 250, price: 999,  label: '250 credits', priceLabel: '£9.99' },
  { id: 'pro',      credits: 600, price: 2499, label: '600 credits', priceLabel: '£24.99' },
] as const

export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] ?? 1
}

export function getCreditLabel(action: string): string {
  return CREDIT_LABELS[action] ?? action.replace(/_/g, ' ')
}
