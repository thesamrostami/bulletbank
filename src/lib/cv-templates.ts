/**
 * CV Template Library — 5 professional templates built with docx 9.x
 *
 * Page: A4 (11906 × 16838 DXA), 1" margins (1440 DXA each side)
 * Text area: 9026 DXA wide
 * Bullets: docx numbering system (LevelFormat.BULLET), never raw "•" in TextRun
 */

import {
  Document,
  Paragraph,
  TextRun,
  BorderStyle,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  LevelFormat,
} from 'docx'
import type { CVSnapshot } from '@/types'

// ─── Public types ─────────────────────────────────────────────────────────────

export type TemplateName = 'clean' | 'executive' | 'modern' | 'compact' | 'bold'

export const CV_TEMPLATES: Record<TemplateName, { label: string; description: string }> = {
  clean:     { label: 'Clean',     description: 'Minimal and professional — works for any role' },
  executive: { label: 'Executive', description: 'Formal and elegant — ideal for senior positions' },
  modern:    { label: 'Modern',    description: 'Sidebar layout with colour accents' },
  compact:   { label: 'Compact',   description: 'Fits more on one page — great for experienced candidates' },
  bold:      { label: 'Bold',      description: 'High visual impact — good for creative roles' },
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

const TECH_KEYWORDS = [
  'engineer', 'developer', 'software', 'frontend', 'backend', 'fullstack', 'full-stack',
  'devops', 'data', 'ml', 'ai', 'machine learning', 'cloud', 'infrastructure', 'sre',
  'platform', 'mobile', 'ios', 'android', 'security', 'cybersecurity', 'architect',
  'programmer', 'coding', 'technical', 'technology', 'systems', 'it ', 'web',
]

function isTechRole(jobTitle?: string | null, jobRequirements?: string | null): boolean {
  if (!jobTitle && !jobRequirements) return true
  const text = `${jobTitle ?? ''} ${jobRequirements ?? ''}`.toLowerCase()
  return TECH_KEYWORDS.some(kw => text.includes(kw))
}

function contactParts(
  profile: CVSnapshot['profile'],
  jobTitle?: string | null,
  jobRequirements?: string | null
): string[] {
  const websiteUrl = profile.portfolio_url || profile.website_url || null
  const additionalUrls = (profile.additional_links || [])
    .filter(link => {
      if (!link.url) return false
      if (link.label.toLowerCase().includes('github')) return isTechRole(jobTitle, jobRequirements)
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

// ─── Clean template ───────────────────────────────────────────────────────────
// Single column, Calibri, uppercase grey section headings with thin bottom border.

function buildCleanCv(snap: CVSnapshot): Document {
  const { profile, workExperiences, education, certifications } = snap
  const font = 'Calibri'
  const bodySize = 19  // 9.5pt
  const tabPos = 9000

  const BULLET_REF = 'clean-bullets'

  function heading(text: string): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text, size: 19, font, color: '666666', bold: true })],
        spacing: { before: 200, after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 3 } },
      }),
    ]
  }

  function bulletPara(text: string): Paragraph {
    return new Paragraph({
      numbering: { reference: BULLET_REF, level: 0 },
      children: [new TextRun({ text, size: bodySize, font })],
      spacing: { after: 20 },
    })
  }

  const children: Paragraph[] = []

  // Name
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.full_name || '', bold: true, size: 48, font })],
    spacing: { after: 40 },
  }))

  // Contact
  const cp = contactParts(profile)
  if (cp.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cp.join('  |  '), size: 18, color: '555555', font })],
      spacing: { after: 40 },
    }))
  }

  // Positioning headline
  if (profile.positioning_headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: profile.positioning_headline, bold: true, size: 20, font, color: '333333' })],
      spacing: { after: 100 },
    }))
  }

  // Summary
  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) {
    children.push(...heading('SUMMARY'))
    children.push(new Paragraph({
      children: [new TextRun({ text: summaryText, size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  // Skills
  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 12)
  if (skills.length) {
    children.push(...heading('SKILLS'))
    children.push(new Paragraph({
      children: [new TextRun({ text: skills.join('  ·  '), size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  // Highlights
  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    children.push(...heading('KEY HIGHLIGHTS'))
    for (const b of highlights) children.push(bulletPara(b.text))
    children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
  }

  // Experience
  const visibleWE = workExperiences.filter(we => we.bullets && we.bullets.length > 0)
  if (visibleWE.length) {
    children.push(...heading('EXPERIENCE'))
    for (const we of visibleWE) {
      const dateRange = `${formatDate(we.start_date)} – ${we.is_current ? 'Present' : formatDate(we.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${we.title || ''} — ${we.company || ''}`, bold: true, size: 20, font }),
          new TextRun({ text: `\t${dateRange}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { before: 120, after: 30 },
      }))
      for (const b of we.bullets) children.push(bulletPara(b.text))
      children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
    }
  }

  // Education
  if (education.length) {
    children.push(...heading('EDUCATION'))
    for (const e of education) {
      const eduText = [
        e.institution,
        e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study,
        e.grade ? `(${e.grade})` : null,
      ].filter(Boolean).join(' — ')
      const eduDates = `${formatDate(e.start_date)} – ${e.is_current ? 'Present' : formatDate(e.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: eduText, size: bodySize, font }),
          new TextRun({ text: `\t${eduDates}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { after: 40 },
      }))
    }
  }

  // Certifications
  if (certifications.length) {
    children.push(...heading('CERTIFICATIONS'))
    children.push(new Paragraph({
      children: [new TextRun({ text: certifications.map(c => c.name).filter(Boolean).join('  ·  '), size: bodySize, font })],
      spacing: { after: 40 },
    }))
  }

  return new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { font, size: bodySize },
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
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
}

// ─── Executive template ───────────────────────────────────────────────────────
// Georgia font, 28pt name, navy thin accent line, small-caps section headings.

function buildExecutiveCv(snap: CVSnapshot): Document {
  const { profile, workExperiences, education, certifications } = snap
  const font = 'Georgia'
  const bodySize = 20  // 10pt
  const tabPos = 9000
  const navyColor = '1B2A4A'
  const BULLET_REF = 'exec-bullets'

  function heading(text: string): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), size: 18, font, color: navyColor, bold: false })],
        spacing: { before: 240, after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: navyColor, space: 3 } },
      }),
    ]
  }

  function bulletPara(text: string): Paragraph {
    return new Paragraph({
      numbering: { reference: BULLET_REF, level: 0 },
      children: [new TextRun({ text, size: bodySize, font })],
      spacing: { after: 30 },
    })
  }

  const children: Paragraph[] = []

  // Name + navy underline
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.full_name || '', bold: true, size: 56, font })],
    spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: navyColor, space: 6 } },
  }))
  children.push(new Paragraph({ children: [], spacing: { after: 60 } }))

  // Contact
  const cp = contactParts(profile)
  if (cp.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cp.join('   ·   '), size: 18, color: '555555', font })],
      spacing: { after: 40 },
    }))
  }

  if (profile.positioning_headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: profile.positioning_headline, size: bodySize, font, color: navyColor })],
      spacing: { after: 120 },
    }))
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) {
    children.push(...heading('SUMMARY'))
    children.push(new Paragraph({
      children: [new TextRun({ text: summaryText, size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 12)
  if (skills.length) {
    children.push(...heading('SKILLS'))
    children.push(new Paragraph({
      children: [new TextRun({ text: skills.join('   ·   '), size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    children.push(...heading('KEY HIGHLIGHTS'))
    for (const b of highlights) children.push(bulletPara(b.text))
    children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
  }

  const visibleWE = workExperiences.filter(we => we.bullets && we.bullets.length > 0)
  if (visibleWE.length) {
    children.push(...heading('EXPERIENCE'))
    for (const we of visibleWE) {
      const dateRange = `${formatDate(we.start_date)} – ${we.is_current ? 'Present' : formatDate(we.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${we.title || ''} — ${we.company || ''}`, bold: true, size: 21, font }),
          new TextRun({ text: `\t${dateRange}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { before: 140, after: 30 },
      }))
      for (const b of we.bullets) children.push(bulletPara(b.text))
      children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
    }
  }

  if (education.length) {
    children.push(...heading('EDUCATION'))
    for (const e of education) {
      const eduText = [
        e.institution,
        e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study,
        e.grade ? `(${e.grade})` : null,
      ].filter(Boolean).join(' — ')
      const eduDates = `${formatDate(e.start_date)} – ${e.is_current ? 'Present' : formatDate(e.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: eduText, size: bodySize, font }),
          new TextRun({ text: `\t${eduDates}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { after: 40 },
      }))
    }
  }

  if (certifications.length) {
    children.push(...heading('CERTIFICATIONS'))
    children.push(new Paragraph({
      children: [new TextRun({ text: certifications.map(c => c.name).filter(Boolean).join('   ·   '), size: bodySize, font })],
      spacing: { after: 40 },
    }))
  }

  return new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { font, size: bodySize },
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
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
}

// ─── Modern template ──────────────────────────────────────────────────────────
// Two-column table: narrow left sidebar (contact/skills/certs) + main content area.

function buildModernCv(snap: CVSnapshot): Document {
  const { profile, workExperiences, education, certifications } = snap
  const font = 'Calibri'
  const bodySize = 19
  const accentColor = '2563EB'
  const BULLET_REF = 'modern-bullets'

  // Sidebar width ~30%, main ~70%, total 9026 DXA (1" margins on 11906 page)
  const sidebarWidth = 2600
  const mainWidth = 6426

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const

  function sideHeading(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 17, font, color: accentColor })],
      spacing: { before: 200, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: accentColor, space: 2 } },
    })
  }

  function mainHeading(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, font, color: accentColor })],
      spacing: { before: 200, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: accentColor, space: 2 } },
    })
  }

  function bulletPara(text: string): Paragraph {
    return new Paragraph({
      numbering: { reference: BULLET_REF, level: 0 },
      children: [new TextRun({ text, size: bodySize, font })],
      spacing: { after: 20 },
    })
  }

  // ── Left sidebar ──
  const sidebarChildren: Paragraph[] = []

  // Name at top of sidebar
  sidebarChildren.push(new Paragraph({
    children: [new TextRun({ text: profile.full_name || '', bold: true, size: 28, font, color: '111111' })],
    spacing: { after: 20 },
  }))
  if (profile.positioning_headline) {
    sidebarChildren.push(new Paragraph({
      children: [new TextRun({ text: profile.positioning_headline, size: 16, font, color: accentColor })],
      spacing: { after: 120 },
    }))
  }

  // Contact info
  sidebarChildren.push(sideHeading('Contact'))
  const cp = contactParts(profile)
  for (const c of cp) {
    sidebarChildren.push(new Paragraph({
      children: [new TextRun({ text: c, size: 16, font, color: '333333' })],
      spacing: { after: 30 },
    }))
  }

  // Skills
  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 12)
  if (skills.length) {
    sidebarChildren.push(sideHeading('Skills'))
    for (const s of skills) {
      sidebarChildren.push(new Paragraph({
        children: [new TextRun({ text: s, size: 17, font })],
        spacing: { after: 20 },
      }))
    }
  }

  // Certifications in sidebar
  if (certifications.length) {
    sidebarChildren.push(sideHeading('Certifications'))
    for (const c of certifications) {
      sidebarChildren.push(new Paragraph({
        children: [new TextRun({ text: c.name || '', size: 16, font })],
        spacing: { after: 20 },
      }))
    }
  }

  // ── Right main content ──
  const mainChildren: Paragraph[] = []

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) {
    mainChildren.push(mainHeading('Summary'))
    mainChildren.push(new Paragraph({
      children: [new TextRun({ text: summaryText, size: bodySize, font })],
      spacing: { after: 60 },
    }))
  }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    mainChildren.push(mainHeading('Key Highlights'))
    for (const b of highlights) mainChildren.push(bulletPara(b.text))
    mainChildren.push(new Paragraph({ children: [], spacing: { after: 40 } }))
  }

  const visibleWE = workExperiences.filter(we => we.bullets && we.bullets.length > 0)
  if (visibleWE.length) {
    mainChildren.push(mainHeading('Experience'))
    for (const we of visibleWE) {
      const dateRange = `${formatDate(we.start_date)} – ${we.is_current ? 'Present' : formatDate(we.end_date)}`
      mainChildren.push(new Paragraph({
        children: [
          new TextRun({ text: `${we.title || ''} — ${we.company || ''}`, bold: true, size: 20, font }),
          new TextRun({ text: `  ${dateRange}`, size: 17, color: '888888', font }),
        ],
        spacing: { before: 100, after: 30 },
      }))
      for (const b of we.bullets) mainChildren.push(bulletPara(b.text))
      mainChildren.push(new Paragraph({ children: [], spacing: { after: 40 } }))
    }
  }

  if (education.length) {
    mainChildren.push(mainHeading('Education'))
    for (const e of education) {
      const eduText = [
        e.institution,
        e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study,
        e.grade ? `(${e.grade})` : null,
      ].filter(Boolean).join(' — ')
      const eduDates = `${formatDate(e.start_date)} – ${e.is_current ? 'Present' : formatDate(e.end_date)}`
      mainChildren.push(new Paragraph({
        children: [
          new TextRun({ text: eduText, size: bodySize, font }),
          new TextRun({ text: `  ${eduDates}`, size: 17, color: '888888', font }),
        ],
        spacing: { after: 40 },
      }))
    }
  }

  // Single-row table: sidebar | main
  const layoutTable = new Table({
    columnWidths: [sidebarWidth, mainWidth],
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: sidebarWidth, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
            margins: { top: 300, bottom: 300, left: 200, right: 300 },
            borders: {
              top: noBorder, bottom: noBorder, left: noBorder,
              right: noBorder,
            },
            children: sidebarChildren,
          }),
          new TableCell({
            width: { size: mainWidth, type: WidthType.DXA },
            margins: { top: 300, bottom: 300, left: 300, right: 200 },
            borders: {
              top: noBorder, bottom: noBorder, left: noBorder,
              right: noBorder,
            },
            children: mainChildren,
          }),
        ],
      }),
    ],
  })

  return new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { font, size: bodySize },
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children: [layoutTable],
    }],
  })
}

// ─── Compact template ─────────────────────────────────────────────────────────
// 9pt body, 0.75" margins, tighter spacing — maximises content per page.

function buildCompactCv(snap: CVSnapshot): Document {
  const { profile, workExperiences, education, certifications } = snap
  const font = 'Calibri'
  const bodySize = 18  // 9pt
  const tabPos = 9800  // wider — 0.75" margins give 9746 text area
  const BULLET_REF = 'compact-bullets'

  function heading(text: string): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), size: 16, font, color: '555555', bold: true })],
        spacing: { before: 160, after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
      }),
    ]
  }

  function bulletPara(text: string): Paragraph {
    return new Paragraph({
      numbering: { reference: BULLET_REF, level: 0 },
      children: [new TextRun({ text, size: bodySize, font })],
      spacing: { after: 10 },
    })
  }

  const children: Paragraph[] = []

  // Name — smaller to save space
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.full_name || '', bold: true, size: 36, font })],
    spacing: { after: 20 },
  }))

  // Contact + headline on one line
  const cp = contactParts(profile)
  if (cp.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cp.join('  ·  '), size: 16, color: '555555', font })],
      spacing: { after: profile.positioning_headline ? 0 : 60 },
    }))
  }
  if (profile.positioning_headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: profile.positioning_headline, size: 17, font, color: '333333' })],
      spacing: { after: 60 },
    }))
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) {
    children.push(...heading('Summary'))
    children.push(new Paragraph({
      children: [new TextRun({ text: summaryText, size: bodySize, font })],
      spacing: { after: 40 },
    }))
  }

  // Skills — two dense groups on a single paragraph
  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 16)
  if (skills.length) {
    children.push(...heading('Skills'))
    const half = Math.ceil(skills.length / 2)
    const row1 = skills.slice(0, half).join('  ·  ')
    const row2 = skills.slice(half).join('  ·  ')
    children.push(new Paragraph({
      children: [new TextRun({ text: row1, size: bodySize, font })],
      spacing: { after: 6 },
    }))
    if (row2) {
      children.push(new Paragraph({
        children: [new TextRun({ text: row2, size: bodySize, font })],
        spacing: { after: 40 },
      }))
    }
  }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    children.push(...heading('Key Highlights'))
    for (const b of highlights) children.push(bulletPara(b.text))
    children.push(new Paragraph({ children: [], spacing: { after: 20 } }))
  }

  const visibleWE = workExperiences.filter(we => we.bullets && we.bullets.length > 0)
  if (visibleWE.length) {
    children.push(...heading('Experience'))
    for (const we of visibleWE) {
      const dateRange = `${formatDate(we.start_date)} – ${we.is_current ? 'Present' : formatDate(we.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${we.title || ''} — ${we.company || ''}`, bold: true, size: 18, font }),
          new TextRun({ text: `\t${dateRange}`, size: 17, color: '777777', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { before: 80, after: 20 },
      }))
      for (const b of we.bullets) children.push(bulletPara(b.text))
      children.push(new Paragraph({ children: [], spacing: { after: 20 } }))
    }
  }

  if (education.length) {
    children.push(...heading('Education'))
    for (const e of education) {
      const eduText = [
        e.institution,
        e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study,
        e.grade ? `(${e.grade})` : null,
      ].filter(Boolean).join(' — ')
      const eduDates = `${formatDate(e.start_date)} – ${e.is_current ? 'Present' : formatDate(e.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: eduText, size: bodySize, font }),
          new TextRun({ text: `\t${eduDates}`, size: 17, color: '777777', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { after: 20 },
      }))
    }
  }

  if (certifications.length) {
    children.push(...heading('Certifications'))
    children.push(new Paragraph({
      children: [new TextRun({ text: certifications.map(c => c.name).filter(Boolean).join('  ·  '), size: bodySize, font })],
      spacing: { after: 20 },
    }))
  }

  return new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { font, size: bodySize },
            paragraph: { indent: { left: 300, hanging: 180 } },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  })
}

// ─── Bold template ────────────────────────────────────────────────────────────
// 30pt name, dark navy (#1E293B) filled section heading bands with white text.

function buildBoldCv(snap: CVSnapshot): Document {
  const { profile, workExperiences, education, certifications } = snap
  const font = 'Calibri'
  const bodySize = 19
  const tabPos = 9000
  const BULLET_REF = 'bold-bullets'

  function heading(text: string): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text: `  ${text.toUpperCase()}  `, bold: true, size: 20, font, color: 'FFFFFF' })],
        shading: { type: ShadingType.CLEAR, fill: '1E293B', color: 'auto' },
        spacing: { before: 200, after: 80 },
      }),
    ]
  }

  function bulletPara(text: string): Paragraph {
    return new Paragraph({
      numbering: { reference: BULLET_REF, level: 0 },
      children: [new TextRun({ text, size: bodySize, font })],
      spacing: { after: 20 },
    })
  }

  const children: Paragraph[] = []

  // Bold name
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.full_name || '', bold: true, size: 60, font })],
    spacing: { after: 20 },
  }))

  const cp = contactParts(profile)
  if (cp.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cp.join('  |  '), size: 18, color: '444444', font })],
      spacing: { after: 20 },
    }))
  }
  if (profile.positioning_headline) {
    children.push(new Paragraph({
      children: [new TextRun({ text: profile.positioning_headline, bold: true, size: 22, font, color: '1E293B' })],
      spacing: { after: 120 },
    }))
  }

  const summaryText = snap.summaryBullets?.[0]?.text
  if (summaryText) {
    children.push(...heading('Summary'))
    children.push(new Paragraph({
      children: [new TextRun({ text: summaryText, size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  const skills = snap.skills_line?.length
    ? snap.skills_line
    : [...(profile.skills_core || []), ...(profile.skills_proficient || [])].slice(0, 12)
  if (skills.length) {
    children.push(...heading('Skills'))
    children.push(new Paragraph({
      children: [new TextRun({ text: skills.join('  ·  '), size: bodySize, font })],
      spacing: { after: 80 },
    }))
  }

  const highlights = snap.highlightBullets || []
  if (highlights.length) {
    children.push(...heading('Key Highlights'))
    for (const b of highlights) children.push(bulletPara(b.text))
    children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
  }

  const visibleWE = workExperiences.filter(we => we.bullets && we.bullets.length > 0)
  if (visibleWE.length) {
    children.push(...heading('Experience'))
    for (const we of visibleWE) {
      const dateRange = `${formatDate(we.start_date)} – ${we.is_current ? 'Present' : formatDate(we.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${we.title || ''} — ${we.company || ''}`, bold: true, size: 21, font }),
          new TextRun({ text: `\t${dateRange}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { before: 120, after: 30 },
      }))
      for (const b of we.bullets) children.push(bulletPara(b.text))
      children.push(new Paragraph({ children: [], spacing: { after: 40 } }))
    }
  }

  if (education.length) {
    children.push(...heading('Education'))
    for (const e of education) {
      const eduText = [
        e.institution,
        e.degree && e.field_of_study ? `${e.degree} in ${e.field_of_study}` : e.degree || e.field_of_study,
        e.grade ? `(${e.grade})` : null,
      ].filter(Boolean).join(' — ')
      const eduDates = `${formatDate(e.start_date)} – ${e.is_current ? 'Present' : formatDate(e.end_date)}`
      children.push(new Paragraph({
        children: [
          new TextRun({ text: eduText, size: bodySize, font }),
          new TextRun({ text: `\t${eduDates}`, size: 18, color: '666666', font }),
        ],
        tabStops: [{ type: 'right' as const, position: tabPos }],
        spacing: { after: 40 },
      }))
    }
  }

  if (certifications.length) {
    children.push(...heading('Certifications'))
    children.push(new Paragraph({
      children: [new TextRun({ text: certifications.map(c => c.name).filter(Boolean).join('  ·  '), size: bodySize, font })],
      spacing: { after: 40 },
    }))
  }

  return new Document({
    numbering: {
      config: [{
        reference: BULLET_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { font, size: bodySize },
            paragraph: { indent: { left: 360, hanging: 180 } },
          },
        }],
      }],
    },
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
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function buildCvDocument(cvSnapshot: CVSnapshot, template: TemplateName): Document {
  switch (template) {
    case 'executive': return buildExecutiveCv(cvSnapshot)
    case 'modern':    return buildModernCv(cvSnapshot)
    case 'compact':   return buildCompactCv(cvSnapshot)
    case 'bold':      return buildBoldCv(cvSnapshot)
    default:          return buildCleanCv(cvSnapshot)
  }
}
