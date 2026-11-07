import { describe, expect, it } from 'vitest'

import { arrangeParticipants, getGroupTints } from '@/participantGroups'

function names(participants) {
  return participants.map(({ name }) => name)
}

describe('arrangeParticipants', () => {
  it('keeps the alphabetical order when there are no groups', () => {
    const participants = [
      { id: '2', name: 'Вера' },
      { id: '1', name: 'Анна' },
      { id: '3', name: 'Борис' }
    ]
    expect(names(arrangeParticipants(participants))).toEqual(['Анна', 'Борис', 'Вера'])
  })

  it('puts a group in place of its patron with the patron going first', () => {
    const participants = [
      { id: '1', name: 'Анна' },
      { id: '2', name: 'Алиса', patron: '3' },
      { id: '3', name: 'Борис' },
      { id: '4', name: 'Вера' },
      { id: '5', name: 'Яна', patron: '3' }
    ]
    expect(names(arrangeParticipants(participants))).toEqual([
      'Анна',
      'Борис',
      'Алиса',
      'Яна',
      'Вера'
    ])
  })

  it('does not mix the groups of patrons with the same name', () => {
    const participants = [
      { id: 'a', name: 'Иван' },
      { id: 'b', name: 'Иван' },
      { id: 'c', name: 'Аня', patron: 'b' },
      { id: 'd', name: 'Боря', patron: 'a' }
    ]
    expect(arrangeParticipants(participants).map(({ id }) => id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('orders namesakes within a group by id', () => {
    const participants = [
      { id: 'p', name: 'Борис' },
      { id: 'y', name: 'Аня', patron: 'p' },
      { id: 'x', name: 'Аня', patron: 'p' }
    ]
    expect(arrangeParticipants(participants).map(({ id }) => id)).toEqual(['p', 'x', 'y'])
  })

  it('treats an unknown patron as absent', () => {
    const participants = [
      { id: '1', name: 'Борис', patron: 'missing' },
      { id: '2', name: 'Анна' }
    ]
    expect(names(arrangeParticipants(participants))).toEqual(['Анна', 'Борис'])
  })

  it('does not change the given array', () => {
    const participants = [
      { id: '2', name: 'Борис' },
      { id: '1', name: 'Анна' }
    ]
    arrangeParticipants(participants)
    expect(names(participants)).toEqual(['Борис', 'Анна'])
  })
})

describe('getGroupTints', () => {
  const SEED = '0123456789abcdef'

  function family(id) {
    return [
      { id, name: id },
      { id: `${id}-child`, name: `${id}-child`, patron: id }
    ]
  }

  it('tints the whole group with one tint and leaves out the others', () => {
    const participants = [
      { id: 'single', name: 'single' },
      { id: 'p', name: 'p' },
      { id: 'x', name: 'x', patron: 'p' },
      { id: 'y', name: 'y', patron: 'p' }
    ]
    const tints = getGroupTints(participants, SEED)
    expect(tints.has('single')).toBe(false)
    expect(tints.get('p')).toBeTypeOf('number')
    expect(tints.get('x')).toBe(tints.get('p'))
    expect(tints.get('y')).toBe(tints.get('p'))
  })

  it('gives different tints to the groups until the tints run out', () => {
    const participants = [...family('a'), ...family('b'), ...family('c'), ...family('d')]
    const tints = getGroupTints(participants, SEED, 3)
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => tints.get(id))
    expect(new Set([a, b, c]).size).toBe(3)
    expect(d).toBe(a)
  })

  it('depends on the seed only', () => {
    const participants = family('a')
    expect(getGroupTints(participants, SEED).get('a')).toBe(
      getGroupTints(participants, SEED).get('a')
    )
    const firsts = new Set(
      Array.from({ length: 64 }, (_, index) => {
        const seed = index.toString(16).padStart(2, '0').repeat(8)
        return getGroupTints(participants, seed).get('a')
      })
    )
    expect(firsts.size).toBeGreaterThan(1)
  })

  it('works without a seed', () => {
    const tints = getGroupTints(family('a'), undefined)
    expect(tints.get('a')).toBeTypeOf('number')
  })
})
