<template>
  <split-section
    :title="$t('expense.plural')"
    :fields="fields"
    item-title="description"
    :items="expenses"
    :no-data-label="$t('expense.none')"
    @edit="edit"
  >
    <template #buttons="{ selection }">
      <q-btn flat round :icon="mdiPlus" :aria-label="$t('expense.new')" @click="edit()" />
      <q-btn
        v-if="selection.length > 0"
        flat
        round
        color="negative"
        :icon="mdiTrashCanOutline"
        :aria-label="$t('section.items.remove')"
        @click="remove(selection)"
      />
    </template>
    <template #date="{ value }">
      <date-label :value :placeholder="$t('date.undefined')" />
    </template>
    <template #category="{ value }">
      <category-label
        :id="value"
        :placeholder="$t('category.common')"
        placeholder-class="text-special"
      />
    </template>
    <template #payer="{ value }">
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
import CategoryLabel from './CategoryLabel.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import DateLabel from './DateLabel.vue'
import ExpenseDialog from './ExpenseDialog.vue'
import ParticipantLabel from './ParticipantLabel.vue'
import SplitSection from './SplitSection.vue'

const { t } = useI18n()

const fields = computed(() => [
  {
    name: 'date',
    title: t('date'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'description',
    title: t('expense.description'),
    cellClass: 'w-full text-left text-wrap'
  },
  {
    name: 'category',
    title: t('category'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'payer',
    title: t('expense.payer'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'amount',
    title: t('amount'),
    cellClass: 'w-10ch text-right'
  }
])

const { expenses, upsert } = useSplit()
const { exec } = useDialogs()

async function edit(expense = {}) {
  await exec(ExpenseDialog, { expense })
}

async function remove(selection) {
  if (selection.length === 0) return
  const confirmed = await exec(ConfirmationDialog, {
    message: t('expense.removal.confirmation', selection.length)
  })
  if (!confirmed) return
  await upsert({ expenses: selection.map((id) => ({ id, removed: true })) })
}
</script>
