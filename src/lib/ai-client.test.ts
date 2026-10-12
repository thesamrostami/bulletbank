import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { anthropic, callClaude, streamClaude } from './ai-client'
import { AI_MODEL } from './config'

const fakeMessage = { id: 'msg_1', content: [{ type: 'text', text: 'ok' }] } as unknown as Anthropic.Messages.Message

function apiError(status: number) {
  return new Anthropic.APIError(status, undefined, `HTTP ${status}`, undefined)
}

/** Runs an async op that may call sleep(2000) internally; advances fake timers so it completes. */
async function withRetryTimers<T>(op: () => Promise<T>): Promise<T> {
  const p = op()
  await vi.advanceTimersByTimeAsync(2000)
  return p
}

let create: ReturnType<typeof vi.spyOn>
let stream: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.useFakeTimers()
  create = vi.spyOn(anthropic.messages, 'create')
  stream = vi.spyOn(anthropic.messages, 'stream')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('callClaude', () => {
  it('builds the request with sensible defaults', async () => {
    create.mockResolvedValue(fakeMessage)
    const result = await callClaude({ system: 'You are helpful', userContent: 'Hi' })

    expect(result).toBe(fakeMessage)
    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith({
      model: AI_MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      system: 'You are helpful',
      messages: [{ role: 'user', content: 'Hi' }],
    })
  })

  it.each([
    ['deterministic', 0],
    ['balanced', 0.3],
    ['creative', 0.6],
  ] as const)('maps the %s profile to temperature %s', async (profile, temp) => {
    create.mockResolvedValue(fakeMessage)
    await callClaude({ system: 's', userContent: 'u', temperature: profile })
    expect(create.mock.calls[0][0]).toMatchObject({ temperature: temp })
  })

  it('honours a custom max_tokens', async () => {
    create.mockResolvedValue(fakeMessage)
    await callClaude({ system: 's', userContent: 'u', maxTokens: 512 })
    expect(create.mock.calls[0][0]).toMatchObject({ max_tokens: 512 })
  })

  it('uses an explicit messages array when provided', async () => {
    create.mockResolvedValue(fakeMessage)
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]
    await callClaude({ system: 's', messages })
    expect(create.mock.calls[0][0]).toMatchObject({ messages })
  })

  it('retries once after a 5xx and returns the second result', async () => {
    create.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(fakeMessage)
    const result = await withRetryTimers(() => callClaude({ system: 's', userContent: 'u' }))
    expect(result).toBe(fakeMessage)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('retries once after a 429', async () => {
    create.mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce(fakeMessage)
    await withRetryTimers(() => callClaude({ system: 's', userContent: 'u' }))
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('retries once after a network-level error', async () => {
    const netErr = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })
    create.mockRejectedValueOnce(netErr).mockResolvedValueOnce(fakeMessage)
    await withRetryTimers(() => callClaude({ system: 's', userContent: 'u' }))
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('waits 2 seconds before retrying', async () => {
    create.mockRejectedValueOnce(apiError(500)).mockResolvedValueOnce(fakeMessage)
    const p = callClaude({ system: 's', userContent: 'u' })
    await vi.advanceTimersByTimeAsync(1999)
    expect(create).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx client error', async () => {
    create.mockRejectedValue(apiError(400))
    await expect(callClaude({ system: 's', userContent: 'u' })).rejects.toThrow('HTTP 400')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not retry an unrelated error', async () => {
    create.mockRejectedValue(new Error('bad input'))
    await expect(callClaude({ system: 's', userContent: 'u' })).rejects.toThrow('bad input')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('gives up after one retry', async () => {
    create.mockRejectedValue(apiError(500))
    const p = callClaude({ system: 's', userContent: 'u' })
    // Attach the rejection handler before advancing timers so the failure is not "unhandled".
    const assertion = expect(p).rejects.toThrow('HTTP 500')
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
    expect(create).toHaveBeenCalledTimes(2)
  })
})

describe('streamClaude', () => {
  const fakeStream = { on: vi.fn() } as unknown as Awaited<ReturnType<typeof anthropic.messages.stream>>

  it('requests a streaming response with the same defaults', async () => {
    stream.mockResolvedValue(fakeStream)
    const result = await streamClaude({ system: 'sys', userContent: 'u', temperature: 'creative' })
    expect(result).toBe(fakeStream)
    expect(stream).toHaveBeenCalledWith({
      model: AI_MODEL,
      max_tokens: 2048,
      temperature: 0.6,
      system: 'sys',
      messages: [{ role: 'user', content: 'u' }],
      stream: true,
    })
  })

  it('retries once on a retryable error', async () => {
    stream.mockRejectedValueOnce(apiError(529)).mockResolvedValueOnce(fakeStream)
    const result = await withRetryTimers(() => streamClaude({ system: 's', userContent: 'u' }))
    expect(result).toBe(fakeStream)
    expect(stream).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx', async () => {
    stream.mockRejectedValue(apiError(401))
    await expect(streamClaude({ system: 's', userContent: 'u' })).rejects.toThrow('HTTP 401')
    expect(stream).toHaveBeenCalledTimes(1)
  })
})
