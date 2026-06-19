import PDFDocument from 'pdfkit'
import type { CVSnapshot } from '@/types'
import type { TemplateName } from '@/lib/cv-templates'

function fmtDate(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

const TECH_KEYWORDS_PDF = [
  'engineer', 'developer', 'software', 'frontend', 'backend', 'fullstack', 'full-stack',
  'devops', 'data', 'ml', 'ai', 'machine learning', 'cloud', 'infrastructure', 'sre',
  'platform', 'mobile', 'ios', 'android', 'security', 'cybersecurity', 'architect',
  'programmer', 'coding', 'technical', 'technology', 'systems', 'it ', 'web',
]

function isTechRolePdf(jobTitle?: string | null, jobRequirements?: string | null): boolean {
  if (!jobTitle && !jobRequirements) return true
  const text = `${jobTitle ?? ''} ${jobRequirements ?? ''}`.toLowerCase()
  return TECH_KEYWORDS_PDF.some(kw => text.includes(kw))
}

function contactLine(
  profile: CVSnapshot['profile'],
  jobTitle?: string | null,
  jobRequirements?: string | null
): string[] {
  const websiteUrl = profile.portfolio_url || profile.website_url || null
  const additionalUrls = (profile.additional_links || [])
    .filter(link => {
      if (!link.url) return false
      if (link.label.toLowerCase().includes('github')) return isTechRolePdf(jobTitle, jobRequirements)
      return true
    })
    .map(link => link.url)
  return [
    profile.email,
    profile.phone,
    [profile.location_city, profile.location_country].filter(Boolean).join(', ') || null,
    profile.linkedin_url,
    websiteUrl,
    ...additionalUrls,
  ].filter((v): v is string => !!v)
}

// ─── Clean ─────────────────────────────────────────────────────────────────────
// Calibri (Helvetica) · 1" margins · 24pt name · grey headings + thin grey rule

function buildClean(snap: CVSnapshot, doc: PDFKit.PDFDocument, jobTitle?: string | null, jobRequirements?: string | null): void {
  const { profile, workExperiences, education, certifications } = snap
  const ML = doc.page.margins.left
  const W = doc.page.width - ML - doc.page.margins.right

  const heading = (title: string) => {
    doc.moveDown(0.5)
       .fontSize(9.5).font('Helvetica-Bold').fillColor('#666666')
       .text(title.toUpperCase())
    const y = doc.y
    doc.moveTo(ML, y).lineTo(ML + W, y).strokeColor('#CCCCCC').lineWidth(0.5).stroke()
    doc.fillColor('#000000').moveDown(0.3)
  }

  doc.fontSize(24).font('Helvetica-Bold').text(profile.full_name || '')
  doc.moveDown(0.15)

  const cp = contactLine(profile, jobTitle, jobRequirements)
  if (cp.length) {
    doc.fontSize(9).font('Helvetica').fillColor('#555555').text(cp.join('  |  '))
    doc.fillColor('#000000')
  }
  if (profile.positioning_headline) {
    doc.moveDown(0.2).fontSize(10).font('Helvetica-Bold').fillColor('#333333')
       .text(profile.positioning_headline)
    doc.fillColor('#000000')
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) { heading('SUMMARY'); doc.fontSize(9.5).font('Helvetica').text(summaryText) }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 14)
  if (skills.length) { heading('SKILLS'); doc.fontSize(9.5).font('Helvetica').text(skills.join('  ·  ')) }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    heading('KEY HIGHLIGHTS')
    doc.fontSize(9.5).font('Helvetica')
       .list(highlights.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
  }

  const visibleWE = workExperiences.filter(we => we.bullets?.length)
  if (visibleWE.length) {
    heading('EXPERIENCE')
    for (const we of visibleWE) {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(`${we.title || ''} — ${we.company || ''}`)
      doc.fontSize(9).font('Helvetica').fillColor('#666666')
         .text(`${fmtDate(we.start_date)} – ${we.is_current ? 'Present' : fmtDate(we.end_date)}`)
      doc.fillColor('#000000').moveDown(0.1)
      doc.fontSize(9.5).font('Helvetica')
         .list(we.bullets.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
      doc.moveDown(0.3)
    }
  }

  if (education.length) {
    heading('EDUCATION')
    for (const e of education) {
      const line = [e.institution, e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study, e.grade ? `(${e.grade})` : null].filter(Boolean).join(' — ')
      doc.fontSize(9.5).font('Helvetica').text(`${line}  ·  ${fmtDate(e.start_date)} – ${e.is_current ? 'Present' : fmtDate(e.end_date)}`)
      doc.moveDown(0.15)
    }
  }
  if (certifications.length) {
    heading('CERTIFICATIONS')
    doc.fontSize(9.5).font('Helvetica').text(certifications.map(c => c.name).filter(Boolean).join('  ·  '))
  }
}

// ─── Executive ─────────────────────────────────────────────────────────────────
// Times-Roman (Georgia) · 1" margins · 28pt name with thick navy underline · navy headings

function buildExecutive(snap: CVSnapshot, doc: PDFKit.PDFDocument, jobTitle?: string | null, jobRequirements?: string | null): void {
  const { profile, workExperiences, education, certifications } = snap
  const ML = doc.page.margins.left
  const W = doc.page.width - ML - doc.page.margins.right
  const NAVY = '#1B2A4A'

  const heading = (title: string) => {
    doc.moveDown(0.55)
       .fontSize(9).font('Times-Roman').fillColor(NAVY)
       .text(title.toUpperCase(), { characterSpacing: 0.4 })
    const y = doc.y
    doc.moveTo(ML, y).lineTo(ML + W, y).strokeColor(NAVY).lineWidth(1).stroke()
    doc.fillColor('#000000').moveDown(0.35)
  }

  // Name with thick navy rule below
  doc.fontSize(28).font('Times-BoldItalic').fillColor('#000000').text(profile.full_name || '')
  const nameBottom = doc.y
  doc.moveTo(ML, nameBottom).lineTo(ML + W, nameBottom).strokeColor(NAVY).lineWidth(2).stroke()
  doc.moveDown(0.4)

  const cp = contactLine(profile, jobTitle, jobRequirements)
  if (cp.length) {
    doc.fontSize(9).font('Times-Roman').fillColor('#555555').text(cp.join('   ·   '))
    doc.fillColor('#000000')
  }
  if (profile.positioning_headline) {
    doc.moveDown(0.25).fontSize(10).font('Times-Roman').fillColor(NAVY)
       .text(profile.positioning_headline)
    doc.fillColor('#000000')
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) { heading('SUMMARY'); doc.fontSize(10).font('Times-Roman').text(summaryText) }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 14)
  if (skills.length) { heading('SKILLS'); doc.fontSize(10).font('Times-Roman').text(skills.join('   ·   ')) }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    heading('KEY HIGHLIGHTS')
    doc.fontSize(10).font('Times-Roman')
       .list(highlights.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
  }

  const visibleWE = workExperiences.filter(we => we.bullets?.length)
  if (visibleWE.length) {
    heading('EXPERIENCE')
    for (const we of visibleWE) {
      doc.fontSize(10.5).font('Times-Bold').text(`${we.title || ''} — ${we.company || ''}`)
      doc.fontSize(9).font('Times-Roman').fillColor('#666666')
         .text(`${fmtDate(we.start_date)} – ${we.is_current ? 'Present' : fmtDate(we.end_date)}`)
      doc.fillColor('#000000').moveDown(0.1)
      doc.fontSize(10).font('Times-Roman')
         .list(we.bullets.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
      doc.moveDown(0.3)
    }
  }

  if (education.length) {
    heading('EDUCATION')
    for (const e of education) {
      const line = [e.institution, e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study, e.grade ? `(${e.grade})` : null].filter(Boolean).join(' — ')
      doc.fontSize(10).font('Times-Roman').text(`${line}  ·  ${fmtDate(e.start_date)} – ${e.is_current ? 'Present' : fmtDate(e.end_date)}`)
      doc.moveDown(0.15)
    }
  }
  if (certifications.length) {
    heading('CERTIFICATIONS')
    doc.fontSize(10).font('Times-Roman').text(certifications.map(c => c.name).filter(Boolean).join('   ·   '))
  }
}

// ─── Modern ───────────────────────────────────────────────────────────────────
// Two-column: grey sidebar (29%) + main (71%) · blue accent #2563EB

function buildModern(snap: CVSnapshot, doc: PDFKit.PDFDocument, jobTitle?: string | null, jobRequirements?: string | null): void {
  const { profile, workExperiences, education, certifications } = snap
  const ML = doc.page.margins.left
  const MT = doc.page.margins.top
  const W = doc.page.width - ML - doc.page.margins.right
  const ACCENT = '#2563EB'
  const sideW = Math.round(W * 0.29)
  const gap = 12
  const mainX = ML + sideW + gap
  const mainW = W - sideW - gap
  const pageH = doc.page.height - doc.page.margins.bottom

  // Draw full-page sidebar background
  doc.rect(0, 0, ML + sideW + gap / 2, doc.page.height).fill('#F4F5F7')
  doc.fillColor('#000000')

  let sideY = MT
  let mainY = MT

  // Helper: write text in left column, advance sideY
  const sWrite = (text: string, fontSize: number, font: string, color = '#000000', opts: Record<string, unknown> = {}) => {
    doc.fontSize(fontSize).font(font).fillColor(color)
       .text(text, ML, sideY, { width: sideW, ...opts })
    sideY = doc.y
    doc.fillColor('#000000')
  }

  // Helper: write text in right column, advance mainY
  const mWrite = (text: string, fontSize: number, font: string, color = '#000000', opts: Record<string, unknown> = {}) => {
    doc.fontSize(fontSize).font(font).fillColor(color)
       .text(text, mainX, mainY, { width: mainW, ...opts })
    mainY = doc.y
    doc.fillColor('#000000')
  }

  const sideHeading = (title: string) => {
    sideY += 10
    doc.fontSize(8).font('Helvetica-Bold').fillColor(ACCENT)
       .text(title.toUpperCase(), ML, sideY, { width: sideW, characterSpacing: 0.3 })
    sideY = doc.y
    doc.moveTo(ML, sideY).lineTo(ML + sideW, sideY).strokeColor(ACCENT).lineWidth(0.5).stroke()
    sideY += 4
    doc.fillColor('#000000')
  }

  const mainHeading = (title: string) => {
    mainY += 10
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(ACCENT)
       .text(title.toUpperCase(), mainX, mainY, { width: mainW, characterSpacing: 0.3 })
    mainY = doc.y
    doc.moveTo(mainX, mainY).lineTo(mainX + mainW, mainY).strokeColor(ACCENT).lineWidth(0.5).stroke()
    mainY += 4
    doc.fillColor('#000000')
  }

  // ── Sidebar ──
  sWrite(profile.full_name || '', 14, 'Helvetica-Bold', '#111111')
  sideY += 2
  if (profile.positioning_headline) sWrite(profile.positioning_headline, 8, 'Helvetica', ACCENT)
  sideY += 4

  const cp = contactLine(profile, jobTitle, jobRequirements)
  if (cp.length) {
    sideHeading('Contact')
    for (const c of cp) { sWrite(c, 8, 'Helvetica', '#333333'); sideY += 2 }
  }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 14)
  if (skills.length) {
    sideHeading('Skills')
    for (const s of skills) { sWrite(s, 8.5, 'Helvetica'); sideY += 1 }
  }

  if (certifications.length) {
    sideHeading('Certifications')
    for (const c of certifications) { sWrite(c.name || '', 8, 'Helvetica'); sideY += 2 }
  }

  // ── Main column ──
  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) { mainHeading('Summary'); mWrite(summaryText, 9.5, 'Helvetica') }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    mainHeading('Key Highlights')
    // clamp mainY before list
    if (mainY > pageH) { doc.addPage(); doc.rect(0, 0, ML + sideW + gap / 2, doc.page.height).fill('#F4F5F7'); doc.fillColor('#000000'); mainY = doc.page.margins.top }
    doc.fontSize(9.5).font('Helvetica').fillColor('#000000')
       .list(highlights.map(b => b.text), mainX, mainY, { width: mainW, bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
    mainY = doc.y
  }

  const visibleWE = workExperiences.filter(we => we.bullets?.length)
  if (visibleWE.length) {
    mainHeading('Experience')
    for (const we of visibleWE) {
      if (mainY > pageH - 40) { doc.addPage(); doc.rect(0, 0, ML + sideW + gap / 2, doc.page.height).fill('#F4F5F7'); doc.fillColor('#000000'); mainY = doc.page.margins.top }
      mWrite(`${we.title || ''} — ${we.company || ''}`, 10, 'Helvetica-Bold')
      mWrite(`${fmtDate(we.start_date)} – ${we.is_current ? 'Present' : fmtDate(we.end_date)}`, 8.5, 'Helvetica', '#888888')
      mainY += 2
      doc.fontSize(9.5).font('Helvetica').fillColor('#000000')
         .list(we.bullets.map(b => b.text), mainX, mainY, { width: mainW, bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
      mainY = doc.y + 6
    }
  }

  if (education.length) {
    mainHeading('Education')
    for (const e of education) {
      const line = [e.institution, e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study, e.grade ? `(${e.grade})` : null].filter(Boolean).join(' — ')
      mWrite(`${line}  ·  ${fmtDate(e.start_date)} – ${e.is_current ? 'Present' : fmtDate(e.end_date)}`, 9.5, 'Helvetica')
      mainY += 3
    }
  }

  // Advance global cursor past both columns
  doc.x = ML
  doc.y = Math.max(sideY, mainY)
}

// ─── Compact ───────────────────────────────────────────────────────────────────
// Calibri (Helvetica) · 0.75" margins · 18pt name · 9pt body · tight spacing

function buildCompact(snap: CVSnapshot, doc: PDFKit.PDFDocument, jobTitle?: string | null, jobRequirements?: string | null): void {
  const { profile, workExperiences, education, certifications } = snap
  const ML = doc.page.margins.left
  const W = doc.page.width - ML - doc.page.margins.right

  const heading = (title: string) => {
    doc.moveDown(0.35)
       .fontSize(8).font('Helvetica-Bold').fillColor('#555555')
       .text(title.toUpperCase(), { characterSpacing: 0.3 })
    const y = doc.y
    doc.moveTo(ML, y).lineTo(ML + W, y).strokeColor('#CCCCCC').lineWidth(0.5).stroke()
    doc.fillColor('#000000').moveDown(0.25)
  }

  doc.fontSize(18).font('Helvetica-Bold').text(profile.full_name || '')
  doc.moveDown(0.1)

  const cp = contactLine(profile, jobTitle, jobRequirements)
  if (cp.length) {
    doc.fontSize(8).font('Helvetica').fillColor('#555555').text(cp.join('  ·  '))
    doc.fillColor('#000000')
  }
  if (profile.positioning_headline) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#333333')
       .text(profile.positioning_headline)
    doc.fillColor('#000000')
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) { heading('Summary'); doc.fontSize(9).font('Helvetica').text(summaryText) }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 16)
  if (skills.length) {
    heading('Skills')
    const half = Math.ceil(skills.length / 2)
    doc.fontSize(9).font('Helvetica').text(skills.slice(0, half).join('  ·  '))
    if (skills.length > half) {
      doc.fontSize(9).font('Helvetica').text(skills.slice(half).join('  ·  '))
    }
  }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    heading('Key Highlights')
    doc.fontSize(9).font('Helvetica')
       .list(highlights.map(b => b.text), { bulletRadius: 1.3, bulletIndent: 7, textIndent: 14, lineGap: 1 })
  }

  const visibleWE = workExperiences.filter(we => we.bullets?.length)
  if (visibleWE.length) {
    heading('Experience')
    for (const we of visibleWE) {
      doc.fontSize(9).font('Helvetica-Bold').text(`${we.title || ''} — ${we.company || ''}`)
      doc.fontSize(8.5).font('Helvetica').fillColor('#777777')
         .text(`${fmtDate(we.start_date)} – ${we.is_current ? 'Present' : fmtDate(we.end_date)}`)
      doc.fillColor('#000000').moveDown(0.05)
      doc.fontSize(9).font('Helvetica')
         .list(we.bullets.map(b => b.text), { bulletRadius: 1.3, bulletIndent: 7, textIndent: 14, lineGap: 1 })
      doc.moveDown(0.2)
    }
  }

  if (education.length) {
    heading('Education')
    for (const e of education) {
      const line = [e.institution, e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study, e.grade ? `(${e.grade})` : null].filter(Boolean).join(' — ')
      doc.fontSize(9).font('Helvetica').text(`${line}  ·  ${fmtDate(e.start_date)} – ${e.is_current ? 'Present' : fmtDate(e.end_date)}`)
      doc.moveDown(0.1)
    }
  }
  if (certifications.length) {
    heading('Certifications')
    doc.fontSize(9).font('Helvetica').text(certifications.map(c => c.name).filter(Boolean).join('  ·  '))
  }
}

// ─── Bold ──────────────────────────────────────────────────────────────────────
// Calibri (Helvetica) · 1" margins · 30pt name · dark navy filled heading bands

function buildBold(snap: CVSnapshot, doc: PDFKit.PDFDocument, jobTitle?: string | null, jobRequirements?: string | null): void {
  const { profile, workExperiences, education, certifications } = snap
  const ML = doc.page.margins.left
  const W = doc.page.width - ML - doc.page.margins.right
  const DARK = '#1E293B'
  const BAND_H = 15

  const heading = (title: string) => {
    doc.moveDown(0.5)
    const bandY = doc.y
    doc.rect(ML, bandY, W, BAND_H).fill(DARK)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text(`  ${title.toUpperCase()}`, ML + 4, bandY + (BAND_H - 9) / 2 + 0.5, {
         lineBreak: false, width: W - 8,
       })
    // Advance cursor past band
    doc.text('', ML, bandY + BAND_H + 4, { lineBreak: false, width: 1 })
    doc.fillColor('#000000').moveDown(0.1)
  }

  doc.fontSize(30).font('Helvetica-Bold').text(profile.full_name || '')
  doc.moveDown(0.1)

  const cp = contactLine(profile, jobTitle, jobRequirements)
  if (cp.length) {
    doc.fontSize(9).font('Helvetica').fillColor('#444444').text(cp.join('  |  '))
    doc.fillColor('#000000')
  }
  if (profile.positioning_headline) {
    doc.moveDown(0.2).fontSize(11).font('Helvetica-Bold').fillColor(DARK)
       .text(profile.positioning_headline)
    doc.fillColor('#000000')
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) { heading('Summary'); doc.fontSize(9.5).font('Helvetica').text(summaryText) }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 14)
  if (skills.length) { heading('Skills'); doc.fontSize(9.5).font('Helvetica').text(skills.join('  ·  ')) }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    heading('Key Highlights')
    doc.fontSize(9.5).font('Helvetica')
       .list(highlights.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
  }

  const visibleWE = workExperiences.filter(we => we.bullets?.length)
  if (visibleWE.length) {
    heading('Experience')
    for (const we of visibleWE) {
      doc.fontSize(10.5).font('Helvetica-Bold').text(`${we.title || ''} — ${we.company || ''}`)
      doc.fontSize(9).font('Helvetica').fillColor('#666666')
         .text(`${fmtDate(we.start_date)} – ${we.is_current ? 'Present' : fmtDate(we.end_date)}`)
      doc.fillColor('#000000').moveDown(0.1)
      doc.fontSize(9.5).font('Helvetica')
         .list(we.bullets.map(b => b.text), { bulletRadius: 1.5, bulletIndent: 8, textIndent: 16, lineGap: 2 })
      doc.moveDown(0.3)
    }
  }

  if (education.length) {
    heading('Education')
    for (const e of education) {
      const line = [e.institution, e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study, e.grade ? `(${e.grade})` : null].filter(Boolean).join(' — ')
      doc.fontSize(9.5).font('Helvetica').text(`${line}  ·  ${fmtDate(e.start_date)} – ${e.is_current ? 'Present' : fmtDate(e.end_date)}`)
      doc.moveDown(0.15)
    }
  }
  if (certifications.length) {
    heading('Certifications')
    doc.fontSize(9.5).font('Helvetica').text(certifications.map(c => c.name).filter(Boolean).join('  ·  '))
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────────

const MARGINS: Record<TemplateName, { top: number; bottom: number; left: number; right: number }> = {
  clean:     { top: 72, bottom: 72, left: 72, right: 72 },
  executive: { top: 72, bottom: 72, left: 72, right: 72 },
  modern:    { top: 54, bottom: 54, left: 54, right: 54 },
  compact:   { top: 54, bottom: 54, left: 54, right: 54 },
  bold:      { top: 72, bottom: 72, left: 72, right: 72 },
}

export function buildCvPdf(
  snap: CVSnapshot,
  template: TemplateName = 'clean',
  jobTitle?: string | null,
  jobRequirements?: string | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: MARGINS[template] ?? MARGINS.clean,
      info: { Title: snap.profile.full_name || 'CV' },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    switch (template) {
      case 'executive': buildExecutive(snap, doc, jobTitle, jobRequirements); break
      case 'modern':    buildModern(snap, doc, jobTitle, jobRequirements);    break
      case 'compact':   buildCompact(snap, doc, jobTitle, jobRequirements);   break
      case 'bold':      buildBold(snap, doc, jobTitle, jobRequirements);      break
      default:          buildClean(snap, doc, jobTitle, jobRequirements);     break
    }

    doc.end()
  })
}
