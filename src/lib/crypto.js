/**
 * SecureChat E2E Encryption Module
 * Uses Web Crypto API — keys NEVER leave the device
 * Algorithm: ECDH (key exchange) + AES-GCM (message encryption)
 */

const ECDH_PARAMS = { name: 'ECDH', namedCurve: 'P-256' }
const AES_PARAMS = { name: 'AES-GCM', length: 256 }

/**
 * Generate a new ECDH key pair for the user
 * Private key stays on device, public key is shared
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    ECDH_PARAMS,
    true,
    ['deriveKey']
  )

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

  return { publicKeyJwk, privateKeyJwk }
}

/**
 * Derive a shared AES key from our private key + their public key
 * Both parties derive the same key — this is ECDH magic
 */
export async function deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk) {
  const myPrivateKey = await crypto.subtle.importKey(
    'jwk',
    myPrivateKeyJwk,
    ECDH_PARAMS,
    false,
    ['deriveKey']
  )

  const theirPublicKey = await crypto.subtle.importKey(
    'jwk',
    theirPublicKeyJwk,
    ECDH_PARAMS,
    false,
    []
  )

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt']
  )

  return sharedKey
}

/**
 * Encrypt a message with AES-GCM
 * Returns base64-encoded: IV (12 bytes) + ciphertext
 */
export async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  )

  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a message with AES-GCM
 */
export async function decryptMessage(sharedKey, encryptedBase64) {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Generate a fingerprint from a public key (for identity verification)
 */
export async function getKeyFingerprint(publicKeyJwk) {
  const data = new TextEncoder().encode(JSON.stringify(publicKeyJwk))
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.match(/.{4}/g).join(' ').toUpperCase()
}

/**
 * Save keys to localStorage (encrypted by user passphrase in future)
 */
export function saveKeysToStorage(publicKeyJwk, privateKeyJwk) {
  localStorage.setItem('sc_pub', JSON.stringify(publicKeyJwk))
  localStorage.setItem('sc_priv', JSON.stringify(privateKeyJwk))
}

export function loadKeysFromStorage() {
  const pub = localStorage.getItem('sc_pub')
  const priv = localStorage.getItem('sc_priv')
  if (!pub || !priv) return null
  return {
    publicKeyJwk: JSON.parse(pub),
    privateKeyJwk: JSON.parse(priv)
  }
}

export function clearKeys() {
  localStorage.removeItem('sc_pub')
  localStorage.removeItem('sc_priv')
}
