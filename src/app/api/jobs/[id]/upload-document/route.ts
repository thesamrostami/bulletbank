import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stripPII } from '@/lib/strip-pii'
import { AI_MODEL } from '@/lib/config'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as {
  extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>
}

async function extractCvText(file: File, ext: string): Promise<string> {
  const bytes = await file.arrayBuffer()

  if (ext === 'pdf') {
    const base64 = Buffer.from(bytes).toString('base64')
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
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return result.value
  }

  if (ext === 'txt') {
    return new TextDecoder().decode(bytes)
  }

  return ''
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Outer try/catch: formData() on a malformed body would otherwise throw unhandled
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as 'cv' | 'cover_letter'

  if (!file || !type) return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
    return NextResponse.json({ error: 'Only PDF, Word, and text documents accepted' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }

  const path = `${user.id}/${id}/${type}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-documents')
    .upload(path, file, { upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signedData, error: signedError } = await supabase.storage
    .from('job-documents')
    .createSignedUrl(path, 604800)
  if (signedError || !signedData) {
    return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
  }

  const updateData: Record<string, unknown> = type === 'cv'
    ? { own_cv_url: signedData.signedUrl, own_cv_filename: file.name }
    : { own_cover_letter_url: signedData.signedUrl, own_cover_letter_filename: file.name }

  if (type === 'cv') {
    try {
      const raw = await extractCvText(file, ext)
      updateData.own_cv_text = stripPII(raw).slice(0, 6000)
    } catch (err) {
      console.error('[upload-document] CV text extraction failed:', err)
    }
  }

  // Scope to the caller's own jobs — consistent with every other jobs query
  const { data: job } = await supabase
    .from('jobs')
    .select('cv_snapshot, cover_letter, own_cv_url, own_cover_letter_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  let document_source: 'generated' | 'uploaded' | 'mixed' = 'uploaded'
  if (type === 'cv' && (job?.cover_letter || job?.own_cover_letter_url)) {
    document_source = 'mixed'
  }
  if (type === 'cover_letter' && (job?.cv_snapshot || job?.own_cv_url)) {
    document_source = 'mixed'
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update({ ...updateData, document_source })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) console.error('[upload-document] DB update failed:', updateError)

  return NextResponse.json({
    url: signedData.signedUrl,
    filename: file.name,
    cvTextExtracted: type === 'cv' ? (!!updateData.own_cv_text && !updateError) : undefined,
  })
  } catch (err) {
    console.error('[upload-document POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
