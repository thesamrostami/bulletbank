import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PDFDocument from 'pdfkit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json() as { coverLetterText: string; filename?: string }
    const { coverLetterText, filename = 'CoverLetter.pdf' } = body

    if (!coverLetterText || typeof coverLetterText !== 'string') {
      return NextResponse.json({ error: 'coverLetterText is required', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, location_city, location_country, linkedin_url')
      .eq('user_id', user.id)
      .single()

    const buffer = await buildCoverLetterPdf(coverLetterText, profile)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[cover-letter/download-pdf POST]', err)
    return NextResponse.json({ error: 'Failed to generate PDF', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

interface ProfileData {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  location_city?: string | null
  location_country?: string | null
  linkedin_url?: string | null
}

function buildCoverLetterPdf(text: string, profile?: ProfileData | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 72, bottom: 72, left: 72, right: 72 } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const ML = doc.page.margins.left
    const W = doc.page.width - ML - doc.page.margins.right

    // ── Header: name + contact ──
    const name = profile?.full_name || ''
    const contactParts = [
      profile?.email,
      profile?.phone,
      profile?.location_city && profile?.location_country
        ? `${profile.location_city}, ${profile.location_country}`
        : profile?.location_city || profile?.location_country,
      profile?.linkedin_url,
    ].filter((v): v is string => !!v)

    if (name) {
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text(name)
      doc.moveDown(0.2)
    }
    if (contactParts.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555').text(contactParts.join('  |  '))
      doc.fillColor('#000000')
      const lineY = doc.y + 4
      doc.moveTo(ML, lineY).lineTo(ML + W, lineY).strokeColor('#CCCCCC').lineWidth(0.5).stroke()
      doc.moveDown(1.2)
    } else {
      doc.moveDown(0.5)
    }

    // ── Date ──
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.fontSize(10).font('Helvetica').fillColor('#000000').text(today)
    doc.moveDown(0.8)

    // ── Body paragraphs ──
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    doc.fontSize(10.5).font('Helvetica')
    paragraphs.forEach((p, i) => {
      if (i > 0) doc.moveDown(0.6)
      doc.text(p, { lineGap: 3 })
    })

    // ── Sign-off ──
    doc.moveDown(1)
    doc.fontSize(10.5).font('Helvetica').text('Yours sincerely,')
    doc.moveDown(1.5)
    if (name) doc.fontSize(10.5).font('Helvetica-Bold').text(name)

    doc.end()
  })
}
