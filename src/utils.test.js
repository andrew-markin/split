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

describe('getNonce', () => {
  it('makes nonces of 28 base62 characters ordered by their timestamps', () => {
    const now = Date.now()
    const nonces = [now - 1, now, now + 1, now + 1000].map((timestamp) => getNonce(timestamp))
    nonces.forEach((nonce) => expect(nonce).toMatch(/^[0-9A-Za-z]{28}$/))
    expect([...nonces].sort()).toEqual(nonces)
    expect(getNonceTimestamp(nonces[1])).toBe(now)
  })

  it('orders nonces of older versions with timestamps in seconds before current ones', () => {
    const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const seconds = Math.floor(Date.now() / 1000)
    let encoded = ''
    for (let value = seconds; value > 0; value = Math.floor(value / 62)) {
      encoded = base62[value % 62] + encoded
    }
    const legacy = encoded.padStart(6, '0') + 'z'.repeat(22)
    expect(getNonceTimestamp(legacy)).toBe(seconds * 1000)
    // Even nonces made long before are greater than the ones of older versions
    expect(legacy < getNonce(Date.UTC(2020, 0, 1))).toBe(true)
  })
})
