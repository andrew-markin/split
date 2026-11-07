import { computed, readonly, ref } from 'vue'

import { useDataset } from '@/composables/useDataset'
import { calculateSettlements } from '@/settlements'
import { getCipher } from '@/utils'

const CIPHER_SALT = import.meta.env.VITE_CIPHER_SALT

const NULL_ID = '0000000000000000000000'

let context

function useContext() {
  const dataset = useDataset()
  const { constrain, clone, find, loaded, locals, modified, select, upsert } = dataset

  // A value peculiar to the split that is safe to reveal, as it says nothing
  // about the secret
  const tintSeed = ref(undefined)

  async function connect(secret) {
    tintSeed.value = await getCipher(secret, CIPHER_SALT, 'TINT_SEED')
    await dataset.connect(secret)
  }

  constrain({
    participations: {
      participant: { scope: 'participants', fix: 'remove' },
      category: { scope: 'categories', fix: 'remove' }
    },
    participants: {
      patron: { scope: 'participants', fix: 'unset', flat: true }
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
    loaded,
    locals,
    modified,
    participantById,
    participants,
    participations,
    settlements,
    tintSeed: readonly(tintSeed),
    title,
    transfers,
    upsert
  }
}

export function useSplit() {
  if (!context) context = useContext()
  return context
}
