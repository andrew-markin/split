import { computed } from 'vue'

import { useDataset } from '@/composables/useDataset'
import { calculateSettlements } from '@/settlements'

const NULL_ID = '0000000000000000000000'

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

  const settlements = computed(() =>
    calculateSettlements({
      participants: participants.value,
      participations: participations.value,
      categories: categories.value,
      expenses: expenses.value,
      transfers: transfers.value
    })
  )

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
