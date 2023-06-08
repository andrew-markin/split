import { Mutex } from 'async-mutex'
import copyToClipboard from 'copy-to-clipboard'
import io from 'socket.io-client'
import Vue from 'vue'
import Vuex from 'vuex'

import router from '@/router'
import { adjustTimestamp, generateId, generateKey, keyToRef, pack, unpack } from '@/utils'

import Prefs from './prefs'
import Split from './split'

const SYNC_DELAY = 2000
const SYNC_ENSURE_INTERVAL = 30000
const SYNC_ATTEMPTS_COUNT = 10

Vue.use(Vuex)

// Utilities

const unpackContext = (data, key) => {
  const json = unpack(data, key)
  const { prefs, split } = (json && JSON.parse(json)) || {}
  return {
    prefs: Prefs.unify(prefs || []),
    split: Split.extend(split || {})
  }
}

const packContext = ({ prefs, split }, key, remote = false) => {
  return pack(JSON.stringify({
    prefs: Prefs.unify(prefs),
    split: Split.reduce(split, remote)
  }), key)
}

const mergeContexts = (local, remote) => {
  return {
    prefs: Prefs.merge(local.prefs, remote.prefs),
    split: Split.merge(local.split, remote.split)
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
    split: Split.create(),
    saved: true,
    version: undefined,
    prefsDialogShown: false,
    pick: {
      scope: undefined,
      id: undefined
    }
  },
  getters: {
    synced (state) {
      return state.version
    },
    getPref: (state) => (name) => {
      return Prefs.getValue(state.prefs, name)
    },
    categories (state) {
      const result = Split.categories(state.split)
      result.sort((left, right) => {
        return left?.data?.name?.localeCompare(right?.data?.name) ||
               left?.id.localeCompare(right?.id)
      })
      return result
    },
    pickedCategory (state) {
      return (state.pick.scope === 'category') && state.pick.id
    },
    findCategory: (state) => (id) => {
      return Split.findCategory(state.split, id)
    },
    participants (state) {
      const result = Split.participants(state.split)
      result.sort((left, right) => {
        return left?.data?.name?.localeCompare(right?.data?.name) ||
               left?.id.localeCompare(right?.id)
      })
      return result
    },
    pickedParticipant (state) {
      return (state.pick.scope === 'participant') && state.pick.id
    },
    findParticipant: (state) => (id) => {
      return Split.findParticipant(state.split, id)
    },
    participations: (state) => (query) => {
      return Split.participations(state.split, query || {})
    },
    findParticipation: (state) => (id) => {
      return Split.findParticipation(state.split, id)
    },
    expenses (state) {
      const EMPTY_DATE = '0000-00-00'
      const result = Split.expenses(state.split)
      result.sort((left, right) => {
        return (left?.data?.date || EMPTY_DATE).localeCompare(right?.data?.date || EMPTY_DATE) ||
                left?.data?.description?.localeCompare(right?.data?.description) ||
                left?.id.localeCompare(right?.id)
      })
      return result
    },
    pickedExpense (state) {
      return (state.pick.scope === 'expense') && state.pick.id
    },
    findExpense: (state) => (id) => {
      return Split.findExpense(state.split, id)
    },
    payments (state) {
      return Split.payments(state.split)
    }
  },
  mutations: {
    setContext (state, { prefs, split }) {
      state.prefs = prefs
      state.split = split
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
    },
    pick (state, value) {
      state.pick.scope = value?.scope
      state.pick.id = value && (value.id || generateId())
    },
    applyEdits (state, edits) {
      state.saved &= !Split.applyEdits(state.split, edits)
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
    async applyEdits ({ commit, dispatch }, edits) {
      const release = await syncMutex.acquire()
      try {
        commit('applyEdits', edits)
        await dispatch('saveIfNeeded')
      } catch (err) {
        console.warn('Unable to apply edits:', err.message)
      } finally {
        release()
      }
    },
    pickCategory ({ commit }, id) {
      commit('pick', { scope: 'category', id })
    },
    pickParticipant ({ commit }, id) {
      commit('pick', { scope: 'participant', id })
    },
    pickExpense ({ commit }, id) {
      commit('pick', { scope: 'expense', id })
    },
    pickNothing ({ commit }) {
      commit('pick')
    }
  }
})

export default store
