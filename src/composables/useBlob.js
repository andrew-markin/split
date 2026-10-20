import { Mutex } from 'async-mutex'
import { io } from 'socket.io-client'
import { reactive, readonly } from 'vue'

import { getCipher, packValue, unpackValue } from '@/utils'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const BACKEND_TOKEN = import.meta.env.VITE_BACKEND_TOKEN
const CIPHER_SALT = import.meta.env.VITE_CIPHER_SALT

const SUBMIT_TIMEOUT = 10000

export function useBlob() {
  const mutex = new Mutex()

  let secret = undefined
  let anchor = undefined

  const state = reactive({
    dataset: undefined,
    version: undefined
  })

  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    auth: { token: BACKEND_TOKEN }
  })

  async function connect(options) {
    const release = await mutex.acquire()
    try {
      secret = options.secret
      anchor = await getCipher(secret, CIPHER_SALT, 'BLOBS_ANCHOR')
      // TODO: Maybe restore data and version from local storage
      Object.assign(state, {
        dataset: undefined,
        version: undefined
      })
    } catch (err) {
      console.error('Unable to connect the BLOB:', err.message)
    } finally {
      release()
    }
    await subscribe()
    await refresh()
  }

  let timestampFix = 0

  // Current time in milliseconds adjusted to the server clock
  function timestamp() {
    return Date.now() + timestampFix
  }

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message)
  })

  socket.on('connect', async () => {
    try {
      let localTimestamp = Date.now()
      const { timestamp: remoteTimestamp } = await submit('now')
      if (!Number.isFinite(remoteTimestamp)) throw new Error('Invalid server timestamp')
      localTimestamp = Math.floor((localTimestamp + Date.now()) / 2)
      timestampFix = remoteTimestamp - localTimestamp
    } catch (err) {
      console.warn('Unable to sync the timestamp:', err.message)
    }
    await subscribe()
    await refresh()
  })

  socket.on('changed', () => refresh())

  async function submit(event, ...args) {
    return new Promise((resolve, reject) => {
      socket.timeout(SUBMIT_TIMEOUT).emit(event, ...args, (err, res) => {
        if (err) return reject(err)
        const { error, ...rest } = res ?? {}
        if (error) reject(new Error(error))
        else resolve(rest)
      })
    })
  }

  async function subscribe() {
    const release = await mutex.acquire()
    try {
      if (!anchor) return
      await submit('ref', anchor)
    } catch (err) {
      console.warn('Unable to subscribe the BLOB:', err.message)
    } finally {
      release()
    }
  }

  async function refresh() {
    const release = await mutex.acquire()
    try {
      if (!anchor) return
      const result = await submit('get', { known: state.version })
      if (!result.data || !result.version) return
      Object.assign(state, {
        dataset: await unpackValue(result.data, secret),
        version: result.version
      })
    } catch (err) {
      console.warn('Unable to get the BLOB:', err.message)
    } finally {
      release()
    }
  }

  async function update(dataset, version) {
    const release = await mutex.acquire()
    try {
      if (!anchor) return
      const result = await submit('set', {
        data: await packValue(dataset, secret),
        version
      })
      if (result.success) {
        Object.assign(state, { dataset, version: result.version })
      } else if (result.data && result.version) {
        // The blob was changed by someone else, and the rejection carries its
        // current state, so take it at once instead of waiting for a notification
        Object.assign(state, {
          dataset: await unpackValue(result.data, secret),
          version: result.version
        })
      }
      return result
    } catch (err) {
      console.warn('Unable to set the BLOB:', err.message)
    } finally {
      release()
    }
  }

  return {
    connect,
    state: readonly(state),
    update,
    timestamp
  }
}
