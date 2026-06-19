'use client'

import { CV_TEMPLATES, type TemplateName } from '@/lib/cv-templates'

// ─── SVG thumbnails ───────────────────────────────────────────────────────────

function CleanThumb() {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* name */}
      <rect x="10" y="8" width="60" height="4" rx="2" fill="currentColor" opacity="0.7"/>
      {/* thin divider */}
      <line x1="10" y1="17" x2="70" y2="17" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
      {/* contact */}
      <rect x="15" y="21" width="50" height="2" rx="1" fill="currentColor" opacity="0.25"/>
      {/* section heading */}
      <rect x="10" y="30" width="25" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <line x1="10" y1="33.5" x2="70" y2="33.5" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      {/* content lines */}
      <rect x="10" y="37" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="41" width="55" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="45" width="45" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* second section */}
      <rect x="10" y="54" width="30" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <line x1="10" y1="57.5" x2="70" y2="57.5" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      <rect x="10" y="61" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="65" width="50" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="69" width="40" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}

function ExecutiveThumb() {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* centered name */}
      <rect x="18" y="7" width="44" height="5" rx="2" fill="currentColor" opacity="0.7"/>
      {/* double ruled lines */}
      <line x1="10" y1="15" x2="70" y2="15" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      <line x1="10" y1="17.5" x2="70" y2="17.5" stroke="currentColor" strokeWidth="0.4" opacity="0.3"/>
      {/* centered contact */}
      <rect x="22" y="21" width="36" height="1.5" rx="0.75" fill="currentColor" opacity="0.25"/>
      {/* centered headline */}
      <rect x="20" y="26" width="40" height="2" rx="1" fill="currentColor" opacity="0.35"/>
      {/* section heading small-caps style */}
      <rect x="10" y="35" width="20" height="1.5" rx="0.75" fill="currentColor" opacity="0.45"/>
      <line x1="10" y1="38" x2="70" y2="38" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      {/* formal block content */}
      <rect x="10" y="42" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="46" width="58" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="50" width="52" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* second section */}
      <rect x="10" y="59" width="22" height="1.5" rx="0.75" fill="currentColor" opacity="0.45"/>
      <line x1="10" y1="62" x2="70" y2="62" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      <rect x="10" y="66" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="70" width="50" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}

function ModernThumb() {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* sidebar background */}
      <rect x="0" y="0" width="26" height="100" rx="0" fill="currentColor" opacity="0.07"/>
      {/* sidebar accent bar */}
      <rect x="0" y="0" width="3" height="100" fill="currentColor" opacity="0.5"/>
      {/* sidebar name */}
      <rect x="6" y="9" width="15" height="3" rx="1" fill="currentColor" opacity="0.55"/>
      {/* sidebar contact items */}
      <rect x="6" y="18" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.3"/>
      <rect x="6" y="22" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3"/>
      <rect x="6" y="26" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.3"/>
      {/* sidebar skills label */}
      <rect x="6" y="34" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
      <rect x="6" y="38" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="6" y="42" width="13" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="6" y="46" width="11" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* main content area */}
      {/* section heading */}
      <rect x="30" y="9" width="22" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      <line x1="30" y1="12.5" x2="72" y2="12.5" stroke="currentColor" strokeWidth="0.4" opacity="0.3"/>
      {/* experience block */}
      <rect x="30" y="16" width="30" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="30" y="21" width="42" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="30" y="25" width="38" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="30" y="29" width="34" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* second block */}
      <rect x="30" y="37" width="25" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="30" y="42" width="42" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="30" y="46" width="40" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="30" y="50" width="36" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}

function CompactThumb() {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* name — smaller */}
      <rect x="10" y="6" width="44" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
      {/* contact inline */}
      <rect x="10" y="12" width="55" height="1.5" rx="0.75" fill="currentColor" opacity="0.25"/>
      {/* tight section */}
      <rect x="10" y="18" width="20" height="1.5" rx="0.75" fill="currentColor" opacity="0.45"/>
      <line x1="10" y1="21" x2="70" y2="21" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      {/* dense content — tight spacing */}
      <rect x="10" y="24" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="27.5" width="57" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="31" width="52" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="34.5" width="48" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* second section */}
      <rect x="10" y="41" width="24" height="1.5" rx="0.75" fill="currentColor" opacity="0.45"/>
      <line x1="10" y1="44" x2="70" y2="44" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      <rect x="10" y="47" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="50.5" width="56" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="54" width="50" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="57.5" width="44" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* third section — shows more content fits */}
      <rect x="10" y="64" width="18" height="1.5" rx="0.75" fill="currentColor" opacity="0.45"/>
      <line x1="10" y1="67" x2="70" y2="67" stroke="currentColor" strokeWidth="0.4" opacity="0.25"/>
      <rect x="10" y="70" width="60" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="10" y="73.5" width="52" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}

function BoldThumb() {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      {/* thick header band */}
      <rect x="0" y="0" width="80" height="22" fill="currentColor" opacity="0.85"/>
      {/* name in white on band */}
      <rect x="8" y="6" width="48" height="5" rx="2" fill="white" opacity="0.9"/>
      {/* contact below band — white text sim */}
      <rect x="10" y="14" width="40" height="2" rx="1" fill="white" opacity="0.55"/>
      {/* bold section heading band */}
      <rect x="0" y="28" width="80" height="7" fill="currentColor" opacity="0.15"/>
      <rect x="8" y="30" width="22" height="2.5" rx="1" fill="currentColor" opacity="0.6"/>
      {/* content */}
      <rect x="8" y="40" width="64" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="8" y="44" width="58" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="8" y="48" width="50" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      {/* second bold section band */}
      <rect x="0" y="57" width="80" height="7" fill="currentColor" opacity="0.15"/>
      <rect x="8" y="59" width="28" height="2.5" rx="1" fill="currentColor" opacity="0.6"/>
      {/* content */}
      <rect x="8" y="69" width="64" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="8" y="73" width="58" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
      <rect x="8" y="77" width="46" height="1.5" rx="0.75" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}

const THUMBS: Record<TemplateName, React.FC> = {
  clean:     CleanThumb,
  executive: ExecutiveThumb,
  modern:    ModernThumb,
  compact:   CompactThumb,
  bold:      BoldThumb,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateSelector({
  selected,
  onChange,
}: {
  selected: TemplateName
  onChange: (t: TemplateName) => void
}) {
  const templates = Object.entries(CV_TEMPLATES) as [TemplateName, { label: string; description: string }][]
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Template</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {templates.map(([id, { label, description }]) => {
          const Thumb = THUMBS[id]
          const isSelected = selected === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{ color: isSelected ? 'var(--navy)' : '#9ca3af' }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-[var(--navy)] bg-[var(--accent-light)] shadow-sm'
                  : 'border-[var(--border)] bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="rounded overflow-hidden">
                <Thumb />
              </div>
              <div className="w-full">
                <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-[var(--navy)]' : 'text-gray-800'}`}>
                  {label}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
