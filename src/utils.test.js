import { describe, expect, it } from 'vitest'

import { getNonce, getNonceTimestamp, getRandomSecret, packValue, unpackValue } from '@/utils'

describe('packValue / unpackValue', () => {
  it('restores the packed value', async () => {
    const secret = getRandomSecret()
    const value = { title: 'Тест', items: Array.from({ length: 5000 }, (_, i) => i) }
    expect(await unpackValue(await packValue(value, secret), secret)).toEqual(value)
  })

  it('works without native base64 support of Uint8Array', async () => {
    const { toBase64 } = Uint8Array.prototype
    const { fromBase64 } = Uint8Array
    try {
      delete Uint8Array.prototype.toBase64
      delete Uint8Array.fromBase64
      const secret = getRandomSecret()
      const value = { items: Array.from({ length: 50000 }, () => Math.random()) }
      const packed = await packValue(value, secret)
      expect(await unpackValue(packed, secret)).toEqual(value)
      if (fromBase64) {
        // Fallback encoding must be compatible with the native one
        Uint8Array.fromBase64 = fromBase64
        expect(await unpackValue(packed, secret)).toEqual(value)
      }
    } finally {
      if (toBase64) Uint8Array.prototype.toBase64 = toBase64
      if (fromBase64) Uint8Array.fromBase64 = fromBase64
    }
  })
})

const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function encodeBase62(value) {
  let result = ''
  for (; value > 0; value = Math.floor(value / 62)) result = base62[value % 62] + result
  return result
}

// Nonce of older versions: 6 characters of the timestamp in seconds and 22
// random ones, here all filled with the given character
const legacyNonce = (seconds, char) => encodeBase62(seconds).padStart(6, '0') + char.repeat(22)

describe('getNonce', () => {
  it('makes nonces of 28 base62 characters ordered by their timestamps', () => {
    const now = Date.now()
    const nonces = [now - 1, now, now + 1, now + 1000].map((timestamp) => getNonce(timestamp))
    nonces.forEach((nonce) => expect(nonce).toMatch(/^[0-9A-Za-z]{28}$/))
    expect([...nonces].sort()).toEqual(nonces)
    expect(getNonceTimestamp(nonces[1])).toBe(now)
  })

  it('rejects timestamps not in milliseconds', () => {
    const seconds = Math.floor(Date.now() / 1000)
    expect(() => getNonce(seconds)).toThrow('Invalid nonce timestamp')
    expect(() => getNonce(NaN)).toThrow('Invalid nonce timestamp')
    expect(() => getNonce(null)).toThrow('Invalid nonce timestamp')
    expect(getNonce()).toMatch(/^[A-Za-z][0-9A-Za-z]{27}$/)
  })

  it('orders nonces of older versions with timestamps in seconds before current ones', () => {
    const seconds = Math.floor(Date.now() / 1000)
    const legacy = legacyNonce(seconds, 'z')
    expect(getNonceTimestamp(legacy)).toBe(seconds * 1000)
    // Even nonces made long before are greater than the ones of older versions
    expect(legacy < getNonce(Date.UTC(2020, 0, 1))).toBe(true)
  })

  // The timestamps are encoded entirely, so older nonces don't share prefixes
  // with current ones of the same second: they start with a digit, while
  // current ones start with a letter
  it('orders the greatest older nonce before the least current one of the same second', () => {
    const seconds = Math.floor(Date.now() / 1000)
    const greatestLegacy = legacyNonce(seconds, 'z')
    const leastCurrent = encodeBase62(seconds * 1000).padStart(7, '0') + '0'.repeat(21)
    expect(greatestLegacy).toMatch(/^[0-9]/)
    expect(leastCurrent).toMatch(/^[A-Za-z]/)
    expect(greatestLegacy < leastCurrent).toBe(true)
    expect(greatestLegacy < getNonce(seconds * 1000)).toBe(true)
  })

  it('keeps older nonces before current ones until the year 2260', () => {
    // Older nonces start with a letter since 10 * 62^5 seconds (the year 2260),
    // current ones since 10 * 62^6 milliseconds (the year 1988)
    const latestLegacy = legacyNonce(10 * 62 ** 5 - 1, 'z')
    const earliestCurrent = encodeBase62(10 * 62 ** 6).padStart(7, '0') + '0'.repeat(21)
    expect(new Date((10 * 62 ** 5 - 1) * 1000).getUTCFullYear()).toBe(2260)
    expect(latestLegacy < earliestCurrent).toBe(true)
  })
})
