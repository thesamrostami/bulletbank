import Link from 'next/link'
import Logo from '@/components/Logo'
import { CREDIT_PACKS, SIGNUP_CREDITS } from '@/lib/plans'

/* ── Inline SVG icons ──────────────────────────────────── */
function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Product preview card (hero visual) ────────────────── */
function ProductPreview() {
  const bullets = [
    'Led cross-functional team of 12 across eng, design & data — shipped 3 platform features, growing ARR by $2.4M',
    'Defined 18-month product roadmap using usage data and NPS signals; reduced churn by 22%',
    'Partnered with C-suite to align product strategy with OKRs; presented at 6 board meetings',
  ]
  const reqs = ['Cross-functional leadership', '5+ yrs product experience', 'Data-driven decisions']

  return (
    <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7]/20 to-[#00b4d8]/20 rounded-3xl blur-3xl scale-110 pointer-events-none" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <span className="text-[11px] text-gray-400 ml-2 font-medium">Senior PM @ Stripe</span>
        </div>

        {/* Job requirements pill row */}
        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Requirements</p>
          <div className="flex flex-wrap gap-1.5">
            {reqs.map(r => (
              <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{r}</span>
            ))}
          </div>
        </div>

        {/* Bullets output */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4 2.4-7.3L2 9.4h7.6L12 2z" fill="url(#star-grad)" />
                <defs>
                  <linearGradient id="star-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6c5ce7" />
                    <stop offset="100%" stopColor="#00b4d8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-[11px] font-semibold text-gray-700">Tailored CV Bullets</span>
            </div>
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">95% match</span>
          </div>

          <div className="space-y-2.5">
            {bullets.map((b, i) => (
              <div key={i} className="flex gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b4d8)' }}
                >
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
            <div className="flex-1 text-[11px] font-semibold py-2 rounded-lg bg-[var(--navy)] text-white text-center">Download CV</div>
            <div className="flex-1 text-[11px] font-medium py-2 rounded-lg border border-gray-200 text-gray-500 text-center">Cover letter</div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-3 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: '0 0 0 3px #dcfce7' }} />
        <span className="text-[11px] font-semibold text-gray-700">Generated in 8s</span>
      </div>
    </div>
  )
}

/* ── Data ───────────────────────────────────────────────── */
const testimonials = [
  {
    quote: 'I landed 3 interviews in my first week using ApplyBullets. The bullets it picks are shockingly relevant to each role.',
    name: 'Sarah K.',
    role: 'Software Engineer',
    initials: 'SK',
  },
  {
    quote: 'Way better than what I would write myself. It surfaces achievements I would never think to include — and reframes them perfectly.',
    name: 'Marcus T.',
    role: 'Product Manager',
    initials: 'MT',
  },
  {
    quote: 'I was spending 2 hours per application. Now it takes 10 minutes. The cover letter is the real game-changer.',
    name: 'Priya M.',
    role: 'Marketing Director',
    initials: 'PM',
  },
]

const features = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    color: '#6c5ce7',
    bg: '#f0edff',
    title: 'Living achievement bank',
    body: 'Log wins as they happen — promotions, shipped features, revenue milestones. Never scramble to recall them when a good role appears.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    color: '#4E9AD9',
    bg: '#e8f4fd',
    title: 'Instant job analysis',
    body: 'Paste any job URL or description. We extract exactly what the employer values so your CV speaks their language — not a generic template.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    color: '#22c55e',
    bg: '#f0fdf4',
    title: 'Tailored CV + cover letter',
    body: 'AI selects your most relevant bullets, rewrites them for the role, and drafts a cover letter — all ready to download and send.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Build your profile',
    body: 'Add your work history and career wins once. Keep enriching it as you collect new achievements.',
    gradient: 'linear-gradient(135deg, #6c5ce7, #8b7cf8)',
    glow: '#6c5ce740',
  },
  {
    step: '02',
    title: 'Paste any job',
    body: 'Drop in a URL or paste the description. We extract requirements and fit signals in seconds.',
    gradient: 'linear-gradient(135deg, #4E9AD9, #00b4d8)',
    glow: '#4E9AD940',
  },
  {
    step: '03',
    title: 'Download & apply',
    body: 'Get a tailored CV with the perfect bullets selected and a polished cover letter. Ready to send.',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    glow: '#22c55e40',
  },
]

const faqs = [
  {
    q: 'How is this different from a CV builder?',
    a: 'Templates make every CV look the same. ApplyBullets keeps a bank of your real achievements and, for each job, selects and rewrites the bullets that match what that specific employer is asking for.',
  },
  {
    q: 'Will it invent things about my experience?',
    a: 'No. It only works from the achievements and history you add to your profile. It reframes and prioritises your real wins for each role — it never fabricates experience or metrics.',
  },
  {
    q: 'Do I need a subscription?',
    a: `Never. You start with ${SIGNUP_CREDITS} free credits and top up with one-time credit packs only when you need them. Credits never expire and there is no recurring charge.`,
  },
  {
    q: 'Is my data private?',
    a: 'Your profile is yours alone, protected by row-level security. Personal contact details are stripped before any text is sent for AI processing, and you can delete your account and all data at any time.',
  },
]

const stats = [
  { stat: '< 30s', label: 'Average generation time' },
  { stat: '1 profile', label: 'Infinite tailored applications' },
  { stat: `${SIGNUP_CREDITS}`, label: 'Free credits on signup' },
  { stat: '£0', label: 'To get started' },
]

const perApp = 7 // credits for one full application (extract + analyse + CV + cover letter)

/* ── Page ───────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col overflow-x-hidden">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
          <Link href="/" aria-label="ApplyBullets home">
            <Logo size={20} />
          </Link>
          <nav className="hidden sm:flex items-center gap-7">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex text-sm font-semibold px-4 py-2 bg-[var(--navy)] text-white rounded-lg hover:bg-[var(--navy-light)] transition-colors shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-[-100px] right-[-100px] w-[700px] h-[700px] bg-gradient-to-bl from-[#6c5ce7]/8 via-[#00b4d8]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-100px] w-[500px] h-[500px] bg-gradient-to-tr from-[#4E9AD9]/6 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-24 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f0edff] border border-[#d4cfff] mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7] shrink-0" />
                <span className="text-xs font-semibold text-[#6c5ce7] tracking-wide">Free to start · No card required</span>
              </div>

              <h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-bold tracking-[-0.03em] text-[var(--navy)] leading-[1.08] mb-6">
                Your career wins,<br />
                tailored to every{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #6c5ce7, #00b4d8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  role.
                </span>
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed max-w-[480px] mb-8">
                Build a living bank of your achievements. Paste any job description and get a perfectly tailored CV and cover letter — in seconds, not hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--navy)] text-white rounded-xl text-sm font-semibold transition-all hover:bg-[var(--navy-light)] hover:-translate-y-0.5"
                  style={{ boxShadow: '0 4px 20px #1a1f4e33' }}
                >
                  Start for free
                  <ArrowIcon />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  See how it works
                </a>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex -space-x-2">
                  {[['#6c5ce7', '#8b7cf8'], ['#4E9AD9', '#00b4d8'], ['#22c55e', '#16a34a'], ['#f59e0b', '#f97316']].map((g, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white"
                      style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1l1.8 5.4H15l-4.6 3.4 1.8 5.4L8 12l-4.2 3.2 1.8-5.4L1 6.4h5.2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">Loved by job seekers landing interviews faster</span>
                </div>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[`${SIGNUP_CREDITS} free credits on signup`, 'No subscription', 'Cancel anytime'].map(item => (
                  <span key={item} className="flex items-center gap-1.5 text-sm text-gray-400">
                    <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: product preview */}
            <div className="hidden lg:block">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map(item => (
              <div key={item.label}>
                <p className="text-2xl font-bold text-[var(--navy)] mb-0.5">{item.stat}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Why ApplyBullets</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)] mb-4">
              Stop rewriting your CV from scratch
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              One profile, infinite tailored applications. Your career achievements finally work as hard as you do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(f => (
              <div
                key={f.title}
                className="p-7 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all bg-white group"
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 transition-transform group-hover:scale-105"
                  style={{ background: f.bg, color: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">The process</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)]">
              Three steps to a tailored application
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            <div
              className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px pointer-events-none opacity-30 z-0"
              style={{ background: 'linear-gradient(90deg, #6c5ce7, #4E9AD9, #22c55e)' }}
            />

            {steps.map(item => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-6 relative z-10"
                  style={{ background: item.gradient, boxShadow: `0 8px 32px ${item.glow}` }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--navy-light)] transition-colors"
            >
              Start building your profile
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">The difference</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)]">
              The same CV for every job doesn&apos;t work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Old way */}
            <div className="rounded-2xl border border-gray-200 p-7 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">The old way</p>
              <ul className="space-y-3.5">
                {[
                  'One generic CV sent to every role',
                  'Hours spent reworking bullets by hand',
                  'Achievements forgotten by application time',
                  'Cover letters written from a blank page',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-300" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* New way */}
            <div className="rounded-2xl border border-[#d4cfff] p-7 bg-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7]/5 to-[#00b4d8]/5 pointer-events-none" />
              <p className="text-sm font-semibold uppercase tracking-wider mb-5 relative" style={{ color: '#6c5ce7' }}>With ApplyBullets</p>
              <ul className="space-y-3.5 relative">
                {[
                  'Bullets auto-selected to match each job',
                  'A polished application in under a minute',
                  'Every win saved and ready to deploy',
                  'Cover letters drafted from your real story',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span
                      className="w-4 h-4 mt-0.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b4d8)' }}
                    >
                      <CheckIcon className="w-2.5 h-2.5 text-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)]">
              Job seekers love ApplyBullets
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-shadow flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1l1.8 5.4H15l-4.6 3.4 1.8 5.4L8 12l-4.2 3.2 1.8-5.4L1 6.4h5.2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b4d8)' }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 md:py-28 bg-[var(--navy)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
              Simple, pay-as-you-go pricing
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              No subscriptions, no hidden fees. Start free and top up only when you need to.
            </p>
          </div>

          {/* Free starter banner */}
          <div className="max-w-5xl mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Free starter — {SIGNUP_CREDITS} credits</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Around {Math.floor(SIGNUP_CREDITS / perApp)} full applications. Every feature included. No card required.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Get started free →
            </Link>
          </div>

          {/* Credit packs */}
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
            {CREDIT_PACKS.map((pack, i) => {
              const popular = i === 1
              return (
                <div
                  key={pack.id}
                  className={`relative rounded-2xl p-7 flex flex-col ${popular ? 'bg-white' : 'bg-white/5 border border-white/10'}`}
                >
                  {popular && (
                    <div
                      className="absolute top-0 right-6 -translate-y-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6c5ce7, #00b4d8)' }}
                    >
                      Most popular
                    </div>
                  )}
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${popular ? 'text-gray-500' : 'text-gray-400'}`}>
                    {pack.label}
                  </p>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className={`text-4xl font-bold ${popular ? 'text-[var(--navy)]' : 'text-white'}`}>{pack.priceLabel}</span>
                  </div>
                  <p className={`text-sm mb-6 ${popular ? 'text-gray-500' : 'text-gray-400'}`}>
                    {pack.credits} credits · ~{Math.floor(pack.credits / perApp)} full applications
                  </p>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {['Credits never expire', 'All features included', 'One-time purchase'].map(item => (
                      <li key={item} className={`flex items-center gap-2.5 text-sm ${popular ? 'text-gray-600' : 'text-gray-300'}`}>
                        <CheckIcon className={`w-4 h-4 shrink-0 ${popular ? 'text-green-500' : 'text-green-400'}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/signup"
                    className={`inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      popular
                        ? 'bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]'
                        : 'border border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    Start free, buy later →
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            One full application (extract + analyse + CV + cover letter) = {perApp} credits · Secure checkout via Lemon Squeezy.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)]">
              Questions, answered
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map(item => (
              <details
                key={item.q}
                className="group rounded-2xl border border-gray-100 bg-white p-5 hover:border-gray-200 transition-colors [&_svg]:open:rotate-45"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-gray-900 text-sm">
                  {item.q}
                  <svg className="w-4 h-4 text-gray-400 transition-transform shrink-0 ml-4" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="text-sm text-gray-500 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-gray-50/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7]/5 via-transparent to-[#00b4d8]/5 pointer-events-none" />
        <div className="max-w-2xl mx-auto px-5 sm:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--navy)] mb-4">
            Ready to land your next role?
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Join job seekers who have ditched the generic CV. Start free — no card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--navy)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--navy-light)] transition-all hover:-translate-y-0.5"
            style={{ boxShadow: '0 8px 32px #1a1f4e33' }}
          >
            Start for free today
            <ArrowIcon />
          </Link>
          <p className="mt-4 text-sm text-gray-400">{SIGNUP_CREDITS} free credits · No card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="max-w-xs">
              <Logo size={18} />
              <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                Your career wins, tailored to every role. Build once, apply everywhere.
              </p>
            </div>
            <div className="flex gap-12 sm:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Product</p>
                <ul className="space-y-2.5">
                  <li><a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a></li>
                  <li><a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a></li>
                  <li><a href="#faq" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Get started</p>
                <ul className="space-y-2.5">
                  <li><Link href="/auth/signup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign up</Link></li>
                  <li><Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link></li>
                  <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} ApplyBullets. All rights reserved.</p>
            <p className="text-xs text-gray-400">Made for job seekers who value their time.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
