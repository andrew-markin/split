import { gunzip, gzip } from 'fflate'

const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const base62Map = new Map(Array.from(base62).map((char, code) => [char, code]))

const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function getKeyFromSecret(secret) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function getRandomBase62Key(length) {
  const randomInts = Array.from(crypto.getRandomValues(new Uint32Array(length)))
  return randomInts.map((int) => base62[int % 62]).join('')
}

function getKeyChecksum(key) {
  let result = 0
  for (let i = 0; i < key.length; i++) {
    result += base62Map.get(key[i]) || 0
  }
  return result % 62
}

export function getRandomSecret(version = 2) {
  const key = getRandomBase62Key(43)
  const signature = (getKeyChecksum(key) + version) % 62
  return key + base62[signature]
}

export function getSecretVersion(secret) {
  if (secret?.length !== 44) return
  const key = secret.slice(0, -1)
  const signature = secret.slice(-1)
  return ((base62Map.get(signature) || 0) + 62 - getKeyChecksum(key)) % 62
}

export function getRandomId() {
  return getRandomBase62Key(22)
}

export async function getHashedId(text) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  const hashHex = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
  let hashBigInt = BigInt('0x' + hashHex)
  let base62Chars = []
  while (hashBigInt > 0n) {
    base62Chars.push(base62[Number(hashBigInt % 62n)])
    hashBigInt = hashBigInt / 62n
  }
  return base62Chars.reverse().join('').padStart(22, '0').slice(0, 22)
}

export async function getComposedId(...parts) {
  const joined = parts
    .map((part) => String(part))
    .sort()
    .join('\n')
  return getHashedId(joined)
}

function encodeBase62(value) {
  if (value === 0) return '0'
  let result = []
  while (value > 0) {
    const remainder = value % 62
    result.push(base62[remainder])
    value = Math.floor(value / 62)
  }
  return result.reverse().join('')
}

function decodeBase62(text) {
  let result = 0
  for (const char of text) result = result * 62 + base62Map.get(char)
  return result
}

// Nonces are 28 characters long and ordered by their creation time first:
// 7 characters of the timestamp in milliseconds and 21 random ones. Nonces
// of older versions have the timestamp in seconds in their first 6
// characters, which start with a digit, and so are less than the current ones.
export function getNonce(timestamp = Date.now()) {
  // Timestamps in seconds would make nonces looking like the ones of older
  // versions and ordered before all other ones, so changes would be lost
  if (!(timestamp >= 1e12)) throw new Error(`Invalid nonce timestamp: ${timestamp}`)
  return encodeBase62(timestamp).padStart(7, '0') + getRandomBase62Key(21)
}

export function getNonceTimestamp(nonce) {
  if (/^[0-9]/.test(nonce)) return decodeBase62(nonce.slice(0, 6)) * 1000
  return decodeBase62(nonce.slice(0, 7))
}

export async function getCipher(secret, ...salts) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  )
  const message = encoder.encode(salts.join('\n'))
  const signature = await crypto.subtle.sign('HMAC', key, message)
  const signatureBytes = Array.from(new Uint8Array(signature))
  return Array.from(signatureBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Uint8Array.prototype.toBase64 and Uint8Array.fromBase64 are not supported
// by older browsers, so fall back to btoa and atob
function bytesToBase64(bytes) {
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64()
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(base64) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(base64)
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

export async function packValue(data, secret) {
  const stringified = JSON.stringify(data)
  const compressed = await new Promise((resolve, reject) => {
    gzip(encoder.encode(stringified), (err, result) => (err ? reject(err) : resolve(result)))
  })
  const key = await getKeyFromSecret(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return bytesToBase64(combined)
}

export async function unpackValue(data, secret) {
  const combined = base64ToBytes(data)
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  const key = await getKeyFromSecret(secret)
  const compressed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  const decompressed = await new Promise((resolve, reject) => {
    gunzip(new Uint8Array(compressed), (err, result) => (err ? reject(err) : resolve(result)))
  })
  const stringified = decoder.decode(decompressed)
  return JSON.parse(stringified)
}

export function sortByFields(items, fields = []) {
  if (fields.length === 0) return
  items.sort((left, right) => {
    for (const field of fields) {
      const result = String(left[field]).localeCompare(String(right[field]))
      if (result !== 0) return result
    }
    return 0
  })
}
