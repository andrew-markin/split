<template>
  <v-select
    :items="items"
    :placeholder="placeholder"
    :value-comparator="compare"
    :value="value"
    @input="input"
    v-bind="$attrs">
    <template #item="{ item }">
      <span :class="{ 'muted-1': !item.value }">
        {{ item.text }}
      </span>
    </template>
  </v-select>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: {
    value: String,
    default: String,
    placeholder: String
  },
  computed: {
    ...mapGetters(['participants']),
    items () {
      const result = []
      let participants = this.participants
      if (this.default) {
        participants = participants.filter(({ id }) => id !== this.default)
        result.push({
          text: this.placeholder,
          value: null
        })
      }
      result.push(...participants.map((participant) => ({
        text: participant.data?.name,
        value: participant.id
      })))
      return result
    }
  },
  methods: {
    compare (left, right) {
      return left && right && (left === right)
    },
    input (value) {
      this.$emit('input', value || undefined)
    }
  }
}
</script>
