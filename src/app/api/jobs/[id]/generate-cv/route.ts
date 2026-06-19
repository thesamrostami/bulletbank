import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Packer } from 'docx'
import { buildCvDocument, type TemplateName } from '@/lib/cv-templates'
import type { CVSnapshot } from '@/types'

// Primary download route used by the CV editor. Builds the .docx AND persists
// cv_snapshot + preferred_cv_template back to the job record on each download.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { id } = await params
    const body = await req.json() as { cvSnapshot: CVSnapshot; template?: TemplateName }
    const { cvSnapshot } = body
    const template: TemplateName = body.template ?? 'clean'

    const doc = buildCvDocument(cvSnapshot, template)
    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    // Save cv_snapshot and last-used template to job record
    // Check the error: a failed update previously lost the snapshot silently
    const { error: snapshotError } = await supabase.from('jobs')
      .update({ cv_snapshot: cvSnapshot, preferred_cv_template: template })
      .eq('id', id)
      .eq('user_id', user.id)

    if (snapshotError) {
      console.error('[generate-cv] Failed to save cv_snapshot:', snapshotError.message)
    }

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="CV.docx"`,
      },
    })
  } catch (err) {
    console.error('[generate-cv POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
