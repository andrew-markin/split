<template>
  <dialog-frame :title="$t('settlement')">
    <q-form :id="formId" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <participant-select
        :model-value="form.sender"
        outlined
        stack-label
        :label="$t('sender')"
        readonly
      />
      <participant-select
        :model-value="form.receiver"
        outlined
        stack-label
        :label="$t('receiver')"
        readonly
      />
      <q-input
        :model-value="receiver.preferences"
        outlined
        stack-label
        :label="$t('participant.preferences')"
        :placeholder="$t('participant.preferences.none')"
        readonly
      />
      <q-input :model-value="form.amount" outlined stack-label :label="$t('amount')" readonly />
      <q-checkbox v-model="completed" :label="$t('settlement.completed.checkbox')" autofocus />
      <date-input
        v-model="form.date"
        outlined
        clearable
        stack-label
        :label="$t('date')"
        :disable="!completed"
      />
      <long-text-input
        v-model.trim="form.comment"
        outlined
        counter
        stack-label
        :label="$t('transfer.comment')"
        :hint="$t('settlement.transfer.comment.hint')"
        :maxlength="128"
        lazy-rules="ondemand"
        :rules="commentRules"
        no-error-icon
        :disable="!completed"
      />
    </q-form>
    <template #buttons>
      <q-btn outline color="primary" :label="$t('cancel')" @click="$emit('close')" />
      <q-btn
        unelevated
        type="submit"
        :form="formId"
        color="primary"
        :label="$t('confirm')"
        :disable="!completed"
      />
    </template>
  </dialog-frame>
</template>

<script setup>
import { computed, ref, useId } from 'vue'

import { useForm } from '@/composables/useForm'
import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'
import { getNonce } from '@/utils.js'

import DateInput from './DateInput.vue'
import DialogFrame from './DialogFrame.vue'
import LongTextInput from './LongTextInput.vue'
import ParticipantSelect from './ParticipantSelect.vue'

const { settlement } = defineProps({
  settlement: { type: Object, default: () => {} }
})

const emit = defineEmits(['close'])

// Unique per dialog: a closing dialog may still be in the DOM
const formId = useId()

const { form, changes, changed } = useForm(
  {},
  {
    init(form) {
      const { sender, receiver, amount } = settlement || {}
      Object.assign(form, { sender, receiver, comment: '', amount, nonce: getNonce() })
    },
    transform(form) {
      if (form.amount !== undefined) form.amount = Number(form.amount).toFixed(2)
    }
  }
)

const { stringSchema } = useSchemas()
const commentSchema = stringSchema()
const commentRules = [useValidator(commentSchema)]

const { upsert, participantById } = useSplit()

const receiver = computed(() => settlement && participantById(settlement.receiver)?.value)
const completed = ref(false)

async function submit() {
  if (!changed.value) return
  await upsert({ transfers: [changes.value] })
  emit('close')
}
</script>
