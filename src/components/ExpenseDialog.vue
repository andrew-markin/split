<template>
  <dialog-frame :title="expense?.id ? $t('expense') : $t('expense.new')">
    <q-form :id="formId" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <date-input v-model="form.date" outlined clearable stack-label :label="$t('date')" />
      <long-text-input
        v-model.trim="form.description"
        outlined
        counter
        stack-label
        :label="$t('expense.description')"
        :hint="$t('expense.description.hint')"
        :maxlength="128"
        lazy-rules="ondemand"
        :rules="descriptionRules"
        no-error-icon
      />
      <category-select v-model="form.category" outlined stack-label :label="$t('category')" />
      <participant-select
        v-model="form.payer"
        outlined
        stack-label
        :label="$t('expense.payer')"
        lazy-rules="ondemand"
        :rules="payerRules"
        no-error-icon
      >
        <template #append>
          <wink-button round flat :icon="mdiPinOutline" @click.stop.prevent="pinPayer()" />
        </template>
      </participant-select>
      <q-input
        v-model.trim="form.amount"
        outlined
        stack-label
        :label="$t('amount')"
        lazy-rules="ondemand"
        :rules="amountRules"
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
import { mdiPinOutline } from '@quasar/extras/mdi-v7'
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useForm } from '@/composables/useForm'
import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'

import CategorySelect from './CategorySelect.vue'
import DateInput from './DateInput.vue'
import DialogFrame from './DialogFrame.vue'
import LongTextInput from './LongTextInput.vue'
import ParticipantSelect from './ParticipantSelect.vue'
import WinkButton from './WinkButton.vue'

const { expense } = defineProps({
  expense: { type: Object, default: () => {} }
})

const emit = defineEmits(['close'])

// Unique per dialog: a closing dialog may still be in the DOM
const formId = useId()

const { t } = useI18n()
const { amountSchema, stringSchema } = useSchemas()

const { locals, participantById, upsert } = useSplit()

const pinnedPayer = participantById(locals.get('payer'))?.value?.id

const { form, changes, changed } = useForm(
  { description: '', payer: pinnedPayer, amount: '', ...expense },
  {
    transform(form) {
      if (form.amount) form.amount = Number(form.amount).toFixed(2)
    }
  }
)

const descriptionSchema = stringSchema(t('expense.description.required.error'))
const descriptionRules = [useValidator(descriptionSchema)]

const payerRules = [(value) => !!value || t('expense.payer.required.error')]
const amountRules = [useValidator(amountSchema)]

function pinPayer() {
  locals.set('payer', form.payer)
}

async function submit() {
  if (!changed.value) return
  await upsert({ expenses: [changes.value] })
  emit('close')
}
</script>
