import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { getCipher, getNonce, getRandomId, getRandomSecret } from '@/utils'

import { useDataset } from './useDataset'

vi.mock('./useBlob', () => ({
  useBlob: () => ({
    connect: async () => {},
    state: reactive({ dataset: undefined, version: undefined }),
    update: async () => ({ success: true, version: 1 }),
    timestamp: () => Date.now()
  })
}))

const CIPHER_SALT = import.meta.env.VITE_CIPHER_SALT

// Items are own properties, so that Object.keys() lists them like it does
// for the real localStorage
class FakeStorage {
  getItem(key) {
    return Object.hasOwn(this, key) ? this[key] : null
  }
  setItem(key, value) {
    this[key] = String(value)
  }
  removeItem(key) {
    delete this[key]
  }
}

function request(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('split')
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const db = opening.result
      const transaction = db.transaction([storeName], mode)
      const result = callback(transaction.objectStore(storeName))
      transaction.oncomplete = () => {
        db.close()
        resolve(result?.result)
      }
      transaction.onerror = () => reject(transaction.error)
    }
  })
}

const readStates = () => request('states', 'readonly', (store) => store.getAll())
const readMeta = () => request('meta', 'readonly', (store) => store.getAll())

const getAnchor = (secret) => getCipher(secret, CIPHER_SALT, 'STORAGE_ANCHOR')

const randomAnchor = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')

const { clone, connect, locals, modified, select, upsert } = useDataset()

const participants = select('participants')

describe('useDataset local copies', () => {
  beforeEach(async () => {
    vi.stubGlobal('localStorage', new FakeStorage())
    // Leave the previous split, so that its writes are finished
    await connect(getRandomSecret())
    await request('states', 'readwrite', (store) => store.clear())
    await request('meta', 'readwrite', (store) => store.clear())
  })

  it('keeps splits encrypted and restores them', async () => {
    const secret = getRandomSecret()
    const anchor = await getAnchor(secret)
    await connect(secret)
    await upsert({ participants: [{ name: 'Alice' }] })
    locals.set('payer', 'someone')
    await connect(getRandomSecret())

    const states = await readStates()
    expect(states).toHaveLength(1)
    expect(states[0]).toBeInstanceOf(Uint8Array)
    expect(new TextDecoder().decode(states[0])).not.toContain('Alice')
    expect((await readMeta()).find((meta) => meta.anchor === anchor)?.dirty).toBe(true)

    await connect(secret)
    expect(participants.value.map(({ name }) => name)).toEqual(['Alice'])
    expect(locals.get('payer')).toBe('someone')
    expect(modified.value).toBe(true)
  })

  it('clones splits as having changes', async () => {
    await connect(getRandomSecret())
    await upsert({ participants: [{ name: 'Bob' }] })
    const secret = getRandomSecret()
    await clone(secret)

    await connect(secret)
    expect(participants.value.map(({ name }) => name)).toEqual(['Bob'])
    expect(modified.value).toBe(true)
  })

  it('keeps only the most recently opened splits', async () => {
    const anchors = Array.from({ length: 60 }, randomAnchor)
    await request('meta', 'readwrite', (store) =>
      anchors.forEach((anchor, i) =>
        // The oldest split has local changes not synchronized yet
        store.put({ anchor, accessed: i + 1, dirty: i === 0 })
      )
    )
    await request('states', 'readwrite', (store) => {
      anchors.forEach((anchor) => store.put(new Uint8Array(16), anchor))
      store.put(new Uint8Array(16), randomAnchor())
    })

    const secret = getRandomSecret()
    await connect(secret)

    const kept = new Set((await readMeta()).map(({ anchor }) => anchor))
    expect(kept.size).toBe(52)
    expect(kept.has(await getAnchor(secret))).toBe(true)
    expect(kept.has(anchors[0])).toBe(true)
    anchors.slice(1, 10).forEach((anchor) => expect(kept.has(anchor)).toBe(false))
    anchors.slice(10).forEach((anchor) => expect(kept.has(anchor)).toBe(true))
    // The state without meta is gone as well as the pruned ones
    expect(await readStates()).toHaveLength(51)
  })

  it('moves local copies from the local storage', async () => {
    const secret = getRandomSecret()
    const anchor = await getAnchor(secret)
    const [stale, changed] = [randomAnchor(), randomAnchor()]
    const dataset = {
      participants: [{ id: getRandomId(), name: { value: 'Carol', nonce: getNonce() } }]
    }
    localStorage.setItem(`split:${anchor}:state`, JSON.stringify({ dataset, version: 3 }))
    localStorage.setItem(`split:${anchor}:property:payer`, '"carol"')
    localStorage.setItem(`split:${stale}:state`, JSON.stringify({ dataset: {} }))
    localStorage.setItem(`split:${stale}:property:payer`, '"x"')
    localStorage.setItem(`split:${changed}:state`, JSON.stringify({ dataset: {}, changed: 1 }))
    localStorage.setItem('split:accessed', JSON.stringify({ [anchor]: 1, [stale]: 2 }))
    localStorage.setItem('split:locale', '"ru"')

    await connect(secret)

    expect(participants.value.map(({ name }) => name)).toEqual(['Carol'])
    expect(locals.get('payer')).toBe('carol')
    expect(modified.value).toBe(false)
    expect(Object.keys(localStorage).sort()).toEqual(
      [`split:${changed}:state`, 'split:locale'].sort()
    )
    expect(await readStates()).toHaveLength(1)
  })
})
