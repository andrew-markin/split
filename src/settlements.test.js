import { describe, expect, it } from 'vitest'

import { calculateSettlements } from '@/settlements'

const participants = (...ids) => ids.map((id) => ({ id, name: id.toUpperCase() }))

describe('calculateSettlements', () => {
  it('returns nothing for an empty split', () => {
    expect(calculateSettlements({})).toEqual([])
  })

  it('splits a common expense equally', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b'),
      expenses: [{ id: 'e1', payer: 'a', amount: '10.00' }]
    })
    expect(result).toEqual([{ sender: 'b', receiver: 'a', amount: '5.00' }])
  })

  it('distributes leftover cents so that nothing is lost', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b', 'c'),
      expenses: [{ id: 'e1', payer: 'c', amount: '1.00' }]
    })
    expect(result).toEqual([
      { sender: 'a', receiver: 'c', amount: '0.34' },
      { sender: 'b', receiver: 'c', amount: '0.33' }
    ])
  })

  it('converts amounts to cents without floating point errors', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b'),
      expenses: [{ id: 'e1', payer: 'b', amount: '0.57' }]
    })
    expect(result).toEqual([{ sender: 'a', receiver: 'b', amount: '0.29' }])
  })

  it('redirects dependents expenses share to their patron', () => {
    const result = calculateSettlements({
      participants: [...participants('a', 'b'), { id: 'c', name: 'C', patron: 'a' }],
      expenses: [{ id: 'e1', payer: 'b', amount: '3.00' }]
    })
    expect(result).toEqual([{ sender: 'a', receiver: 'b', amount: '2.00' }])
  })

  it('splits categorised expenses among active participations only', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b', 'c'),
      categories: [{ id: 'k', name: 'K' }],
      participations: [
        { id: 'p1', participant: 'a', category: 'k', active: true, rate: 100 },
        { id: 'p2', participant: 'b', category: 'k', active: true, rate: 300 },
        { id: 'p3', participant: 'c', category: 'k', active: false, rate: 100 }
      ],
      expenses: [{ id: 'e1', payer: 'c', category: 'k', amount: '8.00' }]
    })
    expect(result).toEqual([
      { sender: 'a', receiver: 'c', amount: '2.00' },
      { sender: 'b', receiver: 'c', amount: '6.00' }
    ])
  })

  it('hides settlements covered by transfers', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b', 'c'),
      expenses: [{ id: 'e1', payer: 'c', amount: '1.00' }],
      transfers: [{ id: 't1', sender: 'a', receiver: 'c', amount: '0.34', nonce: '1' }]
    })
    expect(result).toEqual([{ sender: 'b', receiver: 'c', amount: '0.33' }])
  })

  it('compensates arbitrary transfers', () => {
    const result = calculateSettlements({
      participants: participants('a', 'b'),
      transfers: [{ id: 't1', sender: 'a', receiver: 'b', amount: '10.00', nonce: '1' }]
    })
    expect(result).toEqual([{ sender: 'b', receiver: 'a', amount: '10.00' }])
  })
})
