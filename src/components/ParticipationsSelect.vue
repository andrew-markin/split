<template>
  <v-container
    class="pa-0"
    v-if="items.length > 0">
    <v-row dense>
      <v-col class="text-h6">
        {{ title }}
      </v-col>
    </v-row>
    <v-row
      dense class="my-3"
      v-for="item in items" :key="item.id">
      <v-col cols="6">
        <v-checkbox
          class="ma-0" hide-details
          :label="item.text"
          v-model="item.checked">
        </v-checkbox>
      </v-col>
      <v-col cols="5">
        <v-slider
          min="1" max="7" hide-details
          :class="{ 'muted-2': !item.checked }"
          v-model="item.current.value"
          :disabled="!item.checked">
        </v-slider>
      </v-col>
      <v-col cols="1">
        <div
          class="pt-1"
          :class="{ 'muted-2': !item.checked }">
          {{ item.current.value | quartersToPercentage }}
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'

import { composeId } from '@/utils'

export default {
  props: {
    participant: String,
    category: String
  },
  data: () => ({
    items: []
  }),
  computed: {
    ...mapGetters(['categories', 'participants', 'findParticipation']),
    title () {
      if (this.participant) return this.$t('CATEGORIES')
      if (this.category) return this.$t('PARTICIPANTS')
      return undefined
    },
    edits () {
      const edits = []
      const editBase = { table: 'participations' }
      for (const item of this.items) {
        if (item.checked) {
          if (item.current.value !== item.original?.value) {
            edits.push({
              ...editBase,
              id: item.id,
              data: {
                participant: item.participant,
                category: item.category,
                value: item.current.value
              }
            })
          }
        } else if (item.original) {
          edits.push({
            ...editBase,
            id: item.id
            // No data means removal
          })
        }
      }
      return edits
    }
  },
  watch: {
    participant () {
      this.init()
    },
    category () {
      this.init()
    },
    edits (value) {
      this.$emit('input', value)
    }
  },
  filters: {
    quartersToPercentage (value) {
      return `${value * 25}%`
    }
  },
  methods: {
    init () {
      if (this.participant) {
        this.items = this.categories.map((category) => {
          const id = composeId(this.participant, category.id)
          const participation = this.findParticipation(id)
          const original = participation && { value: participation.data?.value }
          return {
            id,
            participant: this.participant,
            category: category.id,
            text: category.data?.name,
            original,
            current: original ? { ...original } : { value: 4 },
            checked: !!original
          }
        })
      } else if (this.category) {
        this.items = this.participants.map((participant) => {
          const id = composeId(this.category, participant.id)
          const participation = this.findParticipation(id)
          const original = participation && { value: participation.data?.value }
          return {
            id,
            participant: participant.id,
            category: this.category,
            text: participant.data?.name,
            original,
            current: original ? { ...original } : { value: 4 },
            checked: !!original
          }
        })
      } else {
        this.items = []
      }
    }
  },
  mounted () {
    this.init()
  }
}
</script>
