import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export { anthropic }

export type TemperatureProfile = 'deterministic' | 'balanced' | 'creative'

const TEMPERATURE_MAP: Record<TemperatureProfile, number> = {
  deterministic: 0,
  balanced: 0.3,
  creative: 0.6,
}

interface CallOptions {
  system: string
  userContent?: string | Anthropic.Messages.ContentBlockParam[]
  messages?: Anthropic.Messages.MessageParam[]
  maxTokens?: number
  temperature?: TemperatureProfile
}

interface StreamOptions {
  system: string
  userContent?: string | Anthropic.Messages.ContentBlockParam[]
  messages?: Anthropic.Messages.MessageParam[]
  maxTokens?: number
  temperature?: TemperatureProfile
}

export async function callClaude(opts: CallOptions): Promise<Anthropic.Messages.Message> {
  const temp = TEMPERATURE_MAP[opts.temperature ?? 'balanced']
  const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: temp,
    system: opts.system,
    messages: opts.messages ?? [{ role: 'user', content: opts.userContent! }],
  }

  try {
    return await anthropic.messages.create(params)
  } catch (err: unknown) {
    if (isRetryable(err)) {
      await sleep(2000)
      return await anthropic.messages.create(params)
    }
    throw err
  }
}

export async function streamClaude(opts: StreamOptions) {
  const temp = TEMPERATURE_MAP[opts.temperature ?? 'balanced']
  const params: Anthropic.Messages.MessageCreateParamsStreaming = {
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: temp,
    system: opts.system,
    messages: opts.messages ?? [{ role: 'user', content: opts.userContent! }],
    stream: true,
  }

  try {
    return await anthropic.messages.stream(params)
  } catch (err: unknown) {
    if (isRetryable(err)) {
      await sleep(2000)
      return await anthropic.messages.stream(params)
    }
    throw err
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status >= 500 || err.status === 429
  }
  if (err instanceof Error && ('code' in err || err.message.includes('fetch'))) {
    return true
  }
  return false
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
