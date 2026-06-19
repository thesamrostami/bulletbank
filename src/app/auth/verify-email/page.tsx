import Link from 'next/link'
import Logo from '@/components/Logo'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size={20} />
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-16 relative">
        {/* Background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#6c5ce7]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4E9AD9]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm text-center relative">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b4d8)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[var(--navy)] mb-3">Check your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            We sent a confirmation link to your email address.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Click the link to activate your account, then sign in below.
          </p>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--navy-light)] transition-colors"
            style={{ boxShadow: '0 4px 14px #1a1f4e22' }}
          >
            Go to sign in
          </Link>

          <p className="mt-6 text-xs text-gray-400 leading-relaxed">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <Link href="/auth/signup" className="underline hover:text-gray-600 transition-colors">
              try a different email
            </Link>
            .
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-5">
        <div className="flex items-center justify-between px-5 sm:px-8 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo size={15} />
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} ApplyBullets</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
