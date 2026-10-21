<template>
  <dialog-frame :title="$t('privacy.title')">
    <template v-for="(section, index) in sections" :key="section">
      <div class="text-subtitle1 text-weight-medium" :class="{ 'q-mt-md': index > 0 }">
        {{ $t(`privacy.${section}.title`) }}
      </div>
      <i18n-t :keypath="`privacy.${section}.text`" tag="div" scope="global">
        <template #email>
          <a class="email-link" :href="`mailto:${email}`">{{ email }}</a>
        </template>
      </i18n-t>
    </template>
    <div class="text-caption text-right muted-2 q-mt-lg">{{ $t('privacy.revision') }}</div>
  </dialog-frame>
</template>

<script setup>
import { email } from '@/links'

import DialogFrame from './DialogFrame.vue'

const sections = ['tracking', 'browser', 'server', 'logs', 'operator']
</script>

<style scoped>
.email-link {
  color: inherit;
}
</style>
