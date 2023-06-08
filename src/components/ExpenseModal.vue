<template>
  <app-modal
    ref="modal"
    :title="original ? $t('EXPENSE') : $t('NEW_EXPENSE')"
    v-model="visible"
    @closed="pickNothing">
    <v-form
      ref="form"
      v-model="formValid"
      lazy-validation>
      <v-menu
        v-model="dateMenuShown"
        :close-on-content-click="false"
        max-width="300">
        <template v-slot:activator="{ on, attrs }">
          <v-text-field
            outlined clearable readonly
            :value="dateFormatted"
            :label="$t('DATE')"
            :placeholder="$t('DATE_UNDEFINED')"
            persistent-placeholder
            v-bind="attrs"
            v-on="on"
            @click:clear="current.date = undefined">
          </v-text-field>
        </template>
        <v-date-picker
          no-title scrollable
          show-adjacent-months
          v-model="current.date"
          :locale="$i18n.locale"
          :first-day-of-week="1"
          full-width
          @change="dateMenuShown = false">
        </v-date-picker>
      </v-menu>
      <v-text-field
        outlined autofocus
        :label="$t('EXPENSE_DESCRIPTION')"
        :rules="descriptionRules"
        v-model="current.description"
        :counter="128"
        @keydown.enter="save">
      </v-text-field>
      <category-select
        outlined
        :label="$t('CATEGORY')"
        :placeholder="$t('CATEGORY_COMMON')"
        persistent-placeholder
        v-model="current.category">
      </category-select>
      <participant-select
        outlined
        :label="$t('EXPENSE_PAYER')"
        :rules="payerRules"
        v-model="current.payer">
      </participant-select>
      <v-text-field
        outlined
        :label="$t('EXPENSE_AMOUNT')"
        :rules="amountRules"
        v-model="current.amount"
        @keydown.enter="save">
      </v-text-field>
    </v-form>
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
import moment from 'moment'
import { mapActions, mapGetters } from 'vuex'

import AppModal from '@/components/AppModal'
import CategorySelect from '@/components/CategorySelect'
import ParticipantSelect from '@/components/ParticipantSelect'
import { amountIsValid, decimalsCount, normalizedAmount } from '@/utils'

export default {
  components: {
    AppModal,
    CategorySelect,
    ParticipantSelect
  },
  data: () => ({
    visible: undefined,
    original: undefined,
    current: {
      date: undefined,
      description: undefined,
      category: undefined,
      payer: undefined,
      amount: undefined
    },
    dateMenuShown: false,
    formValid: undefined
  }),
  computed: {
    ...mapGetters(['pickedExpense', 'findExpense', 'findParticipant']),
    descriptionRules () {
      return [
        (value) => (value.length > 0) || this.$t('EXPENSE_DESCRIPTION_EMPTY_MESSAGE'),
        (value) => (value.length <= 128) || this.$t('EXPENSE_DESCRIPTION_LENGTH_LIMIT_MESSAGE')
      ]
    },
    payerRules () {
      return [
        (value) => !!value || this.$t('EXPENSE_PAYER_EMPTY_MESSAGE')
      ]
    },
    amountRules () {
      return [
        (value) => (amountIsValid(value) || this.$t('EXPENSE_AMOUNT_INVALID_MESSAGE')),
        (value) => (decimalsCount(value) <= 2) || this.$t('EXPENSE_AMOUNT_DECIMALS_MESSAGE'),
        (value) => (Number(value) >= 0.01) || this.$t('EXPENSE_AMOUNT_TOO_LOW_MESSAGE'),
        (value) => (Number(value) <= 99999999.99) || this.$t('EXPENSE_AMOUNT_TOO_HIGH_MESSAGE')
      ]
    },
    dateFormatted () {
      return this.current.date ? moment(this.current.date).locale(this.$i18n.locale).format('LL') : ''
    },
    currentDescriptionNormalized () {
      return (this.current.description || '').trim()
    },
    currentAmountNormalized () {
      return normalizedAmount(this.current.amount)
    },
    edits () {
      if (!this.pickedExpense || !this.formValid ||
          ((this.current.date === this.original?.date) &&
           (this.currentDescriptionNormalized === this.original?.description) &&
           (this.current.category === this.original?.category) &&
           (this.current.payer === this.original?.payer) &&
           (this.currentAmountNormalized === this.original?.amount))) return []
      return [{
        table: 'expenses',
        id: this.pickedExpense,
        data: {
          date: this.current.date,
          description: this.currentDescriptionNormalized,
          category: this.current.category,
          payer: this.current.payer,
          amount: this.currentAmountNormalized
        }
      }]
    },
    modified () {
      return this.edits.length > 0
    },
    canSave () {
      return this.pickedExpense && this.visible && this.modified && this.formValid
    }
  },
  watch: {
    pickedExpense () {
      this.init()
    }
  },
  methods: {
    ...mapActions(['applyEdits', 'pickNothing', 'saveLocal', 'loadLocal']),
    async init () {
      this.dateMenuShown = false
      if (!this.pickedExpense) {
        this.original = undefined
        this.current.date = undefined
        this.current.description = ''
        this.current.category = undefined
        this.current.payer = undefined
        this.current.amount = ''
        this.visible = false
        return
      }
      const expense = this.findExpense(this.pickedExpense)
      if (expense) {
        const { description, amount, category, payer, date } = expense.data || {}
        this.original = { description, amount, category, payer, date }
        this.current.date = date || undefined
        this.current.description = description || ''
        this.current.category = category || undefined
        this.current.payer = payer || undefined
        this.current.amount = amount || ''
      } else {
        this.original = undefined
        this.current.date = undefined
        this.current.description = ''
        this.current.category = undefined
        const lastPayer = await this.loadLocal('lastExpensePayer')
        this.current.payer = this.findParticipant(lastPayer)?.id
        this.current.amount = ''
      }
      this.visible = true
    },
    async save () {
      if (!this.$refs.form.validate() || !this.canSave) return
      await this.applyEdits(this.edits)
      await this.saveLocal({ name: 'lastExpensePayer', value: this.current.payer })
      this.visible = undefined
    }
  },
  async mounted () {
    await this.init()
  }
}
</script>
