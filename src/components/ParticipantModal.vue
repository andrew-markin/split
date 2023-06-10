<template>
  <app-modal
    ref="modal"
    :title="original ? $t('PARTICIPANT') : $t('NEW_PARTICIPANT')"
    v-model="visible"
    @closed="pickNothing">
    <v-form
      ref="form"
      v-model="formValid"
      lazy-validation>
      <v-text-field
        outlined autofocus
        :label="$t('PARTICIPANT_NAME')"
        :hint="$t('PARTICIPANT_NAME_HINT')"
        :rules="nameRules"
        v-model="current.name"
        :counter="32"
        @keydown.enter="save">
      </v-text-field>
      <participant-select
        outlined class="mt-1"
        :label="$t('PARTICIPANT_PATRON')"
        :placeholder="$t('PARTICIPANT_PATRON_NONE')"
        persistent-placeholder
        :default="pickedParticipant"
        v-model="current.patron">
      </participant-select>
      <v-text-field
        outlined class="mt-1"
        :label="$t('PARTICIPANT_PAYMENT_COMMENT')"
        :hint="$t('PARTICIPANT_PAYMENT_COMMENT_HINT')"
        :rules="commentRules"
        v-model="current.comment"
        :counter="64"
        @keydown.enter="save">
      </v-text-field>
    </v-form>
    <participations-select
      class="mt-2"
      :participant="pickedParticipant"
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
import ParticipantSelect from '@/components/ParticipantSelect'
import ParticipationsSelect from '@/components/ParticipationsSelect'

export default {
  components: {
    AppModal,
    ParticipantSelect,
    ParticipationsSelect
  },
  data: () => ({
    visible: undefined,
    original: undefined,
    current: {
      name: '',
      patron: undefined,
      comment: ''
    },
    formValid: undefined,
    participationsEdits: []
  }),
  computed: {
    ...mapGetters(['pickedParticipant', 'findParticipant']),
    nameRules () {
      return [
        (value) => (value.length > 0) || this.$t('PARTICIPANT_NAME_EMPTY_MESSAGE'),
        (value) => (value.length <= 32) || this.$t('PARTICIPANT_NAME_LENGTH_LIMIT_MESSAGE')
      ]
    },
    commentRules () {
      return [
        (value) => (value.length <= 64) || this.$t('PARTICIPANT_PAYMENT_COMMENT_LENGTH_LIMIT_MESSAGE')
      ]
    },
    currentNameNormalized () {
      return (this.current.name || '').trim()
    },
    currentCommentNormalized () {
      return (this.current.comment || '').trim()
    },
    participantEdits () {
      if (!this.pickedParticipant || !this.formValid ||
          ((this.currentNameNormalized === this.original?.name) &&
           (this.current.patron === this.original?.patron) &&
           (this.currentCommentNormalized === this.original?.comment))) return []
      return [{
        table: 'participants',
        id: this.pickedParticipant,
        data: {
          name: this.currentNameNormalized,
          patron: this.current.patron,
          comment: this.currentCommentNormalized
        }
      }]
    },
    edits () {
      return [...this.participantEdits, ...this.participationsEdits]
    },
    modified () {
      return this.edits.length > 0
    },
    canSave () {
      return this.pickedParticipant && this.visible && this.modified && this.formValid
    }
  },
  watch: {
    pickedParticipant () {
      this.init()
    }
  },
  methods: {
    ...mapActions(['applyEdits', 'pickNothing']),
    init () {
      if (!this.pickedParticipant) {
        this.original = undefined
        this.current.name = ''
        this.current.patron = undefined
        this.current.comment = ''
        this.visible = false
        return
      }
      const participant = this.findParticipant(this.pickedParticipant)
      if (participant) {
        const { name, patron, comment } = participant.data || {}
        this.current.name = name || ''
        this.current.patron = patron || undefined
        this.current.comment = comment || ''
        this.original = { ...this.current }
      } else {
        this.original = undefined
        this.current.name = ''
        this.current.patron = undefined
        this.current.comment = ''
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
