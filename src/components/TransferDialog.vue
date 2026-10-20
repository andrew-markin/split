<template>
  <dialog-frame :title="transfer?.id ? $t('transfer') : $t('transfer.new')">
    <q-form :id="formId" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <date-input v-model="form.date" outlined clearable stack-label :label="$t('date')" />
      <participant-select
        v-model="form.sender"
        outlined
        stack-label
        :label="$t('sender')"
        :rules="senderRules"
        lazy-rules="ondemand"
        no-error-icon
      />
      <participant-select
        v-model="form.receiver"
        outlined
        stack-label
        :label="$t('receiver')"
        :rules="receiverRules"
        lazy-rules="ondemand"
        no-error-icon
      />
      <long-text-input
        v-model.trim="form.comment"
        outlined
        counter
        stack-label
        :label="$t('transfer.comment')"
        :hint="$t('transfer.comment.hint')"
        :maxlength="128"
        lazy-rules="ondemand"
        :rules="commentRules"
        no-error-icon
      />
      <q-input
        v-model.trim="form.amount"
        outlined
        stack-label
        :label="$t('amount')"
        :rules="amountRules"
        lazy-rules="ondemand"
        no-error-icon
      />
    </q-form>
    <template #buttons>
      <q-btn outline color="primary" :label="$t('cancel')" @click="$emit('close')" />
      <q-btn
        unelevated
        type="submit"
        :form="formId"
        color="primary"
        :label="$t('save')"
        :disable="!changed"
      />
    </template>
  </dialog-frame>
</template>

<script setup>
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useForm } from '@/composables/useForm'
import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'
import { getNonce } from '@/utils.js'

import DateInput from './DateInput.vue'
import DialogFrame from './DialogFrame.vue'
import LongTextInput from './LongTextInput.vue'
import ParticipantSelect from './ParticipantSelect.vue'

const { transfer } = defineProps({
  transfer: { type: Object, default: () => {} }
})

const emit = defineEmits(['close'])

// Unique per dialog: a closing dialog may still be in the DOM
const formId = useId()

const { t } = useI18n()

const { form, changes, changed } = useForm(
  { comment: '', amount: '', ...transfer },
  {
    transform(form) {
      if (form.amount) form.amount = Number(form.amount).toFixed(2)
    }
  }
)

const { amountSchema, stringSchema } = useSchemas()

const senderRules = [
  (value) => !!value || t('transfer.sender.required.error'),
  (value) => value !== form.receiver || t('transfer.loop.error')
]

const receiverRules = [
  (value) => !!value || t('transfer.receiver.required.error'),
  (value) => value !== form.sender || t('transfer.loop.error')
]

const commentSchema = stringSchema()
const commentRules = [useValidator(commentSchema)]

const amountRules = [useValidator(amountSchema)]

const { upsert } = useSplit()

async function submit() {
  if (!changed.value) return
  if (!form.nonce) form.nonce = getNonce()
  await upsert({ transfers: [changes.value] })
  emit('close')
}
</script>
