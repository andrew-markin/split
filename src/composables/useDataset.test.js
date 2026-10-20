import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getNonce, getRandomId, getRandomSecret } from '@/utils'

import { useDataset } from './useDataset'

// The blob state is shared to simulate changes coming from other clients
const blob = vi.hoisted(() => ({ state: undefined }))

vi.mock('./useBlob', async () => {
  const { reactive } = await import('vue')
  blob.state = reactive({ dataset: undefined, version: undefined })
  return {
    useBlob: () => ({
      connect: async () => {},
      state: blob.state,
      update: async () => ({ success: true, version: 1 }),
      timestamp: () => Date.now()
    })
  }
})

const { connect, constrain, find, select, upsert } = useDataset()

constrain({
  participants: {
    patron: { scope: 'participants', fix: 'unset', flat: true }
  },
  expenses: {
    payer: { scope: 'participants', fix: 'remove' }
  }
})

const participants = select('participants', ['name'])
const expenses = select('expenses')

const patrons = () => Object.fromEntries(participants.value.map((p) => [p.name, p.patron]))

describe('useDataset constraints', () => {
  const [a, b, c] = [getRandomId(), getRandomId(), getRandomId()]

  beforeEach(async () => {
    await connect(getRandomSecret())
  })

  it('keeps flat references', async () => {
    await upsert({
      participants: [
        { id: a, name: 'A', patron: b },
        { id: b, name: 'B' },
        { id: c, name: 'C', patron: b }
      ]
    })
    expect(patrons()).toEqual({ A: b, B: undefined, C: b })
  })

  it('unsets chained references', async () => {
    await upsert({
      participants: [
        { id: a, name: 'A', patron: b },
        { id: b, name: 'B', patron: c },
        { id: c, name: 'C' }
      ]
    })
    expect(patrons()).toEqual({ A: undefined, B: c, C: undefined })
  })

  it('unsets cyclic references regardless of the documents order', async () => {
    await upsert({
      participants: [
        { id: a, name: 'A', patron: b },
        { id: b, name: 'B', patron: a }
      ]
    })
    expect(patrons()).toEqual({ A: undefined, B: undefined })
  })

  it('unsets references to removed documents', async () => {
    await upsert({
      participants: [
        { id: a, name: 'A', patron: b },
        { id: b, name: 'B' }
      ]
    })
    await upsert({ participants: [{ id: b, removed: true }] })
    expect(patrons()).toEqual({ A: undefined })
  })

  it('removes documents referencing removed ones', async () => {
    await upsert({
      participants: [{ id: a, name: 'A' }],
      expenses: [{ payer: a, amount: '1.00' }]
    })
    expect(expenses.value).toHaveLength(1)
    await upsert({ participants: [{ id: a, removed: true }] })
    expect(expenses.value).toHaveLength(0)
  })
})

const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Nonce of older versions: timestamp in seconds and 22 random characters
function getLegacyNonce(seconds) {
  let result = ''
  for (let value = seconds; value > 0; value = Math.floor(value / 62)) {
    result = base62[value % 62] + result
  }
  const random = Array.from({ length: 22 }, () => base62[Math.floor(Math.random() * 62)])
  return result.padStart(6, '0') + random.join('')
}

describe('useDataset changes ordering', () => {
  beforeEach(async () => {
    await connect(getRandomSecret())
  })

  // Simulates a change of another client, which is fetched after a delay
  async function receive(collection, document, version) {
    blob.state.dataset = { [collection]: [document] }
    blob.state.version = version
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  it('keeps the latest of quick changes', async () => {
    for (let i = 0; i < 100; i++) {
      const id = getRandomId()
      await upsert({ items: [{ id, name: 'first' }] })
      await upsert({ items: [{ id, name: 'second' }] })
      expect(find('items', id).value.name).toBe('second')
    }
  })

  it('overrides seen values even when their clocks are ahead', async () => {
    const id = getRandomId()
    const nonce = getNonce(Date.now() + 60000)
    await receive('items', { id, name: { value: 'ahead', nonce } }, 100)
    expect(find('items', id).value.name).toBe('ahead')
    await upsert({ items: [{ id, name: 'local' }] })
    expect(find('items', id).value.name).toBe('local')
  })

  it('overrides values of older versions with nonces in seconds', async () => {
    const id = getRandomId()
    const nonce = getLegacyNonce(Math.floor(Date.now() / 1000) + 3600)
    await receive('items', { id, name: { value: 'legacy', nonce } }, 101)
    expect(find('items', id).value.name).toBe('legacy')
    await upsert({ items: [{ id, name: 'current' }] })
    expect(find('items', id).value.name).toBe('current')
  })
})
