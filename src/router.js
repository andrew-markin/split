import Vue from 'vue'
import VueRouter from 'vue-router'

import { generateKey } from './utils'
import SplitSheet from './views/SplitSheet.vue'

Vue.use(VueRouter)

export default new VueRouter({
  routes: [{
    name: 'main',
    path: '/:key([a-zA-Z0-9]{43})',
    component: SplitSheet
  }, {
    path: '*',
    redirect: {
      name: 'main',
      params: { key: generateKey() }
    }
  }]
})
