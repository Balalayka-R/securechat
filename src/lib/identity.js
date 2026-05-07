/**
 * Anonymous identity management
 * No email, no phone — just a random ID + display name
 */

const ADJECTIVES = [
  'Silent', 'Shadow', 'Ghost', 'Cipher', 'Phantom', 'Stealth',
  'Dark', 'Void', 'Null', 'Anon', 'Masked', 'Hidden', 'Covert',
  'Secret', 'Unseen', 'Veiled', 'Cloaked', 'Mystic', 'Cryptic'
]

const NOUNS = [
  'Fox', 'Wolf', 'Raven', 'Hawk', 'Lynx', 'Viper', 'Falcon',
  'Panther', 'Cobra', 'Eagle', 'Jaguar', 'Puma', 'Shark', 'Bear',
  'Tiger', 'Dragon', 'Phoenix', 'Hydra', 'Sphinx', 'Wraith'
]

export function generateAnonUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}${num}`
}

export function generateUserId() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function saveIdentity(identity) {
  localStorage.setItem('sc_identity', JSON.stringify(identity))
}

export function loadIdentity() {
  const raw = localStorage.getItem('sc_identity')
  if (!raw) return null
  return JSON.parse(raw)
}

export function clearIdentity() {
  localStorage.removeItem('sc_identity')
}

export function getAvatarColor(userId) {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f59e0b', '#10b981', '#3b82f6', '#ef4444'
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(username) {
  return username.slice(0, 2).toUpperCase()
}
