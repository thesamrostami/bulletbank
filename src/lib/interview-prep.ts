type SnapshotBullet = {
  bullet_id: string
  text: string
  type: string
  has_metric?: boolean
  metric_text?: string | null
  star_story?: string | null
}

export type PrepVersion = {
  generatedAt: string
  questions: unknown[]
  applicationBullets: SnapshotBullet[]
  metricBullets: SnapshotBullet[]
  coverLetter: string | null
  gaps: string[]
}

export type StoredPrep = {
  current: PrepVersion
  history: PrepVersion[]
}

export function asStoredPrep(raw: unknown): StoredPrep | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  if (!obj.current || typeof obj.current !== 'object' || Array.isArray(obj.current)) return null
  return raw as StoredPrep
}
