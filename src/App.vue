<template>
  <div ref="appRef" class="fullscreen app loading" :class="{ ready }">
    <router-view />
    <dialog-stack />
    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'

import DialogStack from '@/components/DialogStack.vue'
import { useAnnouncer } from '@/composables/useAnnouncer'
import { useSplit } from '@/composables/useSplit'
import { useThemes } from '@/composables/useThemes'

const ready = ref(false)

const { message: announcement } = useAnnouncer()

// The app is shown only after the split has some data to show and the fonts
// for its text are loaded, so the empty tables aren't shown before they're
// filled, the text isn't redrawn with another font, and the layout doesn't
// shift. The wait is limited, on a slow connection the rest comes later
const READY_TIMEOUT = 3000

const appRef = ref(null)
const { loaded } = useSplit()

async function contentLoaded() {
  if (!loaded.value) await new Promise((resolve) => watch(loaded, resolve, { once: true }))
  await nextTick()
  if (document.fonts) {
    await document.fonts.load('1em Roboto', appRef.value.textContent || undefined).catch(() => {})
  }
}

const themes = useThemes()
onMounted(async () => {
  themes.init()
  const timeout = new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT))
  await Promise.race([contentLoaded(), timeout])
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
