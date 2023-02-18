<template>
  <v-list>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          link @click="copyLink"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiLinkVariant }}</v-icon>
          {{ $t('COPY_LINK') }}
        </v-list-item>
      </template>
      <span>{{ $t('COPY_LINK_TOOLTIP') }}</span>
    </v-tooltip>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          link @click="newSplit"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiOpenInNew }}</v-icon>
          {{ $t('NEW_SPLIT') }}
        </v-list-item>
      </template>
      <span>{{ $t('NEW_SPLIT_TOOLTIP') }}</span>
    </v-tooltip>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          link @click="cloneSplit"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiContentDuplicate }}</v-icon>
          {{ $t('CLONE_SPLIT') }}
        </v-list-item>
      </template>
      <span>{{ $t('CLONE_SPLIT_TOOLTIP') }}</span>
    </v-tooltip>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          link @click="toggleDarkTheme"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiInvertColors }}</v-icon>
          {{ $t('TOGGLE_COLOR_THEME') }}
        </v-list-item>
      </template>
      <span>{{ $t('TOGGLE_COLOR_THEME_TOOLTIP') }}</span>
    </v-tooltip>
    <v-divider></v-divider>
    <v-subheader>
      {{ $t('APP_LANGUAGE') }}
    </v-subheader>
    <v-list-item-group v-model="$i18n.locale">
      <v-tooltip
        v-for="locale in $i18n.availableLocales" :key="locale"
        bottom open-delay="500">
        <template #activator="{ on, attrs }">
          <v-list-item
            v-bind="attrs" v-on="on"
            :value="locale">
            <v-icon left>{{ mdiTranslate }}</v-icon>
            {{ $t('_LOCALE_TITLE', locale) }}
          </v-list-item>
        </template>
        <span>{{ $t('_LOCALE_TOOLTIP', locale) }}</span>
      </v-tooltip>
    </v-list-item-group>
    <v-divider></v-divider>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          :href="github" target="_blank"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiGithub }}</v-icon>
          {{ $t('GITHUB_REPOSITORY') }}
        </v-list-item>
      </template>
      <span>{{ $t('GITHUB_REPOSITORY_TOOLTIP') }}</span>
    </v-tooltip>
    <v-tooltip bottom open-delay="500">
      <template #activator="{ on, attrs }">
        <v-list-item
          :href="linkedin" target="_blank"
          v-bind="attrs" v-on="on">
          <v-icon left>{{ mdiLinkedin }}</v-icon>
          {{ $t('LINKEDIN_PROFILE') }}
        </v-list-item>
      </template>
      <span>{{ $t('LINKEDIN_PROFILE_TOOLTIP') }}</span>
    </v-tooltip>
  </v-list>
</template>

<script>
import {
  mdiContentDuplicate, mdiGithub, mdiInvertColors, mdiLinkedin,
  mdiLinkVariant, mdiOpenInNew, mdiTranslate
} from '@mdi/js'
import { mapActions } from 'vuex'

import { github, linkedin } from '../links'
import { toggleDarkTheme } from '../vuetify'

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
