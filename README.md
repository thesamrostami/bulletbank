# BulletBank

[![CI](https://github.com/thesamrostami/bulletbank/actions/workflows/ci.yml/badge.svg)](https://github.com/thesamrostami/bulletbank/actions/workflows/ci.yml)

AI-powered job application tool. Build a living bank of career achievements, paste any job, and get a tailored CV in seconds.

## Features

- **One-click CV generation** — paste a job URL or description, get a tailored CV automatically
- **Bullet bank** — log career achievements as they happen, reuse them across applications
- **Fit analysis** — see how well your profile matches each role with scored breakdowns
- **Cover letter generation** — AI-drafted cover letters tailored to each application
- **Interview prep** — role-specific question generation with STAR story prompts
- **Review pack** — turn achievements logged over a period into a draft performance-review self-assessment
- **Job tracker** — track application status, interview dates, and documents in one place
- **CV editor** — power-user mode for manual bullet selection and fine-tuning

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (Postgres + Auth + Storage)
- **AI**: Anthropic Claude API
- **Deployment**: Vercel or Docker

## Getting Started

### Prerequisites

- Node.js 20+ (Docker image uses Node 22)
- A Supabase project (EU region recommended for GDPR)
- An Anthropic API key

### Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/thesamrostami/bulletbank.git
   cd bulletbank
   npm install
   ```

2. Copy the environment template and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

3. Run the database schema against your Supabase project:
   ```
   supabase/schema.sql
   ```
   Run it via the Supabase SQL Editor or CLI. It's idempotent — safe to re-run.

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `FIRECRAWL_API_KEY` | No | Firecrawl API key for URL-based job extraction |
| `LEMONSQUEEZY_API_KEY` | For payments | Lemon Squeezy API key |
| `LEMONSQUEEZY_STORE_ID` | For payments | Your Lemon Squeezy store ID |
| `LEMONSQUEEZY_STARTER_VARIANT_ID` | For payments | Variant ID for the starter credit pack |
| `LEMONSQUEEZY_STANDARD_VARIANT_ID` | For payments | Variant ID for the standard credit pack |
| `LEMONSQUEEZY_PRO_VARIANT_ID` | For payments | Variant ID for the pro credit pack |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | For payments | Secret for verifying Lemon Squeezy webhook signatures |
| `NEXT_PUBLIC_APP_URL` | No | Canonical app URL (defaults to request origin; set if behind a proxy) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key for login/signup CAPTCHA |
| `NEXT_PUBLIC_GA_ID` | No | Google Analytics measurement ID |
| `NEXT_PUBLIC_CLARITY_ID` | No | Microsoft Clarity project ID |

## Testing

Unit tests use [Vitest](https://vitest.dev) and live next to the code they cover (`src/lib/*.test.ts`).

```bash
npm test              # run once
npm run test:watch    # re-run on change
npm run test:coverage # with coverage report
npm run typecheck     # tsc --noEmit
npm run lint
```

Covered areas:

- **AI layer** — `parse-ai-json` (recovering JSON from noisy model output), `validate-ai-output` (runtime shape checks before data reaches the DB), `ai-client` (temperature profiles, retry-once on 429/5xx/network errors, no retry on 4xx)
- **Credits & rate limiting** — atomic deduction is fail-closed, rate limiting is fail-open, correct RPC payloads, 402/429 response shapes
- **Security** — `strip-pii` (redaction before text is sent to the LLM), `validate-url` (SSRF guard: private IP ranges, IPv6, IPv4-mapped, DNS-resolved addresses)
- **Domain logic** — bullet strength scoring, Jaccard-based duplicate detection, credit pack configuration consistency

External services (Supabase, Anthropic, DNS) are mocked; no test touches the network.

## Continuous Integration

Every push runs `.github/workflows/ci.yml` on GitHub Actions: lint → typecheck → test, then a production `next build` with placeholder env vars. Pull requests to `main` must be green before merging.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions (Vercel, Docker, GDPR checklist).

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated app routes
│   │   ├── dashboard/   # Home dashboard
│   │   ├── jobs/        # Job tracker, detail, apply, editor, interview prep
│   │   ├── capture/     # Quick achievement logging (PWA shortcut target)
│   │   ├── review-pack/ # Performance-review self-assessment drafts
│   │   └── profile/     # Profile, onboarding, bullet bank, experience
│   ├── auth/            # Login, signup, callback
│   └── api/             # API routes (jobs, CV, bullets, cover letter, etc.)
├── components/          # Shared components (Logo, MicroCapture, FAB, etc.)
├── lib/                 # Utilities (prompts, config, rate-limit, fonts, etc.) + *.test.ts
└── types/               # TypeScript type definitions
supabase/
└── schema.sql           # Complete database schema (single source of truth)
```

## Acknowledgements

This project was built entirely with the help of [Claude Code](https://claude.ai/code) — Anthropic's agentic coding tool.

From the initial architecture to the database schema, API routes, UI components, security review, and deployment docs, Claude Code was involved at every step. It wasn't just autocomplete — it planned features, caught bugs before they shipped, wrote and refactored across the full stack, and helped think through product decisions along the way.

If you're building something and haven't tried Claude Code yet, it's worth a look. It genuinely changes how fast and confidently you can ship.

## License

MIT
