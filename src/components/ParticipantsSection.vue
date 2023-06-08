<template>
  <section>
    <div class="text-h6">
      <span class="mr-1">
        {{ $t('PARTICIPANTS') }}
      </span>
      <v-btn icon @click="pickParticipant()">
        <v-icon>{{ mdiPlus }}</v-icon>
      </v-btn>
      <v-btn
        v-if="selected.length > 0"
        icon @click="confirmRemoval = true">
        <v-icon>{{ mdiTrashCanOutline }}</v-icon>
      </v-btn>
    </div>
    <v-sheet
      outlined rounded
      class="overflow-hidden mt-1">
      <v-data-table
        disable-filtering
        disable-pagination
        hide-default-footer
        disable-sort
        show-select
        :headers="headers"
        :items="items"
        v-model="selected"
        @click:row="pickParticipant($event.id)"
        :no-data-text="$t('PARTICIPANTS_NO_DATA')">
        <template #item.patron="{ item }">
          <span :class="{ 'muted-1': !item.patron }">
            {{ item.patron || $t('PARTICIPANT_PATRON_NONE') }}
          </span>
        </template>
        <template #item.categories="{ item }">
          <participations-list :participant="item.id"/>
        </template>
      </v-data-table>
    </v-sheet>
    <confirmation-modal
      v-model="confirmRemoval"
      @confirm="removeSelected">
      {{ $tc('PARTICIPANTS_CONFIRM_REMOVAL', selected.length) }}
    </confirmation-modal>
    <participant-modal/>
  </section>
</template>

<script>
import { mdiPlus, mdiTrashCanOutline } from '@mdi/js'
import { mapActions, mapGetters } from 'vuex'

import ConfirmationModal from '@/components/ConfirmationModal'
import ParticipantModal from '@/components/ParticipantModal'
import ParticipationsList from '@/components/ParticipationsList'

export default {
  components: {
    ConfirmationModal,
    ParticipantModal,
    ParticipationsList
  },
  data: () => ({
    mdiPlus,
    mdiTrashCanOutline,
    selected: [],
    confirmRemoval: false
  }),
  computed: {
    ...mapGetters(['participants', 'findParticipant']),
    headers () {
      return [{
        text: this.$t('PARTICIPANT_NAME'),
        value: 'name',
        class: 'pl-0',
        cellClass: 'pl-0 text-no-wrap'
      }, {
        text: this.$t('PARTICIPANT_PATRON'),
        value: 'patron',
        cellClass: 'text-no-wrap'
      }, {
        text: this.$t('CATEGORIES'),
        value: 'categories',
        class: 'w-100',
        cellClass: 'py-3'
      }]
    },
    items () {
      const participantName = (id) => {
        return id && this.findParticipant(id)?.data?.name
      }
      return this.participants.map((participant) => ({
        id: participant.id,
        name: participant.data?.name,
        patron: participantName(participant.data?.patron)
      }))
    }
  },
  watch: {
    items (items) {
      this.selected = this.selected.filter(({ id: selectedId }) => {
        return items.findIndex(({ id }) => id === selectedId) >= 0
      })
    }
  },
  methods: {
    ...mapActions(['applyEdits', 'pickParticipant']),
    async removeSelected () {
      await this.applyEdits(this.selected.map(({ id }) => ({ table: 'participants', id })))
    }
  }
}
</script>
