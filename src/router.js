import Vue from 'vue'
import VueRouter from 'vue-router'

import { generateKey } from '@/utils'
import SplitView from '@/views/SplitView'

Vue.use(VueRouter)

export default new VueRouter({
  routes: [{
    name: 'main',
    path: '/:key([a-zA-Z0-9]{43})',
    component: SplitView
  }, {
    path: '*',
    redirect: {
      name: 'main',
      params: { key: generateKey() }
    }
  }]
})
