/**
 * Validates that a URL is safe to fetch on behalf of a user (SSRF prevention).
 *
 * `validateJobUrl` is a cheap synchronous first pass (scheme + literal private IPs).
 * `assertPublicUrl` is the real guard: it resolves the hostname via DNS and checks
 * every resolved address, which also catches alternate IP encodings (getaddrinfo
 * normalises decimal/octal/hex) and hostnames that point at internal addresses.
 */

import { lookup } from 'node:dns/promises'

/** Returns true if an IP literal falls in a private / reserved / loopback range. */
export function isPrivateIp(ip: string): boolean {
  const addr = ip.trim().toLowerCase()

  // IPv6
  if (addr.includes(':')) {
    if (addr === '::1' || addr === '::') return true
    // Link-local (fe80::/10) and unique-local (fc00::/7)
    if (/^fe[89ab]/.test(addr)) return true
    if (/^f[cd]/.test(addr)) return true
    // IPv4-mapped (::ffff:127.0.0.1) — check the embedded IPv4
    const mapped = addr.match(/(?:::ffff:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (mapped) return isPrivateIp(mapped[1])
    return false
  }

  // IPv4
  const parts = addr.split('.')
  if (parts.length !== 4) return false
  const octets = parts.map(p => Number(p))
  if (octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) return false
  const [a, b] = octets

  if (a === 0) return true                                   // 0.0.0.0/8
  if (a === 10) return true                                  // 10/8
  if (a === 127) return true                                 // loopback
  if (a === 169 && b === 254) return true                    // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true           // 172.16/12
  if (a === 192 && b === 168) return true                    // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true          // CGNAT 100.64/10
  if (a >= 224) return true                                  // multicast / reserved
  return false
}

export function validateJobUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string' || raw.length > 2048) {
    return { ok: false, error: 'URL must be a non-empty string under 2,048 characters.' }
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, error: 'Invalid URL format.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP and HTTPS URLs are supported.' }
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { ok: false, error: 'This URL points to a private or reserved address and cannot be fetched.' }
  }
  // If the host is a literal IP, reject private/reserved ranges up front.
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateIp(hostname)) {
      return { ok: false, error: 'This URL points to a private or reserved address and cannot be fetched.' }
    }
  }

  return { ok: true, url: parsed }
}

/**
 * Resolves the URL's hostname and throws if any resolved address is private/reserved.
 * Must be called immediately before fetching. Catches DNS names that point at
 * internal IPs and alternate IP encodings normalised by the resolver.
 */
export async function assertPublicUrl(url: string | URL): Promise<void> {
  const hostname = (typeof url === 'string' ? new URL(url) : url).hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')

  let addresses: Array<{ address: string }>
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new Error('Could not resolve host')
  }

  if (addresses.length === 0 || addresses.some(a => isPrivateIp(a.address))) {
    throw new Error('URL resolves to a private or reserved address')
  }
}
