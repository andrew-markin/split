<template>
  <v-container>
    <categories-section class="mb-4"/>
    <participants-section class="mb-4"/>
    <expenses-section class="mb-4"/>
    <payments-section/>
  </v-container>
</template>

<script>
import CategoriesSection from '@/components/CategoriesSection'
import ExpensesSection from '@/components/ExpensesSection'
import ParticipantsSection from '@/components/ParticipantsSection'
import PaymentsSection from '@/components/PaymentsSection'

export default {
  components: {
    CategoriesSection,
    ExpensesSection,
    ParticipantsSection,
    PaymentsSection
  }
}
</script>
