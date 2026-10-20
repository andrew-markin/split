<template>
  <split-section
    :title="$t('participant.plural')"
    :fields="fields"
    :items="participants"
    :no-data-label="$t('participant.none')"
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
    <template #patron="{ value }">
      <participant-label
        :id="value"
        :placeholder="$t('participant.patron.none')"
        placeholder-class="text-special"
      />
    </template>
    <template #categories="{ item: participant }">
      <participation-list :participant="participant.id" />
    </template>
  </split-section>
</template>

<script setup>
import { mdiPlus, mdiTrashCanOutline } from '@quasar/extras/mdi-v7'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogs } from '@/composables/useDialogs'
import { useSplit } from '@/composables/useSplit'

import ConfirmationDialog from './ConfirmationDialog.vue'
import ParticipantDialog from './ParticipantDialog.vue'
import ParticipantLabel from './ParticipantLabel.vue'
import ParticipationList from './ParticipationList.vue'
import SplitSection from './SplitSection.vue'

const { t } = useI18n()

const fields = computed(() => [
  {
    name: 'name',
    title: t('participant.name'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'patron',
    title: t('participant.patron'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'categories',
    title: t('category.plural'),
    cellClass: 'w-full text-left text-wrap'
  }
])

const { participants, upsert } = useSplit()
const { exec } = useDialogs()

async function edit(participant = {}) {
  await exec(ParticipantDialog, { participant })
}

async function remove(selection) {
  if (selection.length === 0) return
  const confirmed = await exec(ConfirmationDialog, {
    message: t('participant.removal.confirmation', selection.length)
  })
  if (!confirmed) return
  await upsert({ participants: selection.map((id) => ({ id, removed: true })) })
}
</script>
