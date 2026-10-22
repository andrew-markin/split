<template>
  <q-btn :icon="winkShown ? winkIcon : icon" @click.capture="handleClick()">
    <slot></slot>
  </q-btn>
</template>

<script setup>
import { mdiCheck } from '@quasar/extras/mdi-v7'
import { ref } from 'vue'

import { useAnnouncer } from '@/composables/useAnnouncer'

const { announcement } = defineProps({
  icon: { type: String, default: undefined },
  winkIcon: { type: String, default: mdiCheck },
  announcement: { type: String, default: undefined }
})

const { announce } = useAnnouncer()

const winkShown = ref(false)
let winkTimeout = undefined

function handleClick() {
  if (announcement) announce(announcement)
  winkShown.value = true
  clearTimeout(winkTimeout)
  winkTimeout = setTimeout(() => {
    winkTimeout = undefined
    winkShown.value = false
  }, 1000)
}
</script>
