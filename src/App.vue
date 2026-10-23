<template>
  <div ref="appRef" class="fullscreen app loading" :class="{ ready }">
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

// The app is shown only after the fonts for its text are loaded, so the text
// isn't redrawn with another font and the layout doesn't shift. The wait is
// limited, on a slow connection the fallback font is shown and swapped later
const FONTS_TIMEOUT = 3000

function fontsLoaded(element) {
  if (!document.fonts) return Promise.resolve()
  const timeout = new Promise((resolve) => setTimeout(resolve, FONTS_TIMEOUT))
  const loaded = document.fonts.load('1em Roboto', element.textContent || undefined).catch(() => {})
  return Promise.race([loaded, timeout])
}

const appRef = ref(null)

const themes = useThemes()
onMounted(async () => {
  themes.init()
  await fontsLoaded(appRef.value)
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
