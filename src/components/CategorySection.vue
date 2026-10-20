<template>
  <split-section
    :title="$t('category.plural')"
    :fields="fields"
    :items="categories"
    :no-data-label="$t('category.none')"
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
    <template #participants="{ item: category }">
      <participation-list :category="category.id" />
    </template>
  </split-section>
</template>

<script setup>
import { mdiPlus, mdiTrashCanOutline } from '@quasar/extras/mdi-v7'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogs } from '@/composables/useDialogs'
import { useSplit } from '@/composables/useSplit'

import CategoryDialog from './CategoryDialog.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import ParticipationList from './ParticipationList.vue'
import SplitSection from './SplitSection.vue'

const { t } = useI18n()

const fields = computed(() => [
  {
    name: 'name',
    title: t('category.name'),
    cellClass: 'w-15ch text-left'
  },
  {
    name: 'participants',
    title: t('participant.plural'),
    cellClass: 'w-full text-left text-wrap'
  }
])

const { categories, upsert } = useSplit()
const { exec } = useDialogs()

async function edit(category = {}) {
  await exec(CategoryDialog, { category })
}

async function remove(selection) {
  if (selection.length === 0) return
  const confirmed = await exec(ConfirmationDialog, {
    message: t('category.removal.confirmation', selection.length)
  })
  if (!confirmed) return
  await upsert({ categories: selection.map((id) => ({ id, removed: true })) })
}
</script>
