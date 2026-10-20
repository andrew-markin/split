import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { getRandomSecret } from '@/utils'

import { useDataset } from './useDataset'

vi.mock('./useBlob', () => ({
  useBlob: () => ({
    connect: async () => {},
    state: reactive({ dataset: undefined, version: undefined }),
    update: async () => ({ success: true, version: 1 }),
    timestamp: () => Math.floor(Date.now() / 1000)
  })
}))

// Items are own properties, so that Object.keys() lists them like it does
// for the real localStorage
class FakeStorage {
  constructor(quota = Infinity) {
    Object.defineProperty(this, 'quota', { value: quota, writable: true })
  }
  getItem(key) {
    return Object.hasOwn(this, key) ? this[key] : null
  }
  setItem(key, value) {
    const size = Object.entries({ ...this, [key]: String(value) }).reduce(
      (sum, [k, v]) => sum + k.length + v.length,
      0
    )
    if (size > this.quota) throw new Error('QuotaExceededError')
    this[key] = String(value)
  }
  removeItem(key) {
    delete this[key]
  }
}

const randomAnchor = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')

const stateKeys = () => Object.keys(localStorage).filter((key) => key.endsWith(':state'))

const { connect, upsert } = useDataset()

describe('useDataset local storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new FakeStorage())
  })

  it('keeps only the most recently opened splits', async () => {
    const anchors = Array.from({ length: 60 }, randomAnchor)
    const accessed = {}
    anchors.forEach((anchor, i) => {
      accessed[anchor] = i + 1
      localStorage.setItem(`split:${anchor}:state`, JSON.stringify({ dataset: {} }))
      localStorage.setItem(`split:${anchor}:property:payer`, '"x"')
    })
    // The oldest split has local changes not synchronized yet
    localStorage.setItem(
      `split:${anchors[0]}:state`,
      JSON.stringify({ dataset: {}, changed: Date.now() })
    )
    localStorage.setItem('split:accessed', JSON.stringify(accessed))
    localStorage.setItem('split:locale', '"ru"')

    await connect(getRandomSecret())

    const kept = new Set(stateKeys().map((key) => key.split(':')[1]))
    expect(kept.size).toBe(51)
    expect(kept.has(anchors[0])).toBe(true)
    anchors.slice(1, 10).forEach((anchor) => {
      expect(kept.has(anchor)).toBe(false)
      expect(localStorage.getItem(`split:${anchor}:property:payer`)).toBeNull()
    })
    anchors.slice(10).forEach((anchor) => expect(kept.has(anchor)).toBe(true))
    expect(Object.keys(JSON.parse(localStorage.getItem('split:accessed')))).toHaveLength(52)
    expect(localStorage.getItem('split:locale')).toBe('"ru"')
  })

  it('drops older splits and retries when the storage is full', async () => {
    const filler = 'x'.repeat(1000)
    for (let i = 0; i < 20; i++) {
      localStorage.setItem(`split:${randomAnchor()}:state`, JSON.stringify({ filler }))
    }
    localStorage.quota = Object.entries(localStorage).reduce(
      (sum, [k, v]) => sum + k.length + v.length,
      2000
    )

    await connect(getRandomSecret())
    await upsert({ participants: [{ name: 'A'.repeat(2000) }] })

    const keys = stateKeys()
    expect(keys).toHaveLength(6)
    const current = keys.map((key) => JSON.parse(localStorage.getItem(key)))
    expect(current.some((state) => state.dataset?.participants?.length === 1)).toBe(true)
  })
})
