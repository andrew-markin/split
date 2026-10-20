<template>
  <split-section
    :title="$t('settlement.plural')"
    :fields="fields"
    :items="settlements"
    :item-key="null"
    :no-data-label="$t('settlement.none')"
    @edit="edit"
  >
    <template #buttons="{ selection }">
      <wink-button
        v-if="settlements.length > 0"
        flat
        round
        :icon="mdiContentCopy"
        @click="copy(selection)"
      />
    </template>
    <template #sender="{ value }">
      <participant-label :id="value" />
    </template>
    <template #receiver="{ value }">
      <participant-label :id="value" />
    </template>
    <template #preferences="{ item: settlement }">
      <participant-label :id="settlement.receiver">
        <template #default="{ participant }">
          <span v-if="participant.preferences">{{ participant.preferences }}</span>
          <span v-else class="text-special">{{ $t('participant.preferences.none') }}</span>
        </template>
      </participant-label>
    </template>
    <template #amount="{ value }">
      <amount-label :value />
    </template>
  </split-section>
</template>

<script setup>
import { mdiContentCopy } from '@quasar/extras/mdi-v7'
import copyToClipboard from 'copy-to-clipboard'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogs } from '@/composables/useDialogs'
import { useSplit } from '@/composables/useSplit'

import AmountLabel from './AmountLabel.vue'
import ParticipantLabel from './ParticipantLabel.vue'
import SettlementDialog from './SettlementDialog.vue'
import SplitSection from './SplitSection.vue'
import WinkButton from './WinkButton.vue'

const { t } = useI18n()

const fields = computed(() => [
  {
    name: 'sender',
    title: t('sender'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'receiver',
    title: t('receiver'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'preferences',
    title: t('participant.preferences'),
    cellClass: 'w-full text-left text-wrap'
  },
  {
    name: 'amount',
    title: t('amount'),
    cellClass: 'w-10ch text-right'
  }
])

const { settlements, participantById } = useSplit()
const { exec } = useDialogs()

async function edit(settlement = {}) {
  await exec(SettlementDialog, { settlement })
}

async function copy(selection) {
  const scope = selection.length > 0 ? selection : settlements.value
  await copyToClipboard(
    scope
      .map((settlement) => {
        const sender = participantById(settlement.sender).value
        const receiver = participantById(settlement.receiver).value
        let sentence = `${sender.name} --> ${receiver.name}: ${settlement.amount}`
        const preferences = receiver.preferences
        if (preferences && preferences.length > 0) sentence += ` (${preferences})`
        return sentence
      })
      .join('\n')
  )
}
</script>
