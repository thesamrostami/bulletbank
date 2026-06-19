import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildCvPdf } from '@/lib/cv-pdf'
import type { CVSnapshot } from '@/types'
import type { TemplateName } from '@/lib/cv-templates'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json() as { cvSnapshot: CVSnapshot; template?: TemplateName; filename?: string; jobTitle?: string; jobRequirements?: string }
    const { cvSnapshot, filename = 'CV.pdf', jobTitle, jobRequirements } = body
    const template: TemplateName = body.template ?? 'clean'

    if (!cvSnapshot || typeof cvSnapshot !== 'object') {
      return NextResponse.json({ error: 'cvSnapshot is required', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const buffer = await buildCvPdf(cvSnapshot, template, jobTitle, jobRequirements)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[cv/download/pdf POST]', err)
    return NextResponse.json({ error: 'Failed to generate PDF', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
