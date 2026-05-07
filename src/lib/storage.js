/**
 * SecureChat Local Storage
 * All data encrypted with user's master key before storage
 * Uses IndexedDB for persistence
 */

const DB_NAME = 'securechat_v1'
const DB_VERSION = 1

// Master key derivation from recovery phrase (or session key)
async function getMasterKey(password) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('securechat_salt_2024'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data before storing
async function encryptData(data, masterKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoded
  )
  
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

// Decrypt data from storage
async function decryptData(encryptedBase64, masterKey) {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    ciphertext
  )
  
  return JSON.parse(new TextDecoder().decode(decrypted))
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Store encrypted message history per chat
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'chatId' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      // Store contacts with public keys
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'userId' })
      }
      
      // Store encrypted settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    }
  })
}

// Save messages for a chat
export async function saveMessages(chatId, messages, password) {
  const db = await openDB()
  const masterKey = await getMasterKey(password)
  const encrypted = await encryptData(messages, masterKey)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite')
    const store = tx.objectStore('messages')
    const request = store.put({ chatId, encrypted, timestamp: Date.now() })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Load messages for a chat
export async function loadMessages(chatId, password) {
  const db = await openDB()
  const masterKey = await getMasterKey(password)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly')
    const store = tx.objectStore('messages')
    const request = store.get(chatId)
    
    request.onsuccess = async () => {
      if (!request.result) return resolve([])
      try {
        const messages = await decryptData(request.result.encrypted, masterKey)
        resolve(messages)
      } catch {
        resolve([]) // Decryption failed (wrong password)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

// Save contact
export async function saveContact(contact, password) {
  const db = await openDB()
  const masterKey = await getMasterKey(password)
  const encrypted = await encryptData(contact, masterKey)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readwrite')
    const store = tx.objectStore('contacts')
    const request = store.put({ userId: contact.userId, encrypted })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Load all contacts
export async function loadContacts(password) {
  const db = await openDB()
  const masterKey = await getMasterKey(password)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readonly')
    const store = tx.objectStore('contacts')
    const request = store.getAll()
    
    request.onsuccess = async () => {
      const contacts = []
      for (const item of request.result) {
        try {
          const contact = await decryptData(item.encrypted, masterKey)
          contacts.push(contact)
        } catch {
          // Skip corrupted/decryption failed
        }
      }
      resolve(contacts)
    }
    request.onerror = () => reject(request.error)
  })
}

// Clear all data on logout
export async function clearAllData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
