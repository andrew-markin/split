<template>
  <app-modal
    :title="$t('CONFIRMATION_REQUIRED')"
    v-model="visible">
    <slot></slot>
    <template #right-buttons>
      <v-btn
        large depressed
        class="primary ml-3"
        @click="confirm">
        {{ $t('CONFIRM') }}
      </v-btn>
    </template>
  </app-modal>
</template>

<script>
import AppModal from '@/components/AppModal'

export default {
  components: {
    AppModal
  },
  props: {
    message: String,
    value: Boolean
  },
  emits: ['input', 'confirm'],
  data: () => ({
    visible: undefined
  }),
  watch: {
    value (value) {
      this.visible = !!value
    },
    visible (value) {
      this.$emit('input', value)
    }
  },
  methods: {
    confirm () {
      this.$emit('confirm')
      this.visible = false
    }
  }
}
</script>
