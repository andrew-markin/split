<template>
  <section>
    <block-container class="row items-center muted-1 q-px-md q-pt-sm">
      <span class="text-h6 q-mr-xs q-my-sm">{{ title }}</span>
      <slot name="buttons" :selection></slot>
      <q-space />
      <q-checkbox
        v-if="mobile"
        v-model="selectAll"
        size="sm"
        :disable="items.length === 0"
        :aria-label="$t('section.items.select')"
        class="mx-negative-md q-py-xs q-px-sm"
      />
    </block-container>
    <block-container v-if="desktop" class="q-px-md">
      <q-markup-table separator="cell" flat bordered class="muted-1">
        <thead>
          <tr>
            <th>
              <q-checkbox
                v-model="selectAll"
                size="xs"
                :disable="items.length === 0"
                :aria-label="$t('section.items.select')"
              />
            </th>
            <th v-for="field in fields" :key="field.name" :class="field.cellClass">
              {{ field.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="itemKey ? item[itemKey] : index"
            class="non-selectable cursor-pointer focus-outline"
            tabindex="0"
            @click="$emit('edit', item)"
            @keydown.enter.self="$emit('edit', item)"
            @keydown.space.self.prevent="$emit('edit', item)"
          >
            <td>
              <q-checkbox
                v-model="selection"
                :val="itemKey ? item[itemKey] : item"
                size="xs"
                :aria-label="selectLabel(item, index)"
              />
            </td>
            <td v-for="field in fields" :key="field.name" :class="field.cellClass">
              <slot :name="field.name" :item :value="item[field.name]">
                {{ item[field.name] }}
              </slot>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td :colspan="fields.length + 1" class="muted-2 text-center q-td--no-hover">
              {{ noDataLabel ?? $t('section.items.none') }}
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </block-container>
    <block-container v-else>
      <div class="column no-wrap q-gutter-sm muted-1">
        <q-card
          v-for="(item, index) in items"
          :key="itemKey ? item[itemKey] : index"
          flat
          bordered
          square
          class="relative-position borders-x-none focus-outline"
          tabindex="0"
          @click="$emit('edit', item)"
          @keydown.enter.self="$emit('edit', item)"
          @keydown.space.self.prevent="$emit('edit', item)"
        >
          <q-card-section class="column no-wrap q-gutter-xs">
            <div v-for="field in fields" :key="field.name">
              <span class="text-weight-medium q-mr-xs">{{ field.title }}:</span>
              <slot :name="field.name" :item :value="item[field.name]">
                {{ item[field.name] }}
              </slot>
            </div>
          </q-card-section>
          <q-checkbox
            v-model="selection"
            :val="itemKey ? item[itemKey] : item"
            size="sm"
            class="absolute-top-right q-py-xs q-px-sm"
            :aria-label="selectLabel(item, index)"
          />
        </q-card>
        <q-card
          v-if="items.length === 0"
          flat
          bordered
          square
          class="relative-position borders-x-none"
        >
          <q-card-section class="muted-2 text-center no-wrap">
            {{ noDataLabel ?? $t('section.items.none') }}
          </q-card-section>
        </q-card>
      </div>
    </block-container>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import BlockContainer from '@/components/BlockContainer.vue'
import { useScreen } from '@/composables/useScreen'

const { title, items, itemKey, itemTitle } = defineProps({
  title: { type: String, default: undefined },
  fields: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  itemKey: { type: String, default: 'id' },
  itemTitle: { type: String, default: undefined },
  noDataLabel: { type: String, default: undefined }
})

defineEmits(['edit'])

const { t } = useI18n()
const { mobile, desktop } = useScreen()

const selection = ref([])

const selectAll = computed({
  get() {
    if (items.length === 0 || selection.value.length === 0) return false
    if (items.length === selection.value.length) return true
    return null
  },
  set(value) {
    if (itemKey) selection.value = value ? items.map((item) => item[itemKey]) : []
    else selection.value = value ? [...items] : []
  }
})

function selectLabel(item, index) {
  const value = itemTitle ? item[itemTitle] : undefined
  return value
    ? t('section.item.select', { title: value })
    : t('section.item.select.numbered', { number: index + 1 })
}

watch(
  () => items,
  () => {
    if (itemKey) {
      const allowedKeys = items.map((item) => item[itemKey])
      selection.value = selection.value.filter((key) => allowedKeys.includes(key))
    } else {
      selection.value = []
    }
  }
)
</script>

<style scoped lang="scss">
$negative-space-md-x: map-get($space-md, x) * -1;
$negative-space-sm-y: map-get($space-sm, y) * -1;
.mx-negative-md {
  margin-left: $negative-space-md-x;
  margin-right: $negative-space-md-x;
}
.focus-outline:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: -2px;
}
.borders-x-none {
  border-left: none;
  border-right: none;
}
</style>
