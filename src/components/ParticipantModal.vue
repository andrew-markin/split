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
        :rules="nameRules"
        v-model="current.name"
        :counter="32"
        @keydown.enter="save">
      </v-text-field>
      <participant-select
        outlined hide-details
        :label="$t('PARTICIPANT_PATRON')"
        :placeholder="$t('PARTICIPANT_PATRON_NONE')"
        :default="pickedParticipant"
        v-model="current.patron"
        persistent-placeholder>
      </participant-select>
    </v-form>
    <participations-select
      class="mt-4"
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
      patron: undefined
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
    currentNameNormalized () {
      return (this.current.name || '').trim()
    },
    participantEdits () {
      if (!this.pickedParticipant || !this.formValid ||
          ((this.currentNameNormalized === this.original?.name) &&
           (this.current.patron === this.original?.patron))) return []
      return [{
        table: 'participants',
        id: this.pickedParticipant,
        data: {
          name: this.currentNameNormalized,
          patron: this.current.patron
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
        this.visible = false
        return
      }
      const participant = this.findParticipant(this.pickedParticipant)
      if (participant) {
        const { name, patron } = participant.data || {}
        this.original = { name, patron }
        this.current.name = name || ''
        this.current.patron = patron || undefined
      } else {
        this.original = undefined
        this.current.name = ''
        this.current.patron = undefined
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
