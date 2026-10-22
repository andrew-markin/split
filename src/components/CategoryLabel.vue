<template>
  <template v-if="category">
    <slot :category="category">
      <span>{{ category.name }}</span>
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

const { categoryById } = useSplit()

const category = computed(() => (id ? categoryById(id).value : undefined))
</script>
