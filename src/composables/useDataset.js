import { Mutex } from 'async-mutex'
import { computed, ref, shallowRef, toRaw, triggerRef, watch } from 'vue'
import * as z from 'zod'

import storage from '@/storage'
import { getCipher, getNonce, getRandomId, sortByFields } from '@/utils'

import { useBlob } from './useBlob'

const CIPHER_SALT = import.meta.env.VITE_CIPHER_SALT

const collectionNameSchema = z.string().regex(/^[a-z][a-zA-Z0-9]{0,63}$/)
const fieldNameSchema = z.string().regex(/^[a-z][a-zA-Z0-9]{0,63}$/)
const documentIdSchema = z.string().regex(/^[0-9a-zA-Z]{22}$/)

const datasetSchema = z.record(
  collectionNameSchema,
  z.array(
    z
      .strictObject({
        id: documentIdSchema,
        removed: z.boolean().optional()
      })
      .catchall(
        z.strictObject({
          value: z.unknown().optional(),
          nonce: z.string().regex(/^[0-9A-Za-z]{28}$/)
        })
      )
  )
)

const datasetUpsertSchema = z.record(
  collectionNameSchema,
  z.array(
    z.looseObject({
      id: documentIdSchema.optional(),
      removed: z.boolean().optional()
    })
  )
)

const constraintsSchema = z.record(
  collectionNameSchema,
  z.record(
    fieldNameSchema,
    z.strictObject({
      scope: collectionNameSchema,
      fix: z.enum(['remove', 'unset']),
      // Referenced document must not reference further by the same field
      flat: z.boolean().optional()
    })
  )
)

// Local copies of the most recently opened splits kept in the storage
const STATES_KEPT = 50
// Local copies kept when the storage is full
const STATES_KEPT_ON_OVERFLOW = 5

const ACCESSED_STORAGE_KEY = 'split:accessed'
const STATE_STORAGE_KEY_PATTERN = /^split:([0-9a-f]{64}):state$/

const getStateStorageKey = (anchor) => `split:${anchor}:state`
const getPropertyStorageKey = (anchor, name) => `split:${anchor}:property:${name}`

let context

function useContext() {
  const mutex = new Mutex()

  let constraints = undefined
  let anchor = undefined

  const dataset = shallowRef({})
  const version = ref(undefined)
  const changed = ref(undefined)

  let datasetIndex = {}
  let fetchTimeout = undefined
  let flushTimeout = undefined

  const blob = useBlob()

  function constrain(value) {
    try {
      constraintsSchema.parse(value)
      constraints = value
    } catch (err) {
      console.error('Unable to set constraints:', err.message)
    }
  }

  async function getStorageAnchor(secret) {
    return await getCipher(secret, CIPHER_SALT, 'STORAGE_ANCHOR')
  }

  async function connect(secret) {
    const release = await mutex.acquire()
    try {
      anchor = await getStorageAnchor(secret)
      changed.value = undefined
      version.value = undefined
      dataset.value = {}
      datasetIndex = {}
      touch()
      prune()
      const state = storage.get(getStateStorageKey(anchor)) ?? {}
      merge(state.dataset)
      version.value = state.version
      changed.value = state.changed
      triggerRef(dataset)
      await blob.connect({ secret })
    } catch (err) {
      console.warn('Unable to connect the dataset:', err.message)
    } finally {
      release()
    }
  }

  function save() {
    if (!anchor) return
    const key = getStateStorageKey(anchor)
    const state = {
      dataset: dataset.value,
      version: version.value,
      changed: changed.value
    }
    if (storage.set(key, state)) return
    // The storage is probably full, so drop older local copies and retry
    prune(STATES_KEPT_ON_OVERFLOW)
    if (!storage.set(key, state)) console.error('Unable to save the split locally')
  }

  function touch() {
    const accessed = storage.get(ACCESSED_STORAGE_KEY) ?? {}
    accessed[anchor] = Date.now()
    storage.set(ACCESSED_STORAGE_KEY, accessed)
  }

  // Remove local copies of splits opened long ago, except the current one and
  // the ones having changes not synchronized yet
  function prune(keep = STATES_KEPT) {
    const accessed = storage.get(ACCESSED_STORAGE_KEY) ?? {}
    const keys = storage.keys()
    const anchors = keys
      .map((key) => key.match(STATE_STORAGE_KEY_PATTERN)?.[1])
      .filter((value) => value && value !== anchor)
      .sort((left, right) => (accessed[right] ?? 0) - (accessed[left] ?? 0))
    const removed = new Set()
    for (const value of anchors.slice(keep)) {
      if (storage.get(getStateStorageKey(value))?.changed) continue
      removed.add(value)
    }
    for (const key of keys) {
      const value = key.match(/^split:([0-9a-f]{64}):/)?.[1]
      if (removed.has(value)) storage.remove(key)
    }
    // Forget removed copies as well as the ones gone some other way
    const known = new Set([anchor, ...anchors])
    const forgotten = Object.keys(accessed).filter(
      (value) => removed.has(value) || !known.has(value)
    )
    if (forgotten.length === 0) return
    forgotten.forEach((value) => delete accessed[value])
    storage.set(ACCESSED_STORAGE_KEY, accessed)
  }

  async function clone(secret) {
    const anchor = await getStorageAnchor(secret)
    storage.set(getStateStorageKey(anchor), {
      dataset: dataset.value,
      changed: Date.now()
    })
  }

  watch(
    () => blob.state.version,
    (value) => fetchLater(value ? 100 : -1)
  )

  function fetchLater(delay = 100) {
    clearTimeout(fetchTimeout)
    fetchTimeout =
      delay >= 0
        ? setTimeout(() => {
            fetchTimeout = undefined
            fetch()
          }, delay)
        : undefined
  }

  async function fetch() {
    const release = await mutex.acquire()
    try {
      const state = toRaw(blob.state)
      if (version.value === state.version) return
      merge(state.dataset)
      version.value = state.version
      save()
      triggerRef(dataset)
    } catch (err) {
      console.error('Unable to sync:', err.message)
    } finally {
      release()
    }
  }

  function deflate({ id, ...fields }) {
    const result = { id }
    Object.entries(fields).forEach(([key, { value }]) => (result[key] = value))
    return result
  }

  function collectionNameIsValid(name) {
    return collectionNameSchema.safeParse(name).success
  }

  function select(collectionName, sortFields = []) {
    return computed(() => {
      if (!collectionNameIsValid(collectionName)) return []
      const result = (dataset.value[collectionName] ?? [])
        .filter(({ removed }) => !removed)
        .map(deflate)
      sortByFields(result, sortFields)
      return result
    })
  }

  function find(collectionName, id) {
    return computed(() => {
      if (!collectionNameIsValid(collectionName)) return
      const collection = dataset.value[collectionName] ?? []
      const document = collection.find((document) => document.id === id)
      if (!document || document.removed) return
      return deflate(document)
    })
  }

  function merge(theirDataset) {
    try {
      if (!theirDataset) return
      datasetSchema.parse(theirDataset)
      Object.entries(theirDataset).forEach(([collectionName, theirCollection]) => {
        if (!collectionNameIsValid(collectionName)) return
        let ourCollection = dataset.value[collectionName]
        if (!ourCollection) {
          ourCollection = new Array()
          dataset.value[collectionName] = ourCollection
          datasetIndex[collectionName] = new Map()
        }
        const ourCollectionIndex = datasetIndex[collectionName]
        for (const { id, removed, ...theirFields } of theirCollection) {
          const ourDocument = ourCollectionIndex.get(id)
          if (!ourDocument) {
            const newDocument = removed ? { id, removed } : { id, ...theirFields }
            ourCollection.push(newDocument)
            ourCollectionIndex.set(id, newDocument)
          } else if (removed) {
            if (!ourDocument.removed) {
              Object.keys(ourDocument).forEach((key) => {
                if (key !== 'id') delete ourDocument[key]
              })
              Object.assign(ourDocument, { removed })
            }
          } else {
            Object.entries(theirFields).forEach(([key, theirField]) => {
              const ourField = ourDocument[key]
              if (!ourField) {
                ourDocument[key] = { ...theirField }
              } else if (ourField.nonce < theirField.nonce) {
                Object.assign(ourField, theirField)
              }
            })
          }
        }
      })
      fixup()
    } catch (err) {
      console.error('Unable to merge dataset:', err.message)
    }
  }

  function fixup() {
    const nonce = getNonce(blob.timestamp())
    let uncertainty = true
    while (uncertainty) {
      uncertainty = false
      // Collect broken references first and fix them afterwards, so that
      // the result doesn't depend on the documents order (e.g. for cycles)
      const fixes = []
      Object.entries(constraints ?? {}).forEach(([collectionName, rules]) => {
        const testCollection = dataset.value[collectionName]
        if (!testCollection) return
        for (let testDocument of testCollection) {
          Object.entries(rules).forEach(([fieldName, { scope, fix, flat }]) => {
            const testField = testDocument[fieldName]
            if (!testField?.value) return
            const scopeDocumentId = testField?.value
            const scopeCollectionIndex = datasetIndex[scope]
            let broken = !scopeCollectionIndex
            if (!broken) {
              const scopeDocument = scopeCollectionIndex.get(scopeDocumentId)
              broken = !scopeDocument || !!scopeDocument.removed
              if (!broken && flat) broken = !!scopeDocument[fieldName]?.value
            }
            if (broken) fixes.push({ testDocument, testField, fix })
          })
        }
      })
      for (const { testDocument, testField, fix } of fixes) {
        if (fix === 'remove') {
          if (testDocument.removed) continue
          Object.keys(testDocument).forEach((key) => {
            if (key !== 'id') delete testDocument[key]
          })
          Object.assign(testDocument, { removed: true })
          uncertainty = true
        } else if (fix === 'unset') {
          Object.assign(testField, { value: undefined, nonce })
        }
      }
    }
  }

  async function upsert(value) {
    const release = await mutex.acquire()
    try {
      const datasetUpsert = typeof value === 'function' ? value() : value
      datasetUpsertSchema.parse(datasetUpsert)
      const upsertDataset = {}
      const nonce = getNonce(blob.timestamp())
      Object.entries(datasetUpsert).forEach(([collectionName, collectionUpsert]) => {
        upsertDataset[collectionName] = collectionUpsert.map(({ id, removed, ...fields }) => {
          const result = { id: id ?? getRandomId() }
          if (removed) {
            result.removed = true
          } else {
            Object.entries(fields).forEach(([key, value]) => {
              result[key] = { value, nonce }
            })
          }
          return result
        })
      })
      merge(upsertDataset)
      changed.value = Date.now()
      save()
      triggerRef(dataset)
    } catch (err) {
      console.error('Unable to upsert:', err.message)
    } finally {
      release()
    }
  }

  function flushLater(delay = 1000) {
    clearTimeout(flushTimeout)
    flushTimeout =
      delay >= 0
        ? setTimeout(() => {
            flushTimeout = undefined
            flush()
          }, delay)
        : undefined
  }

  async function flush() {
    const release = await mutex.acquire()
    try {
      const result = await blob.update(dataset.value, version.value)
      if (result?.success) {
        version.value = result.version
        changed.value = undefined
        save()
      } else {
        // Retry soon after a version conflict, when the current blob is merged
        flushLater(result ? 500 : 3000)
      }
    } catch (err) {
      console.error('Unable to flush:', err.message)
      flushLater(3000)
    } finally {
      release()
    }
  }

  watch(changed, (value) => flushLater(value ? 500 : -1))

  const modified = computed(() => !!changed.value)

  const locals = {
    set(name, value) {
      if (!anchor) return
      const storageKey = getPropertyStorageKey(anchor, name)
      if (value) storage.set(storageKey, value)
      else storage.remove(storageKey)
    },
    get(name) {
      if (!anchor) return
      return storage.get(getPropertyStorageKey(anchor, name))
    }
  }

  return {
    clone,
    connect,
    constrain,
    find,
    locals,
    modified,
    select,
    upsert
  }
}

export function useDataset() {
  if (!context) context = useContext()
  return context
}
