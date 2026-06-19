/**
 * Client-side bullet deduplication using Jaccard similarity on word sets.
 * Used to flag visually similar bullets in the CV output.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'have', 'had', 'has', 'do', 'did', 'will', 'would', 'could', 'should',
  'my', 'our', 'their', 'its', 'this', 'that', 'i', 'we', 'it',
])

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  return intersection.size / union.size
}

export interface DuplicateFlag {
  bulletA: string
  bulletB: string
  similarity: number
}

/** Returns pairs of bullet texts that are suspiciously similar (threshold 0.6). */
export function findDuplicateBullets(
  bullets: string[],
  threshold = 0.6
): DuplicateFlag[] {
  const flags: DuplicateFlag[] = []
  const tokenised = bullets.map(tokenise)

  for (let i = 0; i < bullets.length; i++) {
    for (let j = i + 1; j < bullets.length; j++) {
      const sim = jaccardSimilarity(tokenised[i], tokenised[j])
      if (sim >= threshold) {
        flags.push({ bulletA: bullets[i], bulletB: bullets[j], similarity: sim })
      }
    }
  }

  return flags
}

/** Check whether a bullet substantially overlaps with a role description. */
export function bulletOverlapsDescription(
  bulletText: string,
  description: string,
  threshold = 0.55
): boolean {
  if (!description) return false
  const sim = jaccardSimilarity(tokenise(bulletText), tokenise(description))
  return sim >= threshold
}

/** Given a list of bullet objects with ids and texts, return ids that are near-duplicates. */
export function flagDuplicateIds(
  bullets: Array<{ id: string; text: string }>,
  threshold = 0.6
): Set<string> {
  const flagged = new Set<string>()
  const tokenised = bullets.map(b => ({ id: b.id, tokens: tokenise(b.text) }))

  for (let i = 0; i < tokenised.length; i++) {
    for (let j = i + 1; j < tokenised.length; j++) {
      const sim = jaccardSimilarity(tokenised[i].tokens, tokenised[j].tokens)
      if (sim >= threshold) {
        flagged.add(tokenised[i].id)
        flagged.add(tokenised[j].id)
      }
    }
  }

  return flagged
}
