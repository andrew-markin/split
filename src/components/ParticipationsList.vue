<template>
  <span v-if="items.length > 0">{{ items.join(', ') }}</span>
  <span v-else class="muted-1">{{ $t('PARTICIPATIONS_NONE') }}</span>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: {
    participant: String,
    category: String
  },
  computed: {
    ...mapGetters(['participations', 'findParticipant', 'findCategory']),
    items () {
      if (!this.participant && !this.category) return []
      const participations = this.participations({
        participant: this.participant,
        category: this.category
      })
      let nameFunction
      if (this.participant) {
        nameFunction = (participation) => {
          return this.findCategory(participation.data.category)?.data?.name
        }
      } else if (this.category) {
        nameFunction = (participation) => {
          return this.findParticipant(participation.data.participant)?.data?.name
        }
      }
      const items = participations.map((participation) => {
        const name = nameFunction(participation)
        const value = participation.data?.value || 4
        return value === 4 ? name : `${name} (${value * 25}%)`
      })
      items.sort((left, right) => left.localeCompare(right))
      return items
    }
  }
}

</script>
