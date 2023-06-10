<template>
  <app-modal
    :title="$t('SPLIT')"
    v-model="visible">
    <v-form
      ref="form"
      v-model="valid"
      lazy-validation>
      <v-text-field
        outlined autofocus
        :label="$t('TITLE')"
        :rules="titleRules"
        :placeholder="$t('UNTITLED')"
        :hint="$t('TITLE_HINT')"
        v-model="title"
        counter="64"
        @focus="$moveCursorToEnd"
        @keydown.enter="save">
      </v-text-field>
    </v-form>
    <template #right-buttons>
      <v-btn
        ref="saveButton"
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
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'

import AppModal from '@/components/AppModal'

export default {
  components: {
    AppModal
  },
  data: () => ({
    title: '',
    valid: true
  }),
  computed: {
    ...mapState(['prefsDialogShown']),
    ...mapGetters(['getPref']),
    visible: {
      get () {
        return !!this.prefsDialogShown
      },
      set (value) {
        if (!value) this.setPrefsDialogShown(false)
      }
    },
    titleRules () {
      return [
        (value) => (value.length <= 64) || this.$t('TITLE_LENGTH_LIMIT_MESSAGE')
      ]
    },
    savedTitle () {
      return this.getPref('title')
    },
    trimmedTitle () {
      return this.title.trim() || undefined
    },
    modified () {
      return this.trimmedTitle !== this.savedTitle
    },
    canSave () {
      return this.visible && this.valid && this.modified
    }
  },
  watch: {
    prefsDialogShown (value) {
      this.title = (value && this.savedTitle) || ''
      if (this.$refs.form) this.$refs.form.resetValidation()
    }
  },
  methods: {
    ...mapActions(['setPref']),
    ...mapMutations(['setPrefsDialogShown']),
    async save () {
      if (!this.visible || !this.modified || !this.$refs.form.validate()) return
      await this.setPref({ name: 'title', value: this.trimmedTitle })
      this.visible = false
    }
  }
}
</script>
