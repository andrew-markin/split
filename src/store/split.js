import { composeId, generateId, timestamp } from '@/utils'

// Internal

const unifyItem = ({ id, data, changed, created }) => ({ id, data, changed, created })

const unifyItems = (items) => {
  return (items || []).map(item => unifyItem(item))
}

const reduceItem = ({ id, data, changed, created }, remote = false) => ({
  id,
  data,
  changed,
  ...(!remote && created) && { created }
})

const reduceItems = (items, remote) => {
  return (items || []).map(item => reduceItem(item, remote))
}

const splitItems = (split, table) => {
  const items = split[table]
  return items && (items.constructor === Array) ? items : undefined
}

const findItem = (split, table, id) => {
  const items = splitItems(split, table)
  return items?.find(item => item.id === id)
}

const upsertItem = (split, table, id, data) => {
  const item = id && findItem(split, table, id)
  if (item) {
    item.data = data
    item.changed = timestamp()
    return true
  }
  const items = splitItems(split, table)
  if (!items) return false
  items.push({
    id: id || generateId(),
    data,
    changed: timestamp(),
    created: true
  })
  return true
}

const removeItem = (split, table, id) => {
  if (!id) return false
  const items = splitItems(split, table)
  if (!items) return false
  const index = items.findIndex(item => item.id === id)
  if (index < 0) return false
  items.splice(index, 1)
  split.graveyard[id] = timestamp()
  return true
}

const mergeItems = (localItems, remoteItems, graveyard) => {
  const gt = (left, right) => (left || 0) > (right || 0)
  const remoteItemsMap = new Map()
  for (const remoteItem of remoteItems || []) {
    if (gt(graveyard.get(remoteItem.id), remoteItem?.changed)) continue
    remoteItemsMap.set(remoteItem.id, remoteItem)
  }
  const result = []
  for (const localItem of localItems || []) {
    const remoteItem = remoteItemsMap.get(localItem.id)
    if (!remoteItem && !localItem.created) continue // Skip this item as deleted remotely
    result.push(unifyItem(gt(remoteItem?.changed, localItem?.changed) ? remoteItem : localItem))
    if (remoteItem) remoteItemsMap.delete(remoteItem.id)
  }
  for (const remoteItem of remoteItemsMap.values()) {
    result.push(unifyItem(remoteItem))
  }
  return result
}

const fixup = (split, bury) => {
  const now = timestamp()
  const categoriesAvailable = new Set(split.categories.map(({ id }) => id))
  const participantsAvailable = new Set(split.participants.map(({ id }) => id))
  // Fix unresolved participant patrons
  for (const participant of split.participants) {
    const patron = participant.data.patron
    if (!patron || participantsAvailable.has(patron)) continue
    participant.data.patron = undefined
    participant.changed = now
  }
  // Fix unresolved participations
  split.participations = split.participations.filter(({ id, data, created }) => {
    const { category, participant } = data
    if (category && categoriesAvailable.has(category) &&
        participant && participantsAvailable.has(participant)) return true
    if (bury && !created) split.graveyard[id] = now
    return false
  })
  // Fix unresolved expense categories
  for (const expense of split.expenses) {
    const category = expense.data.category
    if (!category || categoriesAvailable.has(category)) continue
    expense.data.category = undefined
    expense.changed = now
  }
  // Fix unresolved expense payers
  split.expenses = split.expenses.filter(({ id, data, created }) => {
    const { payer } = data
    if (payer && participantsAvailable.has(payer)) return true
    if (bury && !created) split.graveyard[id] = now
    return false
  })
}

const compute = (split) => {
  split.payments = []
  const commonCategoryCalc = { expense: 0, slots: [] }
  const categoriesCalcMap = new Map([
    [undefined, commonCategoryCalc],
    ...split.categories.map(({ id }) => [id, { expense: 0, slots: [] }])
  ])
  const participantsPlainCalcMap = new Map(split.participants.map(({ id }) => {
    return [id, { expense: 0, consume: 0 }]
  }))
  const participantsCalcMap = new Map(split.participants.map((participant) => {
    return [participant.id, participantsPlainCalcMap.get(participant.data.patron || participant.id)]
  }))
  for (const expense of split.expenses) {
    const { category, payer, amount } = expense.data
    const flatAmount = Math.trunc(Number(amount) * 100)
    const categoryCalc = categoriesCalcMap.get(category)
    categoryCalc.expense += flatAmount
    const participantCalc = participantsCalcMap.get(payer)
    participantCalc.expense += flatAmount
  }
  for (const participation of split.participations) {
    const { participant, category, value } = participation.data
    const categoryCalc = categoriesCalcMap.get(category)
    const participantCalc = participantsCalcMap.get(participant)
    for (let i = 0; i < value; i++) {
      categoryCalc.slots.push({
        id: composeId(category, participant, i),
        calc: participantCalc
      })
    }
  }
  for (const [id, calc] of participantsCalcMap) {
    commonCategoryCalc.slots.push({ id, calc })
  }
  for (const calc of categoriesCalcMap.values()) {
    if (calc.expense === 0) continue
    const slotsCount = calc.slots.length
    if (slotsCount === 0) continue
    const quotient = Math.trunc(calc.expense / slotsCount)
    calc.slots.forEach(({ calc }) => { calc.consume += quotient })
    const remainder = calc.expense % slotsCount
    if (remainder === 0) continue
    calc.slots.sort((left, right) => left.id.localeCompare(right.id))
    for (let i = 0; i < remainder; i++) {
      calc.slots[i].calc.consume += 1
    }
  }
  const paymentsScope = []
  for (const { id } of split.participants) {
    const { expense, consume } = participantsPlainCalcMap.get(id)
    paymentsScope.push({ id, balance: expense - consume })
  }
  const getNextSender = () => {
    return paymentsScope.reduce((match, item) => {
      if (item.balance >= 0) return match
      if (!match || (item.balance > match.balance) ||
          ((item.balance === match.balance) &&
           (item.id > match.id))) return item
      return match
    }, undefined)
  }
  const getNextReceiver = () => {
    return paymentsScope.reduce((match, item) => {
      if (item.balance <= 0) return match
      if (!match || (item.balance > match.balance) ||
          ((item.balance === match.balance) &&
           (item.id > match.id))) return item
      return match
    }, undefined)
  }
  while (true) {
    const sender = getNextSender()
    if (!sender) break
    const receiver = getNextReceiver()
    if (!receiver) break
    const amount = Math.min(-sender.balance, receiver.balance)
    sender.balance += amount
    receiver.balance -= amount
    split.payments.push({
      sender: sender.id,
      receiver: receiver.id,
      amount: Number(amount / 100).toFixed(2)
    })
  }
}

const update = (split, bury = true) => {
  fixup(split, bury)
  compute(split)
}

// General

const create = () => ({
  categories: [],
  participants: [],
  participations: [],
  expenses: [],
  graveyard: {},
  payments: []
})

const extend = (split) => {
  const result = {
    categories: unifyItems(split.categories),
    participants: unifyItems(split.participants),
    participations: unifyItems(split.participations),
    expenses: unifyItems(split.expenses),
    graveyard: split.graveyard || {},
    payments: []
  }
  update(result, false)
  return result
}

const reduce = (split, remote = false) => ({
  categories: reduceItems(split.categories, remote),
  participants: reduceItems(split.participants, remote),
  participations: reduceItems(split.participations, remote),
  expenses: reduceItems(split.expenses, remote),
  ...(!remote && split.graveyard) && { graveyard: split.graveyard }
})

const merge = (localSplit, remoteSplit) => {
  const graveyard = new Map(Object.entries(localSplit.graveyard))
  const split = {
    categories: mergeItems(localSplit.categories, remoteSplit.categories, graveyard),
    participants: mergeItems(localSplit.participants, remoteSplit.participants, graveyard),
    participations: mergeItems(localSplit.participations, remoteSplit.participations, graveyard),
    expenses: mergeItems(localSplit.expenses, remoteSplit.expenses, graveyard),
    graveyard: {},
    payments: []
  }
  update(split, false)
  return split
}

const applyEdits = (split, edits = []) => {
  for (const { table, id, data } of edits) {
    if (!data) removeItem(split, table, id)
    else upsertItem(split, table, id, data)
  }
  update(split)
  return true
}

// Categories

const categories = (split) => {
  return splitItems(split, 'categories')
}

const findCategory = (split, id) => {
  return findItem(split, 'categories', id)
}

// Participants

const participants = (split) => {
  return splitItems(split, 'participants')
}

const findParticipant = (split, id) => {
  return findItem(split, 'participants', id)
}

// Participations

const participations = (split, { participant, category }) => {
  let result = splitItems(split, 'participations')
  if (participant) result = result.filter(({ data }) => data?.participant === participant)
  if (category) result = result.filter(({ data }) => data?.category === category)
  return result
}

const findParticipation = (split, id) => {
  return findItem(split, 'participations', id)
}

// Expenses

const expenses = (split) => {
  return splitItems(split, 'expenses')
}

const findExpense = (split, id) => {
  return findItem(split, 'expenses', id)
}

// Payments

const payments = (split) => {
  return splitItems(split, 'payments')
}

export default {
  create,
  extend,
  reduce,
  merge,
  applyEdits,
  categories,
  findCategory,
  participants,
  findParticipant,
  participations,
  findParticipation,
  expenses,
  findExpense,
  payments
}
