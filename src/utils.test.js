import { describe, expect, it } from 'vitest'

import { getRandomSecret, packValue, unpackValue } from '@/utils'

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
