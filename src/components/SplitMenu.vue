<template>
  <q-menu max-height="1024px">
    <q-list role="menu" style="min-width: 25ch">
      <q-item v-close-popup clickable @click="copyLink()">
        <q-item-section side>
          <q-icon :name="mdiLinkVariant" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.copyLink') }}</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="newSplit()">
        <q-item-section side>
          <q-icon :name="mdiOpenInNew" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.newSplit') }}</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="cloneSplit()">
        <q-item-section side>
          <q-icon :name="mdiContentDuplicate" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.cloneSplit') }}</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="toggleTheme()">
        <q-item-section side>
          <q-icon :name="mdiThemeLightDark" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.toggleColorTheme') }}</q-item-section>
      </q-item>
      <q-separator />
      <q-item-label header>{{ $t('menu.applicationLanguage') }}</q-item-label>
      <q-item
        v-for="locale in $i18n.availableLocales"
        :key="locale"
        v-close-popup
        clickable
        :active="$i18n.locale === locale"
        active-class="bg-primary text-white text-bold"
        @click="$i18n.locale = locale"
      >
        <q-item-section side>
          <q-icon :name="mdiTranslate" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('#locale.title', {}, { locale }) }}</q-item-section>
      </q-item>
      <q-separator />
      <q-item v-close-popup clickable :href="github" target="_blank">
        <q-item-section side>
          <q-icon :name="mdiGithub" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.githubRepository') }}</q-item-section>
      </q-item>
      <q-item v-close-popup clickable :href="linkedin" target="_blank">
        <q-item-section side>
          <q-icon :name="mdiLinkedin" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.linkedinProfile') }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup>
import {
  mdiContentDuplicate,
  mdiGithub,
  mdiLinkedin,
  mdiLinkVariant,
  mdiOpenInNew,
  mdiThemeLightDark,
  mdiTranslate
} from '@quasar/extras/mdi-v7'
import copyToClipboard from 'copy-to-clipboard'
import { useRoute } from 'vue-router'

import { useSplit } from '@/composables/useSplit'
import { useThemes } from '@/composables/useThemes'
import { github, linkedin } from '@/links'
import router from '@/router'
import { getRandomSecret } from '@/utils'

const route = useRoute()

const { clone } = useSplit()
const themes = useThemes()

function getSplitLink(secret) {
  const route = router.resolve({ name: 'split', params: { secret } })
  return new URL(route.href, window.location.href).href
}

async function copyLink() {
  await copyToClipboard(getSplitLink(route.params.secret))
}

function newSplit() {
  window.open(getSplitLink(getRandomSecret()))
}

async function cloneSplit() {
  const secret = getRandomSecret()
  await clone(secret)
  window.open(getSplitLink(secret))
}

function toggleTheme() {
  themes.toggle()
}
</script>
