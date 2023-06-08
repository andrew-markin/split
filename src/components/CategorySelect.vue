<template>
  <v-select
    :items="items"
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
    value: String
  },
  computed: {
    ...mapGetters(['categories']),
    items () {
      return [{
        text: this.$t('CATEGORY_COMMON'),
        value: null
      }, ...this.categories.map((category) => ({
        text: category.data?.name,
        value: category.id
      }))]
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
