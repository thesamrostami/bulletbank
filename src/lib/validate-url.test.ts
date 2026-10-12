import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DNS so assertPublicUrl never touches the network.
const lookup = vi.fn()
vi.mock('node:dns/promises', () => ({ lookup: (...args: unknown[]) => lookup(...args) }))

import { isPrivateIp, validateJobUrl, assertPublicUrl } from './validate-url'

describe('isPrivateIp', () => {
  describe('IPv4', () => {
    it.each([
      ['0.0.0.0', 'this-network'],
      ['10.0.0.1', '10/8'],
      ['127.0.0.1', 'loopback'],
      ['127.255.255.255', 'loopback range end'],
      ['169.254.169.254', 'cloud metadata endpoint'],
      ['172.16.0.1', '172.16/12 start'],
      ['172.31.255.255', '172.16/12 end'],
      ['192.168.1.1', '192.168/16'],
      ['100.64.0.1', 'CGNAT start'],
      ['100.127.255.255', 'CGNAT end'],
      ['224.0.0.1', 'multicast'],
      ['255.255.255.255', 'broadcast'],
    ])('treats %s as private (%s)', (ip) => {
      expect(isPrivateIp(ip)).toBe(true)
    })

    it.each([
      ['8.8.8.8'],
      ['1.1.1.1'],
      ['172.15.0.1'],
      ['172.32.0.1'],
      ['100.63.255.255'],
      ['100.128.0.0'],
      ['203.0.113.10'],
    ])('treats %s as public', (ip) => {
      expect(isPrivateIp(ip)).toBe(false)
    })

    it('rejects malformed IPv4 as not-private (caller must validate separately)', () => {
      expect(isPrivateIp('1.2.3')).toBe(false)
      expect(isPrivateIp('1.2.3.4.5')).toBe(false)
      expect(isPrivateIp('256.1.1.1')).toBe(false)
      expect(isPrivateIp('a.b.c.d')).toBe(false)
    })

    it('ignores surrounding whitespace and case', () => {
      expect(isPrivateIp('  127.0.0.1  ')).toBe(true)
    })
  })

  describe('IPv6', () => {
    it.each([
      ['::1', 'loopback'],
      ['::', 'unspecified'],
      ['fe80::1', 'link-local'],
      ['FE80::1', 'link-local uppercase'],
      ['fc00::1', 'unique-local fc'],
      ['fd12:3456::1', 'unique-local fd'],
      ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
      ['::ffff:10.0.0.1', 'IPv4-mapped private'],
    ])('treats %s as private (%s)', (ip) => {
      expect(isPrivateIp(ip)).toBe(true)
    })

    it.each([
      ['2606:4700:4700::1111'],
      ['2001:db8::1'],
      ['::ffff:8.8.8.8'],
    ])('treats %s as public', (ip) => {
      expect(isPrivateIp(ip)).toBe(false)
    })
  })
})

describe('validateJobUrl', () => {
  it('accepts a public https URL and returns the parsed URL', () => {
    const result = validateJobUrl('https://example.com/jobs/123')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.url.hostname).toBe('example.com')
  })

  it('accepts http', () => {
    expect(validateJobUrl('http://example.com').ok).toBe(true)
  })

  it.each([
    ['an empty string', ''],
    ['a 2,049-character string', 'x'.repeat(2049)],
  ])('rejects %s', (_label, input) => {
    const result = validateJobUrl(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/non-empty string under 2,048/)
  })

  it('rejects non-string input', () => {
    expect(validateJobUrl(null as unknown as string).ok).toBe(false)
    expect(validateJobUrl(42 as unknown as string).ok).toBe(false)
  })

  it('rejects unparseable URLs', () => {
    const result = validateJobUrl('not a url')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid URL format.')
  })

  it.each([
    'ftp://example.com/file',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'gopher://example.com',
  ])('rejects non-http scheme %s', (input) => {
    const result = validateJobUrl(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Only HTTP and HTTPS/)
  })

  it.each([
    'http://localhost/admin',
    'http://LOCALHOST:3000',
    'http://app.localhost',
    'http://127.0.0.1',
    'http://10.0.0.1',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'http://[fe80::1]/',
  ])('rejects private/reserved host %s', (input) => {
    const result = validateJobUrl(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/private or reserved/)
  })
})

describe('assertPublicUrl', () => {
  beforeEach(() => {
    lookup.mockReset()
  })

  it('resolves when every address is public', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34' }, { address: '2606:2800:220:1:248:1893:25c8:1946' }])
    await expect(assertPublicUrl('https://example.com')).resolves.toBeUndefined()
  })

  it('accepts a URL object as well as a string', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34' }])
    await expect(assertPublicUrl(new URL('https://example.com'))).resolves.toBeUndefined()
  })

  it('throws when any resolved address is private (DNS rebinding guard)', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34' }, { address: '10.0.0.5' }])
    await expect(assertPublicUrl('https://evil.example')).rejects.toThrow(/private or reserved/)
  })

  it('throws when the hostname resolves to nothing', async () => {
    lookup.mockResolvedValue([])
    await expect(assertPublicUrl('https://nowhere.example')).rejects.toThrow(/private or reserved/)
  })

  it('throws a clear error when DNS lookup fails', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(assertPublicUrl('https://missing.example')).rejects.toThrow('Could not resolve host')
  })

  it('requests all addresses and lowercases the host', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34' }])
    await assertPublicUrl('https://Example.COM/path')
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true, verbatim: true })
  })
})
