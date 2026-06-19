import type { NextConfig } from 'next'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('@ducanh2912/next-pwa').default

// Static Content-Security-Policy applied to every response.
//
// A per-request nonce was intentionally NOT used: Next.js cannot inject a runtime
// nonce into statically prerendered pages (the landing page, /privacy, /terms), so
// a nonce-based policy blocks hydration on those routes. 'unsafe-inline' for scripts
// is the pragmatic trade-off that works identically on static and dynamic pages,
// while object-src/base-uri/frame-ancestors/form-action still provide hardening.
//
// 'unsafe-eval' is added in development only: Next.js 15 Turbopack uses eval() for
// HMR module evaluation. Without it the CSP blocks the runtime and React never
// hydrates, so all 'use client' components (including the cookie banner) are inert.
// Production builds never use eval, so the strict policy is kept there.
const isDev = process.env.NODE_ENV !== 'production'
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.lemonsqueezy.com https://challenges.cloudflare.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.clarity.ms",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src blob: 'self'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  turbopack: {},
  serverExternalPackages: ['pdfkit'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig)
