import { nextTick, ref } from 'vue'

let context

function useContext() {
  const message = ref('')
  let clearTimer = undefined

  // The message is reset first, so screen readers announce the same text again
  async function announce(text) {
    message.value = ''
    await nextTick()
    message.value = text
    clearTimeout(clearTimer)
    clearTimer = setTimeout(() => (message.value = ''), 5000)
  }

  return { message, announce }
}

export function useAnnouncer() {
  if (!context) context = useContext()
  return context
}
