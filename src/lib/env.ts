function required(name: string): string {
  const value = process.env[name]
  if (!value && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value ?? ''
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

// ── Core (required for app to function) ──
export const NEXT_PUBLIC_SUPABASE_URL = required('NEXT_PUBLIC_SUPABASE_URL')
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')
export const ANTHROPIC_API_KEY = required('ANTHROPIC_API_KEY')

// ── Optional ──
export const FIRECRAWL_API_KEY = optional('FIRECRAWL_API_KEY')
export const NEXT_PUBLIC_APP_URL = optional('NEXT_PUBLIC_APP_URL')
export const NEXT_PUBLIC_TURNSTILE_SITE_KEY = optional('NEXT_PUBLIC_TURNSTILE_SITE_KEY')

// ── Lemon Squeezy (required only if payments are enabled) ──
export const LEMONSQUEEZY_API_KEY = optional('LEMONSQUEEZY_API_KEY')
export const LEMONSQUEEZY_STORE_ID = optional('LEMONSQUEEZY_STORE_ID')
export const LEMONSQUEEZY_WEBHOOK_SECRET = optional('LEMONSQUEEZY_WEBHOOK_SECRET')
export const LEMONSQUEEZY_STARTER_VARIANT_ID = optional('LEMONSQUEEZY_STARTER_VARIANT_ID')
export const LEMONSQUEEZY_STANDARD_VARIANT_ID = optional('LEMONSQUEEZY_STANDARD_VARIANT_ID')
export const LEMONSQUEEZY_PRO_VARIANT_ID = optional('LEMONSQUEEZY_PRO_VARIANT_ID')
