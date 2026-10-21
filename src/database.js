// Local copies of splits kept in IndexedDB. The states store keeps the packed
// (compressed and encrypted) states by their anchors, the meta store keeps
// what is needed to prune them without the secrets: when each split was
// accessed and whether it has changes not synchronized yet.

const DATABASE_NAME = 'split'
const DATABASE_VERSION = 1

const STATES = 'states'
const META = 'meta'

let opening = undefined

function open() {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STATES)) db.createObjectStore(STATES)
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'anchor' })
      }
      request.onsuccess = () => {
        const db = request.result
        // Let a newer version of the app upgrade the database in another tab
        db.onversionchange = () => {
          db.close()
          opening = undefined
        }
        resolve(db)
      }
      request.onerror = () => {
        console.warn('Unable to open the database:', request.error?.message)
        resolve(undefined)
      }
    } catch (err) {
      console.warn('Unable to open the database:', err.message)
      resolve(undefined)
    }
  })
  return opening
}

// Run the callback within a transaction and resolve with its result once the
// transaction is committed, or with undefined when it fails
async function run(storeNames, mode, callback) {
  const db = await open()
  if (!db) return
  return new Promise((resolve) => {
    let result = undefined
    try {
      const transaction = db.transaction(storeNames, mode)
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = transaction.onabort = () => {
        console.warn('Unable to access the database:', transaction.error?.message)
        resolve(undefined)
      }
      callback(transaction, (value) => (result = value))
    } catch (err) {
      console.warn('Unable to access the database:', err.message)
      resolve(undefined)
    }
  })
}

async function available() {
  return !!(await open())
}

function getState(anchor) {
  return run([STATES], 'readonly', (transaction, done) => {
    const request = transaction.objectStore(STATES).get(anchor)
    request.onsuccess = () => done(request.result)
  })
}

async function setState(anchor, data, dirty) {
  const result = await run([STATES, META], 'readwrite', (transaction, done) => {
    transaction.objectStore(STATES).put(data, anchor)
    const meta = transaction.objectStore(META)
    const request = meta.get(anchor)
    request.onsuccess = () => {
      meta.put({ accessed: Date.now(), ...request.result, anchor, dirty })
      done(true)
    }
  })
  return !!result
}

function touch(anchor) {
  return run([META], 'readwrite', (transaction) => {
    const meta = transaction.objectStore(META)
    const request = meta.get(anchor)
    request.onsuccess = () => {
      meta.put({ dirty: false, ...request.result, anchor, accessed: Date.now() })
    }
  })
}

// Remove local copies of splits opened long ago, except the given one and the
// ones having changes not synchronized yet
function prune(keep, except) {
  return run([STATES, META], 'readwrite', (transaction) => {
    const states = transaction.objectStore(STATES)
    const meta = transaction.objectStore(META)
    const metaRequest = meta.getAll()
    const keysRequest = states.getAllKeys()
    keysRequest.onsuccess = () => {
      const known = new Set(metaRequest.result.map(({ anchor }) => anchor))
      const removed = metaRequest.result
        .filter(({ anchor }) => anchor !== except)
        .sort((left, right) => right.accessed - left.accessed)
        .slice(keep)
        .filter(({ dirty }) => !dirty)
        .map(({ anchor }) => anchor)
      // States without meta are left by failures and can't be pruned otherwise
      const orphans = keysRequest.result.filter((anchor) => !known.has(anchor))
      for (const anchor of [...removed, ...orphans]) {
        states.delete(anchor)
        meta.delete(anchor)
      }
    }
  })
}

export default { available, getState, setState, touch, prune }
