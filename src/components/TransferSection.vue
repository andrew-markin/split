<template>
  <split-section
    :title="$t('transfer.plural')"
    :fields="fields"
    :items="transfers"
    :no-data-label="$t('transfer.none')"
    @edit="edit"
  >
    <template #buttons="{ selection }">
      <q-btn flat round :icon="mdiPlus" @click="edit()" />
      <q-btn
        v-if="selection.length > 0"
        flat
        round
        color="negative"
        :icon="mdiTrashCanOutline"
        @click="remove(selection)"
      />
    </template>
    <template #date="{ value }">
      <date-label :value :placeholder="$t('date.undefined')" />
    </template>
    <template #sender="{ value }">
      <participant-label :id="value" />
    </template>
    <template #receiver="{ value }">
      <participant-label :id="value" />
    </template>
    <template #amount="{ value }">
      <amount-label :value />
    </template>
  </split-section>
</template>

<script setup>
import { mdiPlus, mdiTrashCanOutline } from '@quasar/extras/mdi-v7'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogs } from '@/composables/useDialogs'
import { useSplit } from '@/composables/useSplit'

import AmountLabel from './AmountLabel.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import DateLabel from './DateLabel.vue'
import ParticipantLabel from './ParticipantLabel.vue'
import SplitSection from './SplitSection.vue'
import TransferDialog from './TransferDialog.vue'

const { t } = useI18n()

const fields = computed(() => [
  {
    name: 'date',
    title: t('date'),
    cellClass: 'w-15ch text-left'
  },
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
    name: 'comment',
    title: t('transfer.comment'),
    cellClass: 'w-full text-left text-wrap'
  },
  {
    name: 'amount',
    title: t('amount'),
    cellClass: 'w-10ch text-right'
  }
])

const { transfers, upsert } = useSplit()
const { exec } = useDialogs()

async function edit(transfer = {}) {
  await exec(TransferDialog, { transfer })
}

async function remove(selection) {
  if (selection.length === 0) return
  const confirmed = await exec(ConfirmationDialog, {
    message: t('transfer.removal.confirmation', selection.length)
  })
  if (!confirmed) return
  await upsert({ transfers: selection.map((id) => ({ id, removed: true })) })
}
</script>
