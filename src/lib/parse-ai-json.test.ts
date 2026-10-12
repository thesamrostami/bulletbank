import { describe, it, expect } from 'vitest'
import { parseAIJson, extractText } from './parse-ai-json'

describe('parseAIJson', () => {
  it('parses plain JSON', () => {
    expect(parseAIJson('{"score": 82}')).toEqual({ score: 82 })
  })

  it('parses JSON wrapped in ```json fences', () => {
    expect(parseAIJson('```json\n{"score": 82}\n```')).toEqual({ score: 82 })
  })

  it('parses JSON wrapped in plain ``` fences', () => {
    expect(parseAIJson('```\n{"a": 1}\n```')).toEqual({ a: 1 })
  })

  it('parses top-level arrays', () => {
    expect(parseAIJson('[{"text": "a"}, {"text": "b"}]')).toEqual([{ text: 'a' }, { text: 'b' }])
  })

  it('ignores leading and trailing whitespace', () => {
    expect(parseAIJson('  \n {"ok": true} \n\n')).toEqual({ ok: true })
  })

  it('recovers an object when the model adds trailing commentary', () => {
    const raw = '{"company": "Acme"}\n\nLet me know if you need anything else!'
    expect(parseAIJson(raw)).toEqual({ company: 'Acme' })
  })

  it('recovers an array when the model adds trailing commentary', () => {
    const raw = '[1, 2, 3]\nHope this helps.'
    expect(parseAIJson(raw)).toEqual([1, 2, 3])
  })

  it('throws a descriptive error when no JSON can be recovered', () => {
    expect(() => parseAIJson('Sorry, I cannot help with that.')).toThrow(/Failed to parse AI JSON response/)
  })

  it('includes a preview of the bad input in the error', () => {
    expect(() => parseAIJson('not json at all')).toThrow(/not json at all/)
  })

  it('truncates the error preview to 200 chars', () => {
    const long = 'x'.repeat(500)
    let message = ''
    try { parseAIJson(long) } catch (e) { message = (e as Error).message }
    const preview = message.split('First 200 chars: ')[1]
    expect(preview).toHaveLength(200)
  })

  it('supports a generic return type', () => {
    const result = parseAIJson<{ n: number }>('{"n": 5}')
    expect(result.n + 1).toBe(6)
  })
})

describe('extractText', () => {
  it('returns the text of the first text block', () => {
    const msg = { content: [{ type: 'text', text: 'hello' }] }
    expect(extractText(msg)).toBe('hello')
  })

  it('trims surrounding whitespace', () => {
    const msg = { content: [{ type: 'text', text: '  hi  \n' }] }
    expect(extractText(msg)).toBe('hi')
  })

  it('skips non-text blocks', () => {
    const msg = { content: [{ type: 'tool_use' }, { type: 'text', text: 'after tool' }] }
    expect(extractText(msg)).toBe('after tool')
  })

  it('returns empty string when there is no text block', () => {
    expect(extractText({ content: [] })).toBe('')
    expect(extractText({ content: [{ type: 'image' }] })).toBe('')
  })
})
