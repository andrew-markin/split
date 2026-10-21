import { Mutex } from 'async-mutex'
import { computed, ref, shallowRef, toRaw, triggerRef, watch } from 'vue'
import * as z from 'zod'

import database from '@/database'
import storage from '@/storage'
import {
  getCipher,
  getDerivedKey,
  getNonce,
  getNonceTimestamp,
  getRandomId,
  packBytes,
  sortByFields,
  unpackBytes
} from '@/utils'

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

// Local copies of the most recently opened splits kept in the database
const STATES_KEPT = 50
// Local copies kept when the storage is full
const STATES_KEPT_ON_OVERFLOW = 5

// Older versions kept local copies unencrypted in the local storage
const LEGACY_ACCESSED_STORAGE_KEY = 'split:accessed'
const LEGACY_STATE_STORAGE_KEY_PATTERN = /^split:([0-9a-f]{64}):state$/
const LEGACY_STORAGE_KEY_PATTERN = /^split:([0-9a-f]{64}):/

const getLegacyStateStorageKey = (anchor) => `split:${anchor}:state`
const getLegacyPropertyStorageKeyPrefix = (anchor) => `split:${anchor}:property:`

let context

function useContext() {
  const mutex = new Mutex()

  let constraints = undefined
  let anchor = undefined
  let key = undefined
  let properties = {}

  // Local copies are written one after another in order of the changes
  let saving = Promise.resolve()

  const dataset = shallowRef({})
  const version = ref(undefined)
  const changed = ref(undefined)

  let datasetIndex = {}
  let fetchTimeout = undefined
  let flushTimeout = undefined

  const blob = useBlob()

  // The latest timestamp of the nonces generated or seen. New nonces are always
  // later, so that a change made after seeing a value always overrides it,
  // even when both are made within the same millisecond or the clocks differ.
  let clock = 0

  function observe(nonce) {
    const timestamp = getNonceTimestamp(nonce)
    if (timestamp > clock) clock = timestamp
  }

  function nextNonce() {
    clock = Math.max(blob.timestamp(), clock + 1)
    return getNonce(clock)
  }

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

  async function getStorageKey(secret) {
    return await getDerivedKey(secret, CIPHER_SALT, 'STORAGE_KEY')
  }

  async function connect(secret) {
    const release = await mutex.acquire()
    try {
      const nextAnchor = await getStorageAnchor(secret)
      const nextKey = await getStorageKey(secret)
      // Finish writing the local copy of the previous split
      await saving
      anchor = nextAnchor
      key = nextKey
      properties = {}
      changed.value = undefined
      version.value = undefined
      dataset.value = {}
      datasetIndex = {}
      const legacy = takeLegacyState()
      dropLegacyStates()
      await database.touch(anchor)
      await database.prune(STATES_KEPT, anchor)
      const state = await load()
      // Both copies may have changes, which are merged as the remote ones
      merge(state?.dataset)
      merge(legacy?.dataset)
      version.value = state ? state.version : legacy?.version
      changed.value = Math.max(state?.changed ?? 0, legacy?.changed ?? 0) || undefined
      properties = { ...legacy?.properties, ...state?.properties }
      triggerRef(dataset)
      if (legacy && (await save())) dropLegacyState(anchor)
      await blob.connect({ secret })
    } catch (err) {
      console.warn('Unable to connect the dataset:', err.message)
    } finally {
      release()
    }
  }

  async function load() {
    try {
      const data = await database.getState(anchor)
      if (data) return await unpackBytes(data, key, anchor)
    } catch (err) {
      console.warn('Unable to load the split locally:', err.message)
    }
  }

  async function store(anchor, key, state) {
    try {
      if (!(await database.available())) return false
      const data = await packBytes(state, key, anchor)
      const dirty = !!state.changed
      if (await database.setState(anchor, data, dirty)) return true
      // The storage is probably full, so drop older local copies and retry
      await database.prune(STATES_KEPT_ON_OVERFLOW, anchor)
      if (await database.setState(anchor, data, dirty)) return true
    } catch (err) {
      console.warn('Unable to pack the split:', err.message)
    }
    console.error('Unable to save the split locally')
    return false
  }

  // The state is taken when the write starts, so the latest write always has
  // the latest state, even when the previous ones are not finished yet
  function save() {
    if (!anchor) return Promise.resolve(false)
    const target = anchor
    const result = saving.then(() => {
      if (target !== anchor) return false
      const state = {
        dataset: dataset.value,
        version: version.value,
        changed: changed.value,
        properties
      }
      return store(anchor, key, state)
    })
    saving = result
    return result
  }

  // Older versions kept the properties in separate keys of the local storage
  function takeLegacyState() {
    const state = storage.get(getLegacyStateStorageKey(anchor))
    if (!state) return
    const prefix = getLegacyPropertyStorageKeyPrefix(anchor)
    const properties = {}
    for (const key of storage.keys()) {
      if (key.startsWith(prefix)) properties[key.slice(prefix.length)] = storage.get(key)
    }
    return { ...state, properties }
  }

  function dropLegacyState(value) {
    for (const key of storage.keys()) {
      if (key.match(LEGACY_STORAGE_KEY_PATTERN)?.[1] === value) storage.remove(key)
    }
  }

  // Drop unencrypted local copies of other splits, except the ones having
  // changes not synchronized yet, which are moved once their splits are opened
  function dropLegacyStates() {
    const keys = storage.keys()
    const kept = new Set([anchor])
    for (const key of keys) {
      const value = key.match(LEGACY_STATE_STORAGE_KEY_PATTERN)?.[1]
      if (value && storage.get(key)?.changed) kept.add(value)
    }
    for (const key of keys) {
      const value = key.match(LEGACY_STORAGE_KEY_PATTERN)?.[1]
      if (value && !kept.has(value)) storage.remove(key)
    }
    storage.remove(LEGACY_ACCESSED_STORAGE_KEY)
  }

  async function clone(secret) {
    const anchor = await getStorageAnchor(secret)
    const key = await getStorageKey(secret)
    await store(anchor, key, { dataset: dataset.value, changed: Date.now() })
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
      for (const collection of Object.values(theirDataset)) {
        for (const document of collection) {
          for (const [key, field] of Object.entries(document)) {
            if (key !== 'id' && key !== 'removed') observe(field.nonce)
          }
        }
      }
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
    const nonce = nextNonce()
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
      const nonce = nextNonce()
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
      if (value) properties[name] = value
      else delete properties[name]
      save()
    },
    get(name) {
      if (!anchor) return
      return properties[name]
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
