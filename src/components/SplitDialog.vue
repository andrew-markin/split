<template>
  <dialog-frame :title="$t('split')">
    <q-form :id="formId" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <long-text-input
        v-model.trim="form.title"
        outlined
        counter
        stack-label
        :label="$t('split.title')"
        :hint="$t('split.title.hint')"
        :placeholder="$t('split.untitled')"
        :maxlength="164"
        lazy-rules="ondemand"
        :rules="titleRules"
        no-error-icon
      />
    </q-form>
    <template #buttons>
      <q-btn outline color="primary" label="Cancel" @click="$emit('close')" />
      <q-btn
        unelevated
        type="submit"
        :form="formId"
        color="primary"
        label="Save"
        :disable="!changed"
      />
    </template>
  </dialog-frame>
</template>

<script setup>
import { computed, reactive, useId } from 'vue'

import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'

import DialogFrame from './DialogFrame.vue'
import LongTextInput from './LongTextInput.vue'

const emit = defineEmits(['close'])

// Unique per dialog: a closing dialog may still be in the DOM
const formId = useId()

const { title } = useSplit()

const form = reactive({ title: title.value || '' })
const changed = computed(() => form.title !== (title.value || ''))

const { stringSchema } = useSchemas()

const titleSchema = stringSchema()
const titleRules = [useValidator(titleSchema)]

async function submit() {
  if (!changed.value) return
  title.value = form.title
  emit('close')
}
</script>
