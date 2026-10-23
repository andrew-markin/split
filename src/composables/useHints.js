import { computed, ref } from 'vue'

import storage from '@/storage'

const HINTS_STORAGE_KEY = 'split:hints'

// Versions of the things worth seeing: a hint shows up again for everyone when
// its version changes, so bump it along with the content, e.g. the revision date
// of the privacy notice
const HINTS = {
  demo: '2026-10-24',
  privacy: '2026-10-22'
}

let context

function useContext() {
  const seen = ref(storage.get(HINTS_STORAGE_KEY) || {})

  const unseen = (name) => seen.value[name] !== HINTS[name]
  const anyUnseen = computed(() => Object.keys(HINTS).some(unseen))

  function markSeen(name) {
    if (!unseen(name)) return
    // Versions of the removed hints are dropped along the way
    const value = Object.fromEntries(
      Object.keys(HINTS)
        .filter((key) => key === name || !unseen(key))
        .map((key) => [key, HINTS[key]])
    )
    seen.value = value
    storage.set(HINTS_STORAGE_KEY, value)
  }

  return { unseen, anyUnseen, markSeen }
}

export function useHints() {
  if (!context) context = useContext()
  return context
}
