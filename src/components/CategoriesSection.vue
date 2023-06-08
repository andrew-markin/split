<template>
  <section>
    <div class="text-h6">
      <span class="mr-1">
        {{ $t('CATEGORIES') }}
      </span>
      <v-btn icon @click="pickCategory()">
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
        @click:row="pickCategory($event.id)"
        :no-data-text="$t('CATEGORIES_NO_DATA')">
        <template #item.participants="{ item }">
          <participations-list :category="item.id"/>
        </template>
      </v-data-table>
    </v-sheet>
    <confirmation-modal
      v-model="confirmRemoval"
      @confirm="removeSelected">
      {{ $tc('CATEGORIES_CONFIRM_REMOVAL', selected.length) }}
    </confirmation-modal>
    <category-modal/>
  </section>
</template>

<script>
import { mdiPlus, mdiTrashCanOutline } from '@mdi/js'
import { mapActions, mapGetters } from 'vuex'

import CategoryModal from '@/components/CategoryModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import ParticipationsList from '@/components/ParticipationsList'

export default {
  components: {
    CategoryModal,
    ConfirmationModal,
    ParticipationsList
  },
  data: () => ({
    mdiPlus,
    mdiTrashCanOutline,
    selected: [],
    confirmRemoval: false
  }),
  computed: {
    ...mapGetters(['categories']),
    headers () {
      return [{
        text: this.$t('CATEGORY_NAME'),
        value: 'name',
        class: 'pl-0',
        cellClass: 'pl-0 text-no-wrap'
      }, {
        text: this.$t('PARTICIPANTS'),
        value: 'participants',
        class: 'w-100',
        cellClass: 'py-3'
      }]
    },
    items () {
      return this.categories.map((category) => ({
        id: category.id,
        name: category.data?.name
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
    ...mapActions(['applyEdits', 'pickCategory']),
    async removeSelected () {
      await this.applyEdits(this.selected.map(({ id }) => ({ table: 'categories', id })))
    }
  }
}
</script>
