import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    await params
    const { coverLetterText }: { coverLetterText: string } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, location_city, location_country, linkedin_url')
      .eq('user_id', user.id)
      .single()

    const font = 'Calibri'
    const name = profile?.full_name || ''
    const contactParts = [
      profile?.email,
      profile?.phone,
      profile?.location_city && profile?.location_country
        ? `${profile.location_city}, ${profile.location_country}`
        : profile?.location_city || profile?.location_country,
      profile?.linkedin_url,
    ].filter(Boolean) as string[]

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const paragraphs = coverLetterText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

    const children: Paragraph[] = [
      // Name
      new Paragraph({
        children: [new TextRun({ text: name, bold: true, size: 32, font })],
        spacing: { after: 20 },
      }),
      // Contact
      new Paragraph({
        children: [new TextRun({ text: contactParts.join('  |  '), size: 19, color: '555555', font })],
        spacing: { after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 6 } },
      }),
      new Paragraph({ children: [], spacing: { after: 200 } }),
      // Date
      new Paragraph({
        children: [new TextRun({ text: today, size: 20, font })],
        spacing: { after: 200 },
      }),
      // Salutation
      new Paragraph({
        children: [new TextRun({ text: 'Dear Hiring Team,', size: 20, font })],
        spacing: { after: 160 },
      }),
      // Body paragraphs
      ...paragraphs.map(p =>
        new Paragraph({
          children: [new TextRun({ text: p, size: 20, font })],
          spacing: { after: 160 },
        })
      ),
      // Sign-off
      new Paragraph({
        children: [new TextRun({ text: 'Yours sincerely,', size: 20, font })],
        spacing: { before: 240, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: name, bold: true, size: 20, font })],
      }),
    ]

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      }],
    })
    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="CoverLetter.docx"',
      },
    })
  } catch (err) {
    console.error('[generate-cover-letter-doc POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
