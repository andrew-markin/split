import { computed, shallowRef, watchEffect } from 'vue'

import { useDataset } from '@/composables/useDataset'
import { sortByFields } from '@/utils'

const NULL_ID = '0000000000000000000000'

// Round to avoid floating point errors (e.g. 1.15 * 100 = 114.99999999999999)
const toCents = (amount) => Math.round(Number(amount) * 100)

let context

function useContext() {
  const { constrain, connect, clone, find, locals, modified, select, upsert } = useDataset()

  constrain({
    participations: {
      participant: { scope: 'participants', fix: 'remove' },
      category: { scope: 'categories', fix: 'remove' }
    },
    participants: {
      patron: { scope: 'participants', fix: 'unset' }
    },
    expenses: {
      payer: { scope: 'participants', fix: 'remove' },
      category: { scope: 'categories', fix: 'unset' }
    },
    transfers: {
      sender: { scope: 'participants', fix: 'remove' },
      receiver: { scope: 'participants', fix: 'remove' }
    }
  })

  const config = find('config', NULL_ID)

  const title = computed({
    get: () => config?.value?.title,
    set: (value) => upsert({ config: [{ id: NULL_ID, title: value }] })
  })

  const participants = select('participants', ['name', 'id'])
  const categories = select('categories', ['name', 'id'])
  const participations = select('participations')
  const expenses = select('expenses', ['date', 'id'])
  const transfers = select('transfers', ['date', 'sender', 'receiver', 'nonce', 'id'])

  const activeParticipations = computed(() => {
    return participations.value.filter(({ active, rate }) => active && rate > 0)
  })

  const participantsMap = computed(() => {
    return new Map(participants.value.map((item) => [item.id, item]))
  })

  const categoriesMap = computed(() => {
    return new Map(categories.value.map((item) => [item.id, item]))
  })

  function participantById(id) {
    return computed(() => participantsMap.value.get(id))
  }

  function categoryById(id) {
    return computed(() => categoriesMap.value.get(id))
  }

  const settlements = shallowRef([])

  watchEffect(() => {
    // Map participants to their temporary calculation objects
    const participantsCalcMap = new Map(
      participants.value.map(({ id }) => [id, { id, balanceCents: 0 }])
    )
    // Link participants to the actual payer (e.g., redirecting
    // children/dependents to a patron/parent)
    const payersCalcMap = new Map(
      participants.value.map(({ id, patron }) => [id, participantsCalcMap.get(patron ?? id)])
    )
    // Compose effective participations from common and active custom ones
    const effectiveParticipations = [
      ...participants.value.map(({ id }) => ({ participant: id, rate: 100 })),
      ...participations.value.filter(({ active, rate }) => active && rate > 0)
    ]
    // Map categories to their temporary calculation objects
    const categoriesCalcMap = new Map(
      // Undefined represents the common expenses category
      [undefined, ...categories.value.map(({ id }) => id)].map((id) => {
        return [id, { expenseCents: 0, scopeMap: new Map() }]
      })
    )
    // Populate category scopes by aggregating rates per active payer
    for (const { participant, category, rate } of effectiveParticipations) {
      const categoryCalc = categoriesCalcMap.get(category)
      if (!categoryCalc) continue
      const payerCalc = payersCalcMap.get(participant)
      if (!payerCalc) continue
      const categoryScopeMap = categoryCalc.scopeMap
      categoryScopeMap.set(payerCalc, (categoryScopeMap.get(payerCalc) ?? 0) + rate)
    }
    // Populate category and payer calcs with expense amounts
    for (const { category, payer, amount } of expenses.value) {
      const categoryCalc = categoriesCalcMap.get(category)
      if (!categoryCalc?.scopeMap.size) continue
      const payerCalc = payersCalcMap.get(payer)
      if (!payerCalc) continue
      const amountCents = toCents(amount)
      categoryCalc.expenseCents += amountCents
      payerCalc.balanceCents -= amountCents
    }
    // Distribute categorised expenses proportionally among participants
    // using the Largest Remainder Method
    for (const { expenseCents, scopeMap } of categoriesCalcMap.values()) {
      // Skip categories that have no expenses or participants
      if (!expenseCents || !scopeMap.size) continue
      // Convert scope map to array for sorting and processing
      const scope = Array.from(scopeMap, ([payerCalc, rate]) => ({ payerCalc, rate }))
      // Calculate total rate per category scope
      const rateTotal = scope.reduce((sum, slot) => sum + (slot.rate ?? 100), 0)
      // Track total cents allocated during the initial floor distribution
      let allocatedCents = 0
      // Distribute the base share (integer part) and calculate remainders
      scope.forEach((slot) => {
        const exactShareCents = (expenseCents * (slot.rate ?? 100)) / rateTotal
        // Round down to prevent over-allocation
        const baseShareCents = Math.floor(exactShareCents)
        slot.payerCalc.balanceCents += baseShareCents
        // Fractional part used for priority sorting
        slot.remainderCents = exactShareCents - baseShareCents
        allocatedCents += baseShareCents
      })
      // Calculate unallocated cents due to floor rounding
      const leftoverCents = expenseCents - allocatedCents
      // Sort participants using the Largest Remainder Method (Hamilton method)
      // High remainder gets priority; deterministic tie-breaking via ID to prevent
      // flaky results
      scope.sort((left, right) => {
        const diff = right.remainderCents - left.remainderCents
        // Use a small epsilon threshold for safe floating-point comparison
        if (Math.abs(diff) > 1e-9) return diff // Higher remainder comes first
        // Deterministic tie-breaker when fractional parts are equal
        return left.payerCalc.id.localeCompare(right.payerCalc.id)
      })
      // Distribute leftover cents one by one to the highest-priority participants
      for (let i = 0; i < leftoverCents; i++) {
        scope[i].payerCalc.balanceCents += 1
      }
    }
    // Prepare existing transfer sequence
    const transferSequence = transfers.value.map(({ amount, ...transfer }) => ({
      ...transfer,
      amountCents: toCents(amount)
    }))
    transferSequence.sort((left, right) => left.nonce.localeCompare(right.nonce))
    // Initially treat all transfers as non-arbitrary (i.e. caused by settlement)
    let arbitraryTransfersCount = 0
    // Iteratively separate arbitrary transfers from settlement-driven ones
    while (true) {
      // Make a copy of the participants calc map for a calculation attempt
      const participantsCalcMapCopy = structuredClone(participantsCalcMap)
      // (Re-)Link participants to the actual payer (e.g., redirecting
      // children/dependents to a patron/parent)
      const payersCalcMapCopy = new Map(
        participants.value.map(({ id, patron }) => [id, participantsCalcMapCopy.get(patron ?? id)])
      )
      // Apply arbitrary transfers to sender and receiver participant calcs
      for (let i = 0; i < arbitraryTransfersCount; i++) {
        const { sender, receiver, amountCents } = transferSequence[i]
        const senderCalc = payersCalcMapCopy.get(sender)
        const receiverCalc = payersCalcMapCopy.get(receiver)
        senderCalc.balanceCents -= amountCents
        receiverCalc.balanceCents += amountCents
      }
      // Helper function to find the next sender (surplus) or receiver (deficit)
      // for debt minimization
      function findNextParticipantCalc(filter) {
        let result
        for (const calc of participantsCalcMapCopy.values()) {
          if (!filter(calc.balanceCents)) continue
          if (
            !result ||
            calc.balanceCents < result.balanceCents ||
            (calc.balanceCents === result.balanceCents && calc.id > result.id)
          ) {
            result = calc
          }
        }
        return result
      }
      let newSettlements = []
      // Greedy debt settlement loop to minimize the total number of transactions
      while (true) {
        const senderCalc = findNextParticipantCalc((balanceCents) => balanceCents > 0)
        if (!senderCalc) break
        const receiverCalc = findNextParticipantCalc((balanceCents) => balanceCents < 0)
        if (!receiverCalc) break
        // Calculate transaction size and update internal balances
        const amountCents = Math.min(senderCalc.balanceCents, -receiverCalc.balanceCents)
        senderCalc.balanceCents -= amountCents
        receiverCalc.balanceCents += amountCents
        newSettlements.push({
          sender: senderCalc.id,
          receiver: receiverCalc.id,
          amountCents
        })
      }
      // If known non-arbitrary transfers exceed calculated settlements,
      // adjust the arbitrary transfers count to cover the deficit and retry.
      if (transferSequence.length - arbitraryTransfersCount > newSettlements.length) {
        arbitraryTransfersCount = Math.max(
          arbitraryTransfersCount,
          transferSequence.length - newSettlements.length
        )
        continue
      }
      let allTransfersCovered = true
      // Match each known non-arbitrary transfer with a calculated settlement.
      // If a match is missing, increase arbitrary transfers count and prepare to retry.
      for (let i = arbitraryTransfersCount; i < transferSequence.length; i++) {
        const transfer = transferSequence[i]
        const settlementIndex = newSettlements.findIndex(
          (settlement) =>
            settlement.sender === transfer.sender &&
            settlement.receiver === transfer.receiver &&
            settlement.amountCents === transfer.amountCents
        )
        if (settlementIndex < 0) {
          arbitraryTransfersCount = i + 1
          allTransfersCovered = false
          break
        }
        // Remove settlement that matched a transfer
        newSettlements.splice(settlementIndex, 1)
      }
      // If failed to match all transfers and settlements...
      if (!allTransfersCovered) continue // ...retry calculation.
      // Sort new settlements by sender and receiver
      sortByFields(newSettlements, ['sender', 'receiver'])
      settlements.value = newSettlements.map(({ sender, receiver, amountCents }) => ({
        sender,
        receiver,
        amount: Number(amountCents / 100).toFixed(2)
      }))
      break
    }
  })

  return {
    activeParticipations,
    categories,
    categoryById,
    clone,
    connect,
    expenses,
    locals,
    modified,
    participantById,
    participants,
    participations,
    settlements,
    title,
    transfers,
    upsert
  }
}

export function useSplit() {
  if (!context) context = useContext()
  return context
}
