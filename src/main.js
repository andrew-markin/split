/* eslint-disable simple-import-sort/imports */
import Vue from 'vue'

import App from './App.vue'
import i18n from './i18n'
import router from './router'
import store from './store'
import vuetify from './vuetify'

import './styles/overrides.css'
import './utils'

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
  i18n,
  render: h => h(App)
}).$mount('#app')
