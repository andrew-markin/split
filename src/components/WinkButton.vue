<template>
  <q-btn :icon="winkShown ? winkIcon : icon" @click.capture="handleClick()">
    <slot></slot>
  </q-btn>
</template>

<script setup>
import { mdiCheck } from '@quasar/extras/mdi-v7'
import { ref } from 'vue'

defineProps({
  icon: { type: String, default: undefined },
  winkIcon: { type: String, default: mdiCheck }
})

const winkShown = ref(false)
let winkTimeout = undefined

function handleClick() {
  winkShown.value = true
  clearTimeout(winkTimeout)
  winkTimeout = setTimeout(() => {
    winkTimeout = undefined
    winkShown.value = false
  }, 1000)
}
</script>
