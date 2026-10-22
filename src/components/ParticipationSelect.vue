<template>
  <div v-if="options.length > 0" class="column q-gutter-y-md">
    <div class="text-h6 muted-1">{{ title }}</div>
    <div v-for="option in options" :key="option.id" class="row q-col-gutter-x-sm items-center">
      <q-checkbox
        v-model="option.active"
        class="non-selectable text-no-wrap"
        :class="{
          'col-6': desktop,
          'col-12': mobile,
          inactive: !option.active || option.rate === 0
        }"
      >
        <participation-label :name="option.name" :rate="option.rate" show-rate />
      </q-checkbox>
      <q-slider
        v-model="option.rate"
        dense
        :min="0"
        :max="200"
        :step="5"
        :disable="!option.active"
        class="col q-mr-lg"
        :class="{ 'checkbox-size-margin': mobile }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useScreen } from '@/composables/useScreen'
import { useSplit } from '@/composables/useSplit'
import { getComposedId } from '@/utils'

import ParticipationLabel from './ParticipationLabel.vue'

const { desktop, mobile } = useScreen()

const { participants, categories, participations } = useSplit()

const { participant, category } = defineProps({
  participant: { type: String, default: undefined },
  category: { type: String, default: undefined }
})

const emit = defineEmits(['changes'])

const { t } = useI18n()

const options = ref([])

const participantsSnapshot = toRaw(participants.value)
const categoriesSnapshot = toRaw(categories.value)
const participationsSnapshot = toRaw(participations.value)
const participationsMap = new Map(participationsSnapshot.map((item) => [item.id, item]))

const title = computed(() => {
  if (participant) return t('category.plural')
  if (category) return t('participant.plural')
  return undefined
})

watch(
  () => participant || category,
  async () => {
    if (participant) {
      const participantId = toRaw(participant)
      options.value = await Promise.all(
        categoriesSnapshot.map(async (category) => {
          const id = await getComposedId(participantId, category.id)
          const base = participationsMap.get(id)
          return {
            id,
            base,
            participant: participantId,
            category: category.id,
            name: category.name,
            active: base?.active ?? false,
            rate: base?.rate === undefined ? 100 : base.rate
          }
        })
      )
    } else if (category) {
      const categoryId = toRaw(category)
      options.value = await Promise.all(
        participantsSnapshot.map(async (participant) => {
          const id = await getComposedId(participant.id, categoryId)
          const base = participationsMap.get(id)
          return {
            id,
            base,
            participant: participant.id,
            category: categoryId,
            name: participant.name,
            active: base?.active || false,
            rate: base?.rate === undefined ? 100 : base.rate
          }
        })
      )
    } else {
      options.value = []
    }
  },
  { immediate: true }
)

const changes = computed(() => {
  const result = []
  for (const { id, base, participant, category, active, rate } of options.value) {
    if (base) {
      const change = {}
      if (active !== base.active) change.active = active
      if (rate !== base.rate) change.rate = rate
      if (Object.keys(change).length > 0) result.push({ id, ...change })
    } else if (active || rate !== 100) {
      result.push({ id, participant, category, active, rate })
    }
  }
  return result
})

watch(changes, () => emit('changes', changes.value))
</script>

<style scoped lang="scss">
$checkbox-size: 42px;
.checkbox-size-margin {
  margin-left: $checkbox-size;
}
.inactive {
  opacity: 0.7;
  // The whole option is faded already, so its rate isn't muted twice
  :deep(.muted-1),
  :deep(.muted-2) {
    color: inherit;
  }
}
</style>
