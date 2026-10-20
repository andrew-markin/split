<template>
  <dialog-frame :title="category?.id ? $t('category') : $t('category.new')">
    <q-form :id="formId" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <q-input
        v-model.trim="form.name"
        outlined
        counter
        stack-label
        :label="$t('category.name')"
        :hint="$t('category.name.hint')"
        :maxlength="16"
        lazy-rules="ondemand"
        :rules="nameRules"
        no-error-icon
      />
    </q-form>
    <participation-select
      :category="form.id"
      class="q-mt-sm"
      @changes="(value) => (participationChanges = value)"
    />
    <template #buttons>
      <q-btn outline color="primary" :label="$t('cancel')" @click="$emit('close')" />
      <q-btn
        unelevated
        type="submit"
        :form="formId"
        color="primary"
        :label="$t('save')"
        :disable="!changesAvailable"
      />
    </template>
  </dialog-frame>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useForm } from '@/composables/useForm'
import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'

import DialogFrame from './DialogFrame.vue'
import ParticipationSelect from './ParticipationSelect.vue'

const { category } = defineProps({
  category: { type: Object, default: () => {} }
})

const emit = defineEmits(['close'])

// Unique per dialog: a closing dialog may still be in the DOM
const formId = useId()

const { t } = useI18n()

const { form, changes, changed } = useForm({ name: '', ...category })

const participationChanges = ref([])

const changesAvailable = computed(() => changed.value || participationChanges.value.length > 0)
const combinedChanges = computed(() => {
  const result = {}
  if (changed.value) result.categories = [changes.value]
  if (participationChanges.value.length > 0) result.participations = participationChanges.value
  return result
})

const { stringSchema } = useSchemas()

const nameSchema = stringSchema(t('category.name.required.error'))
const nameRules = [useValidator(nameSchema)]

const { upsert } = useSplit()

async function submit() {
  if (!changesAvailable.value) return
  await upsert(combinedChanges.value)
  emit('close')
}
</script>
