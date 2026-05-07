import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import ChatScreen from './components/ChatScreen'
import { loadIdentity } from './lib/identity'
import { loadKeysFromStorage } from './lib/crypto'

export default function App() {
  const [identity, setIdentity] = useState(null)
  const [keys, setKeys] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedIdentity = loadIdentity()
    const savedKeys = loadKeysFromStorage()
    if (savedIdentity && savedKeys) {
      setIdentity(savedIdentity)
      setKeys(savedKeys)
    }
    setLoading(false)
  }, [])

  const handleAuth = (newIdentity, newKeys) => {
    setIdentity(newIdentity)
    setKeys(newKeys)
  }

  const handleLogout = () => {
    setIdentity(null)
    setKeys(null)
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

  return <ChatScreen identity={identity} keys={keys} onLogout={handleLogout} />
}
