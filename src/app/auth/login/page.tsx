'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

/* ── Page ───────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (SITE_KEY && !captchaToken) {
      setError('Please complete the security check.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">Don&apos;t have an account?</span>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold px-4 py-2 bg-[var(--navy)] text-white rounded-lg hover:bg-[var(--navy-light)] transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col">

        {/* Form side */}
        <div className="flex-1 flex flex-col relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#6c5ce7]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4E9AD9]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12 relative">
            <div className="w-full max-w-sm">

              <h1 className="text-2xl font-bold text-[var(--navy)] mb-1">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-8">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="font-medium text-[var(--navy)] underline underline-offset-2 hover:opacity-70 transition-opacity">
                  Sign up free
                </Link>
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 pr-11 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {SITE_KEY && (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={SITE_KEY}
                    onSuccess={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    options={{ theme: 'light', size: 'normal' }}
                  />
                )}

                {error && (
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!!SITE_KEY && !captchaToken)}
                  className="w-full py-3 bg-[var(--navy)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--navy-light)] disabled:opacity-50 transition-colors"
                  style={{ boxShadow: '0 4px 14px #1a1f4e22' }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-400">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600 transition-colors">Terms of service</Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy notice</Link>.
              </p>
            </div>
          </div>
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
