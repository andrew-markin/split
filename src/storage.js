function get(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch (err) {
    console.log('Unable to get storage value:', err.message)
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn('Unable to set storage value:', err.message)
    return false
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn('Unable to remove storage value:', err.message)
  }
}

function keys() {
  try {
    return Object.keys(localStorage)
  } catch (err) {
    console.warn('Unable to get storage keys:', err.message)
    return []
  }
}

export default { get, set, remove, keys }
