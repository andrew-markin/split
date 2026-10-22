<template>
  <template v-if="participant">
    <slot :participant="participant">
      <span>{{ participant.name }}</span>
    </slot>
  </template>
  <span v-else-if="placeholder" :class="placeholderClass">{{ placeholder }}</span>
</template>

<script setup>
import { computed } from 'vue'

import { useSplit } from '@/composables/useSplit'

defineOptions({ inheritAttrs: false })

const { id } = defineProps({
  id: { type: String, default: undefined },
  placeholder: { type: String, default: undefined },
  placeholderClass: { type: String, default: 'muted-2' }
})

const { participantById } = useSplit()

const participant = computed(() => (id ? participantById(id).value : undefined))
</script>
