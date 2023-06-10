<template>
  <app-modal
    ref="modal"
    :title="original ? $t('CATEGORY') : $t('NEW_CATEGORY')"
    v-model="visible"
    @closed="pickNothing">
    <v-form
      ref="form"
      v-model="formValid"
      lazy-validation>
      <v-text-field
        outlined autofocus
        :label="$t('CATEGORY_NAME')"
        :hint="$t('CATEGORY_NAME_HINT')"
        :rules="nameRules"
        v-model="current.name"
        :counter="16"
        @keydown.enter="save">
      </v-text-field>
    </v-form>
    <participations-select
      class="mt-2"
      :category="pickedCategory"
      @input="updateParticipationsEdits">
    </participations-select>
    <template #right-buttons>
      <v-btn
        large depressed
        class="primary ml-3"
        :disabled="!canSave"
        @click="save">
        {{ $t('SAVE') }}
      </v-btn>
    </template>
  </app-modal>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

import AppModal from '@/components/AppModal'
import ParticipationsSelect from '@/components/ParticipationsSelect'

export default {
  components: {
    AppModal,
    ParticipationsSelect
  },
  data: () => ({
    visible: undefined,
    original: undefined,
    current: {
      name: ''
    },
    formValid: undefined,
    participationsEdits: []
  }),
  computed: {
    ...mapGetters(['pickedCategory', 'findCategory']),
    nameRules () {
      return [
        (value) => (value.length > 0) || this.$t('CATEGORY_NAME_EMPTY_MESSAGE'),
        (value) => (value.length <= 16) || this.$t('CATEGORY_NAME_LENGTH_LIMIT_MESSAGE')
      ]
    },
    currentNameNormalized () {
      return (this.current.name || '').trim()
    },
    categoryEdits () {
      if (!this.pickedCategory || !this.formValid ||
          (this.currentNameNormalized === this.original?.name)) return []
      return [{
        table: 'categories',
        id: this.pickedCategory,
        data: {
          name: this.currentNameNormalized
        }
      }]
    },
    edits () {
      return [...this.categoryEdits, ...this.participationsEdits]
    },
    modified () {
      return this.edits.length > 0
    },
    canSave () {
      return this.pickedCategory && this.visible && this.modified && this.formValid
    }
  },
  watch: {
    pickedCategory () {
      this.init()
    }
  },
  methods: {
    ...mapActions(['applyEdits', 'pickNothing']),
    init () {
      if (!this.pickedCategory) {
        this.original = undefined
        this.current.name = ''
        this.visible = false
        return
      }
      const category = this.findCategory(this.pickedCategory)
      if (category) {
        const { name } = category.data || {}
        this.current.name = name || ''
        this.original = { ...this.current }
      } else {
        this.original = undefined
        this.current.name = ''
      }
      this.visible = true
    },
    updateParticipationsEdits (value) {
      this.participationsEdits = value
    },
    async save () {
      if (!this.$refs.form.validate() || !this.canSave) return
      await this.applyEdits(this.edits)
      this.visible = undefined
    }
  },
  mounted () {
    this.init()
  }
}
</script>
