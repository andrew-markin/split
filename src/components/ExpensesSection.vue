<template>
  <section>
    <div class="text-h6">
      <span class="mr-1">
        {{ $t('EXPENSES') }}
      </span>
      <v-btn icon @click="pickExpense()">
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
        @click:row="pickExpense($event.id)"
        :no-data-text="$t('EXPENSES_NO_DATA')">
        <template #item.date="{ item }">
          <span :class="{ 'muted-1': !item.date }">
            {{ item.date || $t('DATE_UNDEFINED') }}
          </span>
        </template>
        <template #item.category="{ item }">
          <span :class="{ 'muted-1': !item.category }">
            {{ item.category || $t('CATEGORY_COMMON') }}
          </span>
        </template>
      </v-data-table>
    </v-sheet>
    <confirmation-modal
      v-model="confirmRemoval"
      @confirm="removeSelected">
      {{ $tc('EXPENSES_CONFIRM_REMOVAL', selected.length) }}
    </confirmation-modal>
    <expense-modal/>
  </section>
</template>

<script>
import { mdiPlus, mdiTrashCanOutline } from '@mdi/js'
import moment from 'moment'
import { mapActions, mapGetters } from 'vuex'

import ConfirmationModal from '@/components/ConfirmationModal'
import ExpenseModal from '@/components/ExpenseModal'

export default {
  components: {
    ConfirmationModal,
    ExpenseModal
  },
  data: () => ({
    mdiPlus,
    mdiTrashCanOutline,
    selected: [],
    confirmRemoval: false
  }),
  computed: {
    ...mapGetters(['expenses', 'findCategory', 'findParticipant']),
    headers () {
      return [{
        text: this.$t('DATE'),
        value: 'date',
        class: 'pl-0',
        cellClass: 'pl-0 text-no-wrap'
      }, {
        text: this.$t('EXPENSE_DESCRIPTION'),
        value: 'description',
        class: 'w-100'
      }, {
        text: this.$t('CATEGORY'),
        value: 'category',
        cellClass: 'text-no-wrap'
      }, {
        text: this.$t('EXPENSE_PAYER'),
        value: 'payer',
        cellClass: 'text-no-wrap'
      }, {
        text: this.$t('EXPENSE_AMOUNT'),
        value: 'amount',
        align: 'end'
      }]
    },
    items () {
      const categoryName = (id) => {
        return id && this.findCategory(id)?.data?.name
      }
      const participantName = (id) => {
        return id && this.findParticipant(id)?.data?.name
      }
      return this.expenses.map((expense) => ({
        id: expense.id,
        date: expense.data?.date && moment(expense.data?.date).locale(this.$i18n.locale).format('LL'),
        description: expense.data?.description,
        category: categoryName(expense.data?.category),
        payer: participantName(expense.data?.payer),
        amount: expense.data?.amount
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
    ...mapActions(['applyEdits', 'pickExpense']),
    async removeSelected () {
      await this.applyEdits(this.selected.map(({ id }) => ({ table: 'expenses', id })))
    }
  }
}
</script>
