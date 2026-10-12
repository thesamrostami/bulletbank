# BulletBank — Deployment Guide

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://<project>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, never expose to client) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `FIRECRAWL_API_KEY` | No | Firecrawl API key for URL-based job extraction |
| `NODE_ENV` | Auto | Set to `production` by hosting platforms |
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

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).

2. Run the consolidated schema against your database:
   ```
   supabase/schema.sql
   ```
   This is idempotent — safe to run on a fresh database or re-run after partial failures.
   You can run it via the Supabase SQL editor or the CLI:
   ```sh
   supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"
   ```

3. Enable **Email auth** in Authentication → Providers.

4. Storage bucket: the schema creates a private `job-documents` bucket with RLS automatically.
   Verify it appears in Storage after running the schema.

5. Copy the project URL and both keys from Project Settings → API into your environment.

## Rate Limits

API routes are protected by a per-user sliding-window rate limiter backed by Supabase
(see `src/lib/rate-limit-db.ts`). Limits are configured per-route in the route handlers.

Typical defaults (requests per minute):

| Route category | Limit | Window |
|---|---|---|
| Read endpoints (jobs, profile, bullets, etc.) | 60 | 1 minute |
| AI generation (chat, cover letter, CV, etc.) | 20 | 1 minute |
| Destructive actions (delete account) | 5 | 1 minute |

These are **request-level** rate limits. AI features are also gated by the **credit system** —
each action costs credits (see `src/lib/plans.ts` for costs). Rate limits prevent abuse;
credits control usage.

Rate limit values are set inline in each route handler. To adjust, search for
`checkRateLimitWithDb` calls in `src/app/api/`.

## Deploy to Vercel

1. Push the repo to GitHub/GitLab.

2. Import the project in Vercel.

3. Set all required environment variables in Project Settings → Environment Variables.

4. Vercel will detect Next.js and deploy automatically. No additional config needed
   (the `output: 'standalone'` setting in `next.config.ts` is for Docker; Vercel ignores it).

5. Set the **Production** branch to `main`.

## Deploy with Docker (standalone)

The app is built with `output: 'standalone'`, producing a minimal Docker image.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

Pass environment variables via `--env-file .env.production` or your orchestrator's secret store.

## Post-Deploy Checklist

- [ ] `/api/health` returns `{"status":"ok"}` with HTTP 200
- [ ] Sign-up flow creates a row in `profiles` (check Supabase Table Editor)
- [ ] Job extraction works (try pasting a job description on `/jobs/new`)
- [ ] Fit analysis completes without error
- [ ] CV auto-generation works on `/jobs/<id>/apply`
- [ ] CV editor loads on `/jobs/<id>/apply/editor`
- [ ] Cover letter generates and downloads as `.docx`
- [ ] CV downloads as `.docx`
- [ ] Storage bucket `job-documents` is accessible (private bucket with RLS)
- [ ] PWA installs correctly on mobile (visit the site in Chrome/Safari, use "Add to Home Screen")
- [ ] Rate limit hit returns HTTP 429 with a user-readable error message

## Maintenance

### Rate limit log cleanup

The `rate_limit_log` table is pruned automatically on each request (rows older than 1 hour
are deleted). For high-traffic deployments, you can add a scheduled cleanup:

1. Enable the `pg_cron` extension in Supabase (Dashboard → Database → Extensions).
2. Run:
   ```sql
   SELECT cron.schedule('rate-limit-cleanup', '*/15 * * * *',
     $$DELETE FROM rate_limit_log WHERE created_at < now() - INTERVAL '1 hour'$$);
   ```

## GDPR compliance checklist

### Before giving anyone access
- [ ] Accept Anthropic's Data Processing Addendum at console.anthropic.com → Settings → Privacy
- [ ] Enable leaked password protection: Supabase dashboard → Authentication → Settings →
      Security → toggle "Leaked password protection" ON
      (Checks new passwords against HaveIBeenPwned.org)
- [ ] Confirm Supabase project region matches your users' location (EU users → eu-central-1 Frankfurt
      recommended; US users → us-east-1 or us-west-1). Check: Supabase dashboard → Settings → General → Region
- [ ] Set SUPABASE_SERVICE_ROLE_KEY in your hosting environment variables
      (Required for account deletion to remove the auth record)
- [ ] Verify /privacy page loads without authentication

### Data flows to be aware of
- Career content (bullets, work history, skills) → sent to Anthropic API for AI features
- Contact details (phone, address) → stored in Supabase only, never sent to Anthropic
- Uploaded documents → stored in Supabase Storage (EU), text extracted and sent to Anthropic
- Session cookies → set by Supabase Auth, strictly necessary, no consent required

### User rights supported
- Right to access: users can view all their data in profile settings
- Right to rectification: users can edit all data in profile settings
- Right to erasure: full account deletion in profile settings → Danger zone
- Right to withdraw consent: account deletion removes all data and auth record

## Ongoing Migrations

Add future schema changes directly to `supabase/schema.sql` and apply them to your running
database via the Supabase SQL editor or CLI. There is no migrations folder — `schema.sql` is
the single source of truth.
