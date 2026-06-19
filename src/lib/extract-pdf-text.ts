import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/config'
import { stripPII } from '@/lib/strip-pii'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Extracts the raw text from a base64-encoded PDF via a lightweight Anthropic
 * call, then runs {@link stripPII} on the result. Sending the stripped plain
 * text to downstream prompts (instead of a raw `document` block) prevents
 * personal contact details embedded in the PDF from reaching the model.
 *
 * Mirrors the extraction approach in jobs/[id]/upload-document/route.ts.
 */
export async function extractPdfText(base64: string): Promise<string> {
  const message = await anthropic.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    betas: ['pdfs-2024-09-25'],
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: 'Extract all text from this CV/resume. Return only the raw text content, preserving the structure (headings, bullet points, dates). No JSON, no commentary.',
        },
      ],
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return stripPII(raw)
}
