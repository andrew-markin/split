import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { getRandomId, getRandomSecret } from '@/utils'

import { useDataset } from './useDataset'

vi.mock('./useBlob', () => ({
  useBlob: () => ({
    connect: async () => {},
    state: reactive({ dataset: undefined, version: undefined }),
    update: async () => ({ success: true, version: 1 }),
    timestamp: () => Math.floor(Date.now() / 1000)
  })
}))

const { connect, constrain, select, upsert } = useDataset()

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
