<template>
  <q-menu max-height="1024px">
    <q-list role="menu" style="min-width: 25ch">
      <q-item v-close-popup clickable @click="copyLink()">
        <q-item-section side>
          <q-icon :name="mdiLinkVariant" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.copyLink') }}</q-item-section>
      </q-item>
      <q-item v-if="shareAvailable" v-close-popup clickable @click="shareLink()">
        <q-item-section side>
          <q-icon :name="mdiShareVariant" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('menu.shareLink') }}</q-item-section>
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
      <q-item clickable>
        <q-item-section side>
          <q-icon :name="mdiTranslate" />
        </q-item-section>
        <q-item-section no-wrap>
          <q-item-label>{{ $t('menu.applicationLanguage') }}</q-item-label>
          <q-item-label caption>{{ $t('#locale.title') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon :name="mobile ? mdiChevronDown : mdiChevronRight" />
        </q-item-section>
        <q-menu
          :anchor="mobile ? 'bottom end' : 'top end'"
          :self="mobile ? 'top end' : 'top start'"
        >
          <q-list role="menu" style="min-width: 20ch">
            <q-item
              v-for="locale in $i18n.availableLocales"
              :key="locale"
              v-close-popup="2"
              clickable
              :active="$i18n.locale === locale"
              active-class="bg-primary text-white text-bold"
              @click="$i18n.locale = locale"
            >
              <q-item-section no-wrap>{{ $t('#locale.title', {}, { locale }) }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
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
      <q-item v-close-popup clickable @click="showPrivacy()">
        <q-item-section side>
          <q-icon :name="mdiShieldLockOutline" />
        </q-item-section>
        <q-item-section no-wrap>{{ $t('privacy.title') }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup>
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiContentDuplicate,
  mdiGithub,
  mdiLinkedin,
  mdiLinkVariant,
  mdiOpenInNew,
  mdiShareVariant,
  mdiShieldLockOutline,
  mdiThemeLightDark,
  mdiTranslate
} from '@quasar/extras/mdi-v7'
import copyToClipboard from 'copy-to-clipboard'
import { useRoute } from 'vue-router'

import PrivacyDialog from '@/components/PrivacyDialog.vue'
import { useDialogs } from '@/composables/useDialogs'
import { useScreen } from '@/composables/useScreen'
import { useSplit } from '@/composables/useSplit'
import { useThemes } from '@/composables/useThemes'
import { github, linkedin } from '@/links'
import router from '@/router'
import { getRandomSecret } from '@/utils'

const route = useRoute()

const { exec } = useDialogs()
const { mobile } = useScreen()
const { clone } = useSplit()
const themes = useThemes()

const shareAvailable = typeof navigator.share === 'function'

function getSplitLink(secret) {
  const route = router.resolve({ name: 'split', params: { secret } })
  return new URL(route.href, window.location.href).href
}

async function copyLink() {
  await copyToClipboard(getSplitLink(route.params.secret))
}

async function shareLink() {
  try {
    await navigator.share({ title: document.title, url: getSplitLink(route.params.secret) })
  } catch (err) {
    // Closing the share sheet rejects the promise too
    if (err.name !== 'AbortError') console.warn('Unable to share the link:', err.message)
  }
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

async function showPrivacy() {
  await exec(PrivacyDialog)
}
</script>
