import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import ChatScreen from './components/ChatScreen'
import { loadIdentity } from './lib/identity'
import { loadKeysFromStorage } from './lib/crypto'
import { clearAllData } from './lib/storage'

export default function App() {
  const [identity, setIdentity] = useState(null)
  const [keys, setKeys] = useState(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedIdentity = loadIdentity()
    const savedKeys = loadKeysFromStorage()
    if (savedIdentity && savedKeys && savedIdentity.password) {
      setIdentity(savedIdentity)
      setKeys(savedKeys)
      setPassword(savedIdentity.password)
    }
    setLoading(false)
  }, [])

  const handleAuth = (newIdentity, newKeys, newPassword) => {
    setIdentity(newIdentity)
    setKeys(newKeys)
    setPassword(newPassword)
  }

  const handleLogout = async () => {
    await clearAllData()
    setIdentity(null)
    setKeys(null)
    setPassword('')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!identity || !keys) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return <ChatScreen identity={identity} keys={keys} onLogout={handleLogout} password={password} />
}
