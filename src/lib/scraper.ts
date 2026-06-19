import * as cheerio from 'cheerio'
import { assertPublicUrl } from '@/lib/validate-url'

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('No Firecrawl key')

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`Firecrawl ${res.status}`)

  const data = await res.json()
  const text: string = data?.data?.markdown ?? data?.markdown ?? ''
  if (!text || text.length < 100) throw new Error('Firecrawl returned too little content')
  return text
}

async function scrapeWithCheerio(url: string): Promise<string> {
  // SSRF guard: this is a direct server-side fetch, so re-check that the host
  // resolves to a public address right before fetching, and do not follow
  // redirects (a redirect could point at an internal address).
  await assertPublicUrl(url)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ApplyBullets/1.0; job application tracker)',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  })

  if (res.status >= 300 && res.status < 400) {
    throw new Error('Refusing to follow redirect')
  }
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  $('script, style, nav, header, footer, iframe, noscript, svg').remove()

  const selectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[id*="job-description"]',
    '[class*="posting"]',
    'main',
    'article',
    '.content',
    '#content',
  ]

  let text = ''
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length && el.text().trim().length > 200) {
      text = el.text()
      break
    }
  }

  if (!text) text = $('body').text()

  const cleaned = text
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim()

  if (cleaned.length < 100) throw new Error('Too little content')
  return cleaned
}

function cleanScrapedText(text: string): string {
  const lines = text.split('\n')

  const cleaned = lines
    .filter(line => line.trim().length > 15)
    .filter(line => {
      const lower = line.toLowerCase().trim()
      const noise = [
        'cookie', 'privacy policy', 'terms of service', 'sign in', 'sign up',
        'log in', 'register', 'subscribe', 'newsletter', 'follow us',
        'all rights reserved', 'copyright', '©', 'powered by',
        'similar jobs', 'recommended jobs', 'people also viewed',
        'share this job', 'save this job', 'apply now', 'easy apply',
        'report this job', 'flag as', 'back to search',
      ]
      return !noise.some(n => lower.includes(n))
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, ' ')
    .trim()

  return cleaned
}

export async function scrapeJobPage(url: string): Promise<string> {
  let text: string

  try {
    text = await scrapeWithFirecrawl(url)
  } catch {
    text = await scrapeWithCheerio(url)
  }

  return cleanScrapedText(text).slice(0, 8000)
}
