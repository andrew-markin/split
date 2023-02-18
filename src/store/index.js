import { Mutex } from 'async-mutex'
import copyToClipboard from 'copy-to-clipboard'
import io from 'socket.io-client'
import Vue from 'vue'
import Vuex from 'vuex'

import router from '../router'
import { adjustTimestamp, generateKey, keyToRef, pack, unpack } from '../utils'
import Prefs from './prefs'

const SYNC_DELAY = 2000
const SYNC_ENSURE_INTERVAL = 30000
const SYNC_ATTEMPTS_COUNT = 10

Vue.use(Vuex)

// Utilities

const unpackContext = (data, key) => {
  const json = unpack(data, key)
  const { prefs } = (json && JSON.parse(json)) || {}
  return {
    prefs: Prefs.unify(prefs || [])
  }
}

const packContext = ({ prefs }, key, remote = false) => {
  return pack(JSON.stringify({
    prefs: Prefs.unify(prefs)
  }), key)
}

const mergeContexts = (local, remote) => {
  return {
    prefs: Prefs.merge(local.prefs, remote.prefs)
  }
}

const getSplitLink = (key) => {
  const route = router.resolve({ name: 'main', params: { key } })
  return new URL(route.href, window.location.href).href
}

// Socket.IO setup

const socket = io(process.env.VUE_APP_BACKEND, {
  transports: ['websocket'],
  auth: { token: process.env.VUE_APP_TOKEN }
})

socket.on('connect_error', (err) => {
  console.warn('Socket connection error:', err.message)
})

socket.on('connect', async () => {
  // Adjust local timestams
  let localTimestamp = Date.now()
  const { timestamp: remoteTimestamp } = await submit('now')
  localTimestamp = Math.floor((localTimestamp + Date.now()) / 2)
  adjustTimestamp(remoteTimestamp - localTimestamp)
  store.dispatch('setupSocket')
})

socket.on('changed', () => {
  store.dispatch('sync')
})

const submit = (event, ...args) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) return reject(new Error('Socket is not connected'))
    socket.emit(event, ...args, (res) => {
      const { error, ...rest } = res || {}
      if (error) reject(new Error(error))
      else resolve(rest)
    })
  })
}

const sleep = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(() => { resolve() }, timeout)
  })
}

let syncTimeout

const syncLater = () => {
  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    syncTimeout = undefined
    store.dispatch('sync')
  }, SYNC_DELAY)
}

setInterval(() => {
  store.dispatch('syncIfNeeded')
}, SYNC_ENSURE_INTERVAL)

const syncMutex = new Mutex()

const store = new Vuex.Store({
  state: {
    key: undefined,
    prefs: [],
    saved: true,
    version: undefined,
    prefsDialogShown: false
  },
  getters: {
    synced (state) {
      return state.version || (state.prefs.length === 0)
    },
    getPref: (state) => (name) => {
      return Prefs.getValue(state.prefs, name)
    }
  },
  mutations: {
    setContext (state, { prefs }) {
      state.prefs = prefs
      state.saved = false
    },
    setKey (state, value) {
      state.key = value
    },
    setSaved (state, value) {
      state.saved = value
    },
    setVersion (state, value) {
      state.version = value
    },
    setPref (state, { name, value }) {
      Prefs.setValue(state.prefs, name, value)
      state.saved = false
    },
    setPrefsDialogShown (state, value = true) {
      state.prefsDialogShown = value
    }
  },
  actions: {
    async setupSocket ({ state, dispatch }) {
      if (!socket.connected) return
      await submit('ref', keyToRef(state.key))
      dispatch('sync')
    },
    async resetSocket () {
      if (!socket.connected) return
      await submit('ref', undefined)
    },
    saveLocal ({ state }, { name, value, key }) {
      const itemKey = `split:${keyToRef(key || state.key)}:${name}`
      if (value !== undefined) localStorage.setItem(itemKey, value)
      else localStorage.removeItem(itemKey)
    },
    loadLocal ({ state }, name) {
      const itemKey = `split:${keyToRef(state.key)}:${name}`
      return localStorage.getItem(itemKey) || undefined
    },
    async load ({ commit, dispatch }, key) {
      const release = await syncMutex.acquire()
      try {
        await dispatch('resetSocket')
        commit('setKey', key)
        const data = await dispatch('loadLocal', 'data')
        commit('setContext', unpackContext(data, key))
        const version = await dispatch('loadLocal', 'version')
        commit('setVersion', version)
        await dispatch('setupSocket')
      } catch (err) {
        console.warn('Unable to load state:', err.message)
      } finally {
        release()
      }
    },
    async save ({ state, dispatch, commit }) {
      await dispatch('saveLocal', {
        name: 'data',
        value: packContext(state, state.key)
      })
      commit('setSaved', true)
    },
    async saveIfNeeded ({ state, dispatch }) {
      if (state.saved) return
      await dispatch('save')
      await dispatch('setVersion', undefined)
    },
    async setPref ({ commit, dispatch }, { name, value }) {
      const release = await syncMutex.acquire()
      try {
        commit('setPref', { name, value })
        await dispatch('saveIfNeeded')
      } catch (err) {
        console.warn('!Unable to set preference:', err.message)
      } finally {
        release()
      }
    },
    async setVersion ({ state, commit, dispatch }, value) {
      if (!value) syncLater()
      if (state.version === value) return
      commit('setVersion', value)
      await dispatch('saveLocal', { name: 'version', value })
    },
    async syncIfNeeded ({ state, dispatch }) {
      if (!socket.connected || state.version || syncTimeout) return
      await dispatch('sync')
    },
    async sync ({ state, getters, commit, dispatch }) {
      clearTimeout(syncTimeout)
      syncTimeout = undefined
      if (!socket.connected) return
      const release = await syncMutex.acquire()
      try {
        let attempts = SYNC_ATTEMPTS_COUNT
        let nextContext, nextVersion
        let res = await submit('get', { known: state.version })
        while (attempts-- > 0) { // Consensus loop
          let mergedContext
          if (res.data) {
            res.context = unpackContext(res.data, state.key)
            if (state.version) {
              // There are no local changes...
              if (state.version !== res.version) {
                // There are remote changes...
                nextContext = res.context
                nextVersion = res.version
              }
              break
            }
            mergedContext = mergeContexts(state, res.context)
          } else if ((res.version === state.version) && getters.synced) break

          const data = packContext(mergedContext || state, state.key, true)
          res = await submit('set', { data, version: res.version })
          if (res.success) {
            nextContext = mergedContext || undefined
            nextVersion = res.version
            break
          }
          await sleep(200) // Wait for a while before next attempt
        }
        if (nextContext) {
          commit('setContext', nextContext)
          await dispatch('save')
        }
        if (nextVersion) {
          await dispatch('setVersion', nextVersion)
        }
      } catch (err) {
        console.warn('Unable to sync:', err.message)
      } finally {
        release()
      }
    },
    copyLink ({ state }) {
      copyToClipboard(getSplitLink(state.key))
    },
    newSplit () {
      window.open(getSplitLink(generateKey()))
    },
    async cloneSplit ({ state, dispatch }) {
      const key = generateKey()
      await dispatch('saveLocal', {
        key,
        name: 'data',
        value: packContext(state, key)
      })
      window.open(getSplitLink(key))
    }
  }
})

export default store
