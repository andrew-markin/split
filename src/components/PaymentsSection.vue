<template>
  <section>
    <div class="text-h6">
      <span class="mr-1">
        {{ $t('PAYMENTS') }}
      </span>
      <v-btn icon @click="copy()">
        <v-icon>{{ mdiContentCopy }}</v-icon>
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
        :headers="headers"
        :items="items"
        :no-data-text="$t('PAYMENTS_NO_DATA')">
      </v-data-table>
    </v-sheet>
  </section>
</template>

<script>
import { mdiContentCopy } from '@mdi/js'
import copyToClipboard from 'copy-to-clipboard'
import { mapGetters } from 'vuex'

export default {
  data: () => ({
    mdiContentCopy
  }),
  computed: {
    ...mapGetters(['payments', 'findParticipant']),
    headers () {
      return [{
        text: this.$t('PAYMENT_SENDER'),
        value: 'sender',
        cellClass: 'text-no-wrap'
      }, {
        text: this.$t('PAYMENT_RECEIVER'),
        value: 'receiver',
        class: 'text-no-wrap',
        cellClass: 'text-no-wrap'
      }, {
        value: 'comment',
        class: 'w-100',
        cellClass: 'text-no-wrap'
      }, {
        text: this.$t('PAYMENT_AMOUNT'),
        value: 'amount',
        cellClass: 'text-no-wrap',
        align: 'end'
      }]
    },
    items () {
      const participantData = (id) => {
        return (id && this.findParticipant(id)?.data) || {}
      }
      return this.payments.map((payment) => {
        const { name: senderName } = participantData(payment.sender)
        const { name: receiverName, comment } = participantData(payment.receiver)
        return {
          digest: `${payment.sender}:${payment.receiver}`,
          sender: senderName,
          receiver: receiverName,
          comment,
          amount: payment.amount
        }
      }).sort((left, right) => {
        return left.sender?.localeCompare(right.sender) ||
               left.receiver?.localeCompare(right.receiver) ||
               left.digest?.localeCompare(right.digest)
      })
    }
  },
  methods: {
    copy () {
      copyToClipboard(this.items.map(({ sender, receiver, comment, amount }) => {
        let payment = `${sender} --> ${receiver}: ${amount}`
        if (comment && (comment.length > 0)) payment += ` (${comment})`
        return payment
      }).join('\n'))
    }
  }
}
</script>
