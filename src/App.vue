<template>
  <div class="fullscreen app loading" :class="{ ready }">
    <router-view />
    <dialog-stack />
    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

import DialogStack from '@/components/DialogStack.vue'
import { useAnnouncer } from '@/composables/useAnnouncer'
import { useThemes } from '@/composables/useThemes'

const ready = ref(false)

const { message: announcement } = useAnnouncer()

const themes = useThemes()
onMounted(() => {
  themes.init()
  setTimeout(() => (ready.value = true), 100)
})
</script>

<style scoped lang="scss">
.app {
  background-color: $base-color;
  .body--dark & {
    background-color: $base-dark-color;
  }
}
.loading {
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0, 0, 0.2, 1);
}
.loading.ready {
  opacity: 1;
}
</style>
