import '@quasar/extras/animate/fadeIn.css'
import '@quasar/extras/animate/fadeOut.css'
import '@quasar/extras/animate/zoomOut.css'
import '@quasar/extras/animate/slideInDown.css'
import '@quasar/extras/animate/heartBeat.css'
import '@quasar/extras/roboto-font/roboto-font.css'
import 'quasar/src/css/index.sass'
import '@/styles/overrides.scss'
import '@/styles/common.scss'

import { Dark, Meta, Quasar } from 'quasar'
import quasarMdiIconSet from 'quasar/icon-set/svg-mdi-v7'
import quasarLangsRequired from 'virtual:quasar-langs-required'
import { createApp, watch } from 'vue'
import { createI18n } from 'vue-i18n'

import App from '@/App.vue'
import router from '@/router'
import storage from '@/storage'

const app = createApp(App)

app.use(router)

// I18n

const localesAvailable = import.meta.glob('./locales/*.json', { eager: true })
const messages = {}
const quasarLangNamesRequired = new Set()

Object.keys(localesAvailable).forEach((path) => {
  const matched = path.match(/\/([^/]+)\.json$/)
  if (matched && matched.length > 1) {
    const localeName = matched[1]
    const localeContent = localesAvailable[path].default
    messages[localeName] = localeContent
    const quasarLangName = localeContent['#quasar.lang']
    if (quasarLangName) quasarLangNamesRequired.add(quasarLangName)
  }
})

const quasarLangsMap = {}

Object.keys(quasarLangsRequired).forEach((name) => {
  if (quasarLangNamesRequired.has(name)) {
    quasarLangsMap[name] = quasarLangsRequired[name]
  }
})

function quasarLangForLocale(locale) {
  return quasarLangsMap[i18n.global.t('#quasar.lang', {}, { locale })]
}

const trimLocale = (value) => value && value.trim().split(/-|_/)[0]
const navigatorLocale = trimLocale(
  navigator.languages !== undefined ? navigator.languages[0] : navigator.language
)

const LOCALE_STORAGE_KEY = 'split:locale'
const defaultLocale = storage.get(LOCALE_STORAGE_KEY) || navigatorLocale || 'en'

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages,
  legacy: false
})

app.use(i18n)

// Quasar

app.use(Quasar, {
  plugins: { Dark, Meta },
  iconSet: quasarMdiIconSet,
  config: { dark: 'auto' },
  lang: quasarLangForLocale(defaultLocale)
})

watch(
  () => i18n.global.locale.value,
  (locale) => {
    if (locale !== navigatorLocale) storage.set(LOCALE_STORAGE_KEY, locale)
    else storage.remove(LOCALE_STORAGE_KEY)
    Quasar.lang.set(quasarLangForLocale(locale))
    document.documentElement.lang = messages[locale] ? locale : 'en'
  },
  { immediate: true }
)

app.mount('#app')
