export function parseAIJson<T = unknown>(raw: string): T {
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch { /* continue */ }

  const lastBrace = clean.lastIndexOf('}')
  if (lastBrace > 0) {
    try {
      return JSON.parse(clean.slice(0, lastBrace + 1))
    } catch { /* continue */ }
  }

  const lastBracket = clean.lastIndexOf(']')
  if (lastBracket > 0) {
    try {
      return JSON.parse(clean.slice(0, lastBracket + 1))
    } catch { /* continue */ }
  }

  throw new Error(`Failed to parse AI JSON response. First 200 chars: ${clean.slice(0, 200)}`)
}

export function extractText(message: { content: Array<{ type: string; text?: string }> }): string {
  const block = message.content.find(b => b.type === 'text')
  return block?.text?.trim() ?? ''
}
