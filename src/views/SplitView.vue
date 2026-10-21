<template>
  <div ref="headerRef" class="header column justify-center text-white">
    <block-container class="text-h5 q-px-md row no-wrap items-center">
      <div class="non-selectable cursor-pointer ellipsis" @click="edit()">
        <span class="text-weight-bold q-mr-sm">{{ $t('split') }}:</span>
        <span v-if="title">{{ title }}</span>
        <span v-else class="muted-2">{{ $t('split.untitled') }}</span>
      </div>
      <div class="relative-position full-height q-mx-md">
        <transition leave-active-class="animated zoomOut">
          <q-badge v-if="modified" color="negative" floating rounded />
        </transition>
      </div>
      <q-space />
      <q-btn unelevated :icon="mdiMenu" class="q-pa-sm btn-menu">
        <split-menu />
      </q-btn>
    </block-container>
  </div>
  <scroll-area class="content" :vertical-offset="[headerSize, 0]">
    <background-pattern />
    <div class="column relative-position q-mb-md" :style="{ marginTop: `${headerSize}px` }">
      <participant-section />
      <category-section />
      <expense-section />
      <transfer-section />
      <settlement-section />
      <footer>
        <block-container class="q-px-md q-pt-lg text-caption muted-2">
          {{ $t('split.about') }}
        </block-container>
      </footer>
    </div>
  </scroll-area>
</template>

<script setup>
import { mdiMenu } from '@quasar/extras/mdi-v7'
import { useMeta } from 'quasar'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import BackgroundPattern from '@/components/BackgroundPattern.vue'
import BlockContainer from '@/components/BlockContainer.vue'
import CategorySection from '@/components/CategorySection.vue'
import ExpenseSection from '@/components/ExpenseSection.vue'
import ParticipantSection from '@/components/ParticipantSection.vue'
import ScrollArea from '@/components/ScrollArea.vue'
import SettlementSection from '@/components/SettlementSection.vue'
import SplitDialog from '@/components/SplitDialog.vue'
import SplitMenu from '@/components/SplitMenu.vue'
import TransferSection from '@/components/TransferSection.vue'
import { useDialogs } from '@/composables/useDialogs'
import { useSplit } from '@/composables/useSplit'

const headerRef = ref(null)
const headerSize = ref(0)

onMounted(() => {
  headerSize.value = headerRef.value?.offsetHeight || 0
})

const { secret } = defineProps({
  secret: { type: String, required: true }
})

const { t } = useI18n()

const { connect, title, modified } = useSplit()
const { exec } = useDialogs()

useMeta(() => ({ title: `${t('split')}: ${title.value || t('split.untitled')}` }))

watch(
  () => secret,
  (value) => connect(value),
  { immediate: true }
)

async function edit() {
  await exec(SplitDialog)
}
</script>

<style scoped lang="scss">
@use 'sass:color';
@mixin transparent-overlay($result-color, $bg-color, $alpha: 0.75) {
  $r-res: color.channel($result-color, 'red', $space: rgb);
  $r-bg: color.channel($bg-color, 'red', $space: rgb);
  $g-res: color.channel($result-color, 'green', $space: rgb);
  $g-bg: color.channel($bg-color, 'green', $space: rgb);
  $b-res: color.channel($result-color, 'blue', $space: rgb);
  $b-bg: color.channel($bg-color, 'blue', $space: rgb);
  $source-color: rgb(
    calc(($r-res - $r-bg * (1 - $alpha)) / $alpha),
    calc(($g-res - $g-bg * (1 - $alpha)) / $alpha),
    calc(($b-res - $b-bg * (1 - $alpha)) / $alpha)
  );
  background-color: color.change($source-color, $alpha: $alpha);
}
.header {
  position: absolute;
  left: 0px;
  top: 0px;
  right: 0px;
  height: 60px;
  z-index: $z-side;
  backdrop-filter: blur(8px);
  @include transparent-overlay($primary, $base-color);
  .body--dark & {
    @include transparent-overlay($primary, $base-dark-color);
  }
}
.btn-menu {
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}
.content {
  position: absolute;
  left: 0px;
  top: 0px;
  right: 0px;
  bottom: 0px;
}
</style>
