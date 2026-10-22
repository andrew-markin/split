<template>
  <span>{{ name }}</span>
  <span
    v-if="showRate || rate !== 100"
    :class="{ 'text-cold': rate < 100, 'text-hot': rate > 100 }"
  >
    <span :class="rate === 100 ? 'muted-2' : 'muted-1'"> ({{ rate }}%)</span>
  </span>
</template>

<script setup>
defineProps({
  name: { type: String, default: undefined },
  rate: { type: Number, default: undefined },
  showRate: { type: Boolean, default: false }
})
</script>
