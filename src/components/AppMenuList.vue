<template>
  <v-list>
    <v-list-item
      link @click="copyLink">
      <v-icon left>{{ mdiLinkVariant }}</v-icon>
      {{ $t('COPY_LINK') }}
    </v-list-item>
    <v-list-item
      link @click="newSplit">
      <v-icon left>{{ mdiOpenInNew }}</v-icon>
      {{ $t('NEW_SPLIT') }}
    </v-list-item>
    <v-list-item
      link @click="cloneSplit">
      <v-icon left>{{ mdiContentDuplicate }}</v-icon>
      {{ $t('CLONE_SPLIT') }}
    </v-list-item>
    <v-list-item
      link @click="toggleDarkTheme">
      <v-icon left>{{ mdiInvertColors }}</v-icon>
      {{ $t('TOGGLE_COLOR_THEME') }}
    </v-list-item>
    <v-divider></v-divider>
    <v-subheader>
      {{ $t('APP_LANGUAGE') }}
    </v-subheader>
    <v-list-item-group v-model="$i18n.locale">
      <v-list-item
        v-for="locale in $i18n.availableLocales" :key="locale"
        :value="locale">
        <v-icon left>{{ mdiTranslate }}</v-icon>
        {{ $t('_LOCALE_TITLE', locale) }}
      </v-list-item>
    </v-list-item-group>
    <v-divider></v-divider>
    <v-list-item
      :href="github" target="_blank">
      <v-icon left>{{ mdiGithub }}</v-icon>
      {{ $t('GITHUB_REPOSITORY') }}
    </v-list-item>
    <v-list-item
      :href="linkedin" target="_blank">
      <v-icon left>{{ mdiLinkedin }}</v-icon>
      {{ $t('LINKEDIN_PROFILE') }}
    </v-list-item>
  </v-list>
</template>

<script>
import {
  mdiContentDuplicate, mdiGithub, mdiInvertColors, mdiLinkedin,
  mdiLinkVariant, mdiOpenInNew, mdiTranslate
} from '@mdi/js'
import { mapActions } from 'vuex'

import { github, linkedin } from '@/links'
import { toggleDarkTheme } from '@/vuetify'

export default {
  data: () => ({
    github,
    linkedin,
    mdiLinkVariant,
    mdiOpenInNew,
    mdiContentDuplicate,
    mdiInvertColors,
    mdiTranslate,
    mdiGithub,
    mdiLinkedin
  }),
  methods: {
    ...mapActions([
      'copyLink',
      'newSplit',
      'cloneSplit'
    ]),
    toggleDarkTheme
  }
}
</script>
