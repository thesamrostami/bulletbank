import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Packer } from 'docx'
import { buildCvDocument, type TemplateName } from '@/lib/cv-templates'
import type { CVSnapshot } from '@/types'

// Stateless re-download route used by JobDetailClient. Does NOT update the job
// record — snapshot was already saved when the CV was first downloaded via
// /api/jobs/[id]/generate-cv.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json() as { cvSnapshot: CVSnapshot; template?: TemplateName; filename?: string }
    const { cvSnapshot, filename = 'CV.docx' } = body
    const template: TemplateName = body.template ?? 'clean'

    if (!cvSnapshot || typeof cvSnapshot !== 'object') {
      return NextResponse.json({ error: 'cvSnapshot is required', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const doc = buildCvDocument(cvSnapshot, template)
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[cv/download/docx POST]', err)
    return NextResponse.json({ error: 'Failed to generate document', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
