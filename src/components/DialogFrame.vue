<template>
  <q-card :class="{ 'card-desktop': desktop, 'full-width': mobile }">
    <q-card-section class="row no-wrap items-center q-pb-none">
      <div class="text-h5 muted-1">{{ title }}</div>
      <q-space />
      <q-btn flat round :icon="mdiClose" @click="cancel()" />
    </q-card-section>
    <q-card-section>
      <slot></slot>
      <div v-if="$slots.buttons" class="q-mt-lg">
        <div class="q-gutter-sm" :class="desktop ? ['row'] : ['column', 'reverse']">
          <q-space v-if="desktop" />
          <slot name="buttons"></slot>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { mdiClose } from '@quasar/extras/mdi-v7'

import { useDialogs } from '@/composables/useDialogs'
import { useScreen } from '@/composables/useScreen'

defineProps({
  title: { type: String, default: undefined }
})
const { cancel } = useDialogs()
const { desktop, mobile } = useScreen()
</script>

<style>
.card-desktop {
  width: 600px;
  max-width: 80vw;
}
</style>
