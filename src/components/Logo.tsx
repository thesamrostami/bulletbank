import { exo2, dmSans } from '@/lib/fonts'

const GRADIENT = 'linear-gradient(90deg, #6c5ce7, #00b4d8)'

interface LogoProps {
  /** px size of the wordmark text. Default 24. */
  size?: number
  /** Show the "AI-Powered Career Growth" slogan. Default false. */
  showSlogan?: boolean
}

export default function Logo({ size = 24, showSlogan = false }: LogoProps) {
  return (
    <div className="inline-flex flex-col items-start" style={{ gap: showSlogan ? 4 : 0 }}>

      {/* Wordmark */}
      <div
        className={exo2.className}
        style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline' }}
      >
        <span style={{ color: '#1a1f4e' }}>Apply</span>
        <span
          style={{
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Bullets
        </span>
      </div>

      {/* Slogan */}
      {showSlogan && (
        <div
          className={dmSans.className}
          style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#888',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span style={{ display: 'block', width: 22, height: 1, background: GRADIENT, flexShrink: 0 }} />
          AI-Powered Career Growth
          <span style={{ display: 'block', width: 22, height: 1, background: GRADIENT, flexShrink: 0 }} />
        </div>
      )}
    </div>
  )
}

/** Compact "P" mark for the collapsed sidebar icon rail */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <span
      className={exo2.className}
      style={{
        fontSize: size,
        lineHeight: 1,
        background: GRADIENT,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 700,
      }}
    >
      A
    </span>
  )
}
