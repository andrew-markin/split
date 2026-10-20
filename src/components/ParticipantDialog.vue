<template>
  <dialog-frame :title="participant?.id ? $t('participant') : $t('participant.new')">
    <q-form id="form" autofocus greedy class="column no-wrap q-gutter-md" @submit="submit()">
      <q-input
        v-model.trim="form.name"
        outlined
        counter
        stack-label
        :label="$t('participant.name')"
        :hint="$t('participant.name.hint')"
        :maxlength="16"
        lazy-rules="ondemand"
        :rules="nameRules"
        no-error-icon
      />
      <participant-select
        v-model="form.patron"
        outlined
        stack-label
        :label="$t('participant.patron')"
        :placeholder="$t('participant.patron.none')"
        :exclude="form.id"
        :filter="patronFilter"
        :disable="hasDependents && !form.patron"
        :hint="hasDependents ? $t('participant.patron.dependents.hint') : undefined"
      />
      <long-text-input
        v-model.trim="form.preferences"
        outlined
        counter
        stack-label
        :label="$t('participant.preferences')"
        :hint="$t('participant.preferences.hint')"
        :placeholder="$t('participant.preferences.none')"
        :maxlength="64"
        lazy-rules="ondemand"
        :rules="preferencesRules"
        no-error-icon
      />
    </q-form>
    <participation-select
      :participant="form.id"
      class="q-mt-sm"
      @changes="(value) => (participationChanges = value)"
    />
    <template #buttons>
      <q-btn outline color="primary" :label="$t('cancel')" @click="$emit('close')" />
      <q-btn
        unelevated
        type="submit"
        form="form"
        color="primary"
        :label="$t('save')"
        :disable="!changesAvailable"
      />
    </template>
  </dialog-frame>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useForm } from '@/composables/useForm'
import { useSchemas } from '@/composables/useSchemas.js'
import { useSplit } from '@/composables/useSplit'
import { useValidator } from '@/composables/useValidator'

import DialogFrame from './DialogFrame.vue'
import LongTextInput from './LongTextInput.vue'
import ParticipantSelect from './ParticipantSelect.vue'
import ParticipationSelect from './ParticipationSelect.vue'

const { participant } = defineProps({
  participant: { type: Object, default: () => {} }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const { form, changes, changed } = useForm({ name: '', preferences: '', ...participant })

const participationChanges = ref([])

const changesAvailable = computed(() => changed.value || participationChanges.value.length > 0)
const combinedChanges = computed(() => {
  const result = {}
  if (changed.value) result.participants = [changes.value]
  if (participationChanges.value.length > 0) result.participations = participationChanges.value
  return result
})

const { participants, upsert } = useSplit()

// Patrons can't be chained: a patron pays for themselves and a participant
// having dependents can't get a patron
const hasDependents = computed(() =>
  participants.value.some(({ patron }) => patron && patron === form.id)
)

function patronFilter({ id, patron }) {
  return !patron || id === participant?.patron
}

const { stringSchema } = useSchemas()

const nameSchema = stringSchema(t('participant.name.required.error'))
const nameRules = [useValidator(nameSchema)]

const preferencesSchema = stringSchema()
const preferencesRules = [useValidator(preferencesSchema)]

async function submit() {
  if (!changesAvailable.value) return
  await upsert(combinedChanges.value)
  emit('close')
}
</script>
