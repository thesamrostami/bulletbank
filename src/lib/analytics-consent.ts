export const CONSENT_KEY = 'applybullets_analytics_consent'
export type ConsentValue = 'accepted' | 'rejected' | null

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CONSENT_KEY) as ConsentValue
  } catch {
    return null
  }
}

export function setConsent(value: 'accepted' | 'rejected'): void {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {}
}
