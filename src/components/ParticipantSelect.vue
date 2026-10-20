<template>
  <q-select v-model="model" :options="options" emit-value map-options>
    <template v-if="!model && placeholder" #selected>
      <div class="muted-2">{{ placeholder }}</div>
    </template>
    <template #option="{ itemProps, opt }">
      <q-item v-bind="itemProps">
        <q-item-section>
          <q-item-label :class="{ 'muted-2': !opt.value }">
            {{ opt.label }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template v-for="(_, slotName) in notUsedSlots" :key="slotName" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps || {}"></slot>
    </template>
  </q-select>
</template>

<script setup>
import { computed, useSlots } from 'vue'

import { useSplit } from '@/composables/useSplit'

const model = defineModel({ type: String, default: undefined })

const { exclude, filter, placeholder } = defineProps({
  exclude: { type: String, default: undefined },
  filter: { type: Function, default: undefined },
  placeholder: { type: String, default: undefined }
})

const { participants } = useSplit()

const options = computed(() => {
  const result = participants.value
    .filter((participant) => !filter || filter(participant))
    .map(({ name, id }) => ({ label: name, value: id }))
  if (exclude) {
    const index = result.findIndex(({ value }) => value === exclude)
    if (index !== -1) result.splice(index, 1)
  }
  if (placeholder) {
    result.unshift({
      label: placeholder,
      value: undefined
    })
  }
  return result
})

const slots = useSlots()

const notUsedSlots = computed(() => {
  // eslint-disable-next-line no-unused-vars
  const { selected, option, ...rest } = slots
  return rest
})
</script>
