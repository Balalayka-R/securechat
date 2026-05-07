import { useState } from 'react'
import { Shield, Zap, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { generateKeyPair, saveKeysToStorage, getKeyFingerprint } from '../lib/crypto'
import { generateAnonUsername, generateUserId, saveIdentity } from '../lib/identity'
import clsx from 'clsx'

export default function AuthScreen({ onAuth }) {
  const [username, setUsername] = useState(generateAnonUsername())
  const [loading, setLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [step, setStep] = useState('form')
  const [fingerprint, setFingerprint] = useState('')
  const [pendingData, setPendingData] = useState(null)

  const handleGenerate = () => {
    setUsername(generateAnonUsername())
  }

  const handleStart = async () => {
    if (!username.trim()) return
    setLoading(true)
    try {
      const userId = generateUserId()
      const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
      const fp = await getKeyFingerprint(publicKeyJwk)
      setFingerprint(fp)
      const identity = { userId, username: username.trim(), createdAt: Date.now() }
      setPendingData({ identity, publicKeyJwk, privateKeyJwk })
      setStep('fingerprint')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    const { identity, publicKeyJwk, privateKeyJwk } = pendingData
    saveKeysToStorage(publicKeyJwk, privateKeyJwk)
    saveIdentity(identity)
    onAuth(identity, { publicKeyJwk, privateKeyJwk })
  }

  if (step === 'fingerprint') {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950 p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-safe/10 border border-safe/20 mx-auto mb-6">
            <Lock className="w-8 h-8 text-safe" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Твой отпечаток ключа</h2>
          <p className="text-dark-400 text-sm text-center mb-6">
            Это уникальный идентификатор твоего шифрования. Поделись им с собеседником для проверки подлинности.
          </p>
          <div className="bg-dark-900 rounded-xl p-4 mb-6 font-mono text-xs text-safe text-center leading-relaxed break-all border border-safe/20">
            {fingerprint}
          </div>
          <div className="flex items-start gap-3 bg-accent/10 rounded-xl p-4 mb-6 border border-accent/20">
            <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-dark-300">
              Приватный ключ хранится <strong className="text-white">только на твоём устройстве</strong>. 
              Сервер никогда не видит твои сообщения.
            </p>
          </div>
          <button onClick={handleConfirm} className="btn-primary w-full text-base py-3">
            Понял, войти в чат
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 mb-4 shadow-2xl shadow-accent/20">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SecureChat</h1>
          <p className="text-dark-400 mt-2 text-sm text-center">
            Анонимный мессенджер с E2E шифрованием
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Lock, label: 'E2E шифрование', color: 'text-safe' },
            { icon: Eye, label: 'Нет слежки', color: 'text-accent-light' },
            { icon: Shield, label: 'Анонимность', color: 'text-purple-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="glass rounded-xl p-3 flex flex-col items-center gap-2 text-center">
              <Icon className={clsx('w-5 h-5', color)} />
              <span className="text-xs text-dark-300">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6">
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Псевдоним
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Введи псевдоним..."
              className="input-field"
              maxLength={32}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
            <button
              onClick={handleGenerate}
              className="btn-ghost px-3 flex-shrink-0"
              title="Сгенерировать случайный"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-2 mb-5">
            <Shield className="w-3.5 h-3.5 text-safe mt-0.5 flex-shrink-0" />
            <p className="text-xs text-dark-500">
              Без email и телефона — только псевдоним. Данные не собираются.
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={!username.trim() || loading}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Генерирую ключи...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Войти анонимно
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-dark-600 mt-4">
          Ключи шифрования генерируются локально и никогда не покидают устройство
        </p>
      </div>
    </div>
  )
}
