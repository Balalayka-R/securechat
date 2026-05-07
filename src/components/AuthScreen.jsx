import { useState } from 'react'
import { Shield, Zap, Lock, Eye, EyeOff, RefreshCw, Key, Copy, Check } from 'lucide-react'
import { generateKeyPair, saveKeysToStorage, getKeyFingerprint } from '../lib/crypto'
import { generateAnonUsername, generateUserId, saveIdentity } from '../lib/identity'
import { clearAllData } from '../lib/storage'
import clsx from 'clsx'

export default function AuthScreen({ onAuth }) {
  const [username, setUsername] = useState(generateAnonUsername())
  const [loading, setLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [step, setStep] = useState('form')
  const [fingerprint, setFingerprint] = useState('')
  const [pendingData, setPendingData] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)

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
    saveIdentity({ ...identity, password }) // Save password with identity for auto-decrypt
    onAuth(identity, { publicKeyJwk, privateKeyJwk }, password)
  }

  const generatePassword = () => {
    const words = ['alpha', 'beta', 'gamma', 'delta', 'echo', 'fox', 'ghost', 'hydra', 'iris', 'jade']
    const nums = Math.floor(1000 + Math.random() * 9000)
    const word1 = words[Math.floor(Math.random() * words.length)]
    const word2 = words[Math.floor(Math.random() * words.length)]
    return `${word1}-${word2}-${nums}`
  }

  if (step === 'fingerprint') {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950 p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-md animate-slide-up">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-safe/10 border border-safe/20 mx-auto mb-6">
            <Lock className="w-8 h-8 text-safe" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Твой отпечаток ключа</h2>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Ваш ключ готов</h2>
            <p className="text-sm text-dark-400">Запишите пароль — без него сообщения не восстановить</p>
          </div>

          {!password && (
            <button
              onClick={() => setPassword(generatePassword())}
              className="w-full mb-4 py-3 px-4 bg-dark-800 hover:bg-dark-700 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Key className="w-4 h-4" />
              Сгенерировать пароль для шифрования
            </button>
          )}

          {password && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-accent font-medium">Пароль шифрования</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(password)
                    setPasswordCopied(true)
                    setTimeout(() => setPasswordCopied(false), 2000)
                  }}
                  className="p-1.5 rounded hover:bg-dark-800 transition-colors"
                >
                  {passwordCopied ? <Check className="w-3.5 h-3.5 text-safe" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                </button>
              </div>
              <p className="font-mono text-sm text-white break-all">{password}</p>
              <p className="text-xs text-dark-500 mt-2">⚠️ Сохраните этот пароль! Без него нельзя прочитать историю сообщений.</p>
            </div>
          )}

          <div className="bg-dark-900 rounded-xl p-4 mb-6 border border-dark-700">
            <p className="text-xs text-dark-500 mb-2 text-center">Отпечаток ключа E2E</p>
            <p className="font-mono text-xs text-safe break-all text-center leading-relaxed">
              {fingerprint}
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
