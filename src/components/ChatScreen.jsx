import { useState, useEffect, useRef } from 'react'
import { Shield, Send, Plus, LogOut, Users, Lock, Wifi, WifiOff, Search, X, Info, Copy, Link2, UserPlus, Check, Smile, Forward } from 'lucide-react'
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket'
import { deriveSharedKey, encryptMessage, decryptMessage, getKeyFingerprint } from '../lib/crypto'
import { clearKeys } from '../lib/crypto'
import { clearIdentity, getAvatarColor, getInitials, loadIdentity } from '../lib/identity'
import { saveMessages, loadMessages, saveContact, loadContacts, clearAllData } from '../lib/storage'
import ContactAvatar from './ContactAvatar'
import MessageBubble from './MessageBubble'
import EmojiPicker from './EmojiPicker'
import clsx from 'clsx'

export default function ChatScreen({ identity, keys, onLogout, password }) {
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [chats, setChats] = useState({})
  const [sharedKeys, setSharedKeys] = useState({})
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [showInvite, setShowInvite] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false)
  const [connectId, setConnectId] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [messageStatus, setMessageStatus] = useState({})
  const [replyTo, setReplyTo] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [forwardMessage, setForwardMessage] = useState(null)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Socket connection effect - always runs
  useEffect(() => {
    const socket = connectSocket(identity.userId, identity.username, keys.publicKeyJwk)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    
    // Typing indicators
    socket.on('typing:start', ({ from }) => {
      setTypingUsers(prev => ({ ...prev, [from]: true }))
    })
    
    socket.on('typing:stop', ({ from }) => {
      setTypingUsers(prev => ({ ...prev, [from]: false }))
    })
    
    // Delivery and read receipts
    socket.on('msg:delivered', ({ timestamp }) => {
      setMessageStatus(prev => ({ ...prev, [timestamp]: 'delivered' }))
    })
    
    socket.on('msg:read', ({ messageIds }) => {
      setMessageStatus(prev => {
        const updated = { ...prev }
        messageIds.forEach(id => { updated[id] = 'read' })
        return updated
      })
    })
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }

    socket.on('users:online', (users) => {
      setOnlineUsers(users.filter(u => u.userId !== identity.userId))
    })

    socket.on('user:joined', (user) => {
      if (user.userId === identity.userId) return
      setOnlineUsers(prev => {
        if (prev.find(u => u.userId === user.userId)) return prev
        return [...prev, user]
      })
    })

    socket.on('user:left', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId))
    })

    socket.on('msg:receive', async ({ from, fromUsername, encryptedText, publicKey, timestamp }) => {
      if (from === identity.userId) return
      try {
        let sk = sharedKeys[from]
        if (!sk) {
          const theirPubKey = JSON.parse(publicKey)
          sk = await deriveSharedKey(keys.privateKeyJwk, theirPubKey)
          setSharedKeys(prev => ({ ...prev, [from]: sk }))
        }
        const text = await decryptMessage(sk, encryptedText)
        const msg = { id: Date.now(), from, fromUsername, text, timestamp, mine: false }
        setChats(prev => {
          const updated = {
            ...prev,
            [from]: {
              userId: from,
              username: fromUsername,
              publicKey,
              messages: [...(prev[from]?.messages || []), msg]
            }
          }
          // Save messages asynchronously
          saveMessages(from, updated[from].messages, password).catch(console.error)
          return updated
        })
        
        // Show notification if app not focused
        if (document.hidden && Notification.permission === 'granted') {
          new Notification('SecureChat', {
            body: `Новое сообщение от ${fromUsername}`,
            icon: '/icon-192.png',
            tag: from
          })
        }
      } catch (e) {
        console.error('Decrypt error:', e)
      }
    })

    socket.on('user:found', async (user) => {
      if (user.userId === identity.userId) return
      setOnlineUsers(prev => {
        if (prev.find(u => u.userId === user.userId)) return prev
        return [...prev, user]
      })
      await openChat(user)
    })

    socket.on('user:notfound', ({ targetId }) => {
      alert(`Пользователь ${targetId.slice(0, 8)}... не найден (офлайн)`)
    })

    const urlParams = new URLSearchParams(window.location.search)
    const connectId = urlParams.get('connect')
    if (connectId) {
      socket.emit('user:request', { targetId: connectId })
      window.history.replaceState({}, '', window.location.pathname)
    }

    return () => disconnectSocket()
  }, [])

  // Load saved data effect - only when password available
  useEffect(() => {
    if (!password) return
    
    const loadSavedData = async () => {
      try {
        const savedContacts = await loadContacts(password)
        if (savedContacts.length > 0) {
          setOnlineUsers(prev => {
            // Merge with existing to avoid duplicates
            const existing = new Set(prev.map(u => u.userId))
            const newContacts = savedContacts.filter(c => !existing.has(c.userId))
            return [...prev, ...newContacts]
          })
        }
        
        for (const contact of savedContacts) {
          const savedMessages = await loadMessages(contact.userId, password)
          if (savedMessages.length > 0) {
            setChats(prev => ({
              ...prev,
              [contact.userId]: {
                userId: contact.userId,
                username: contact.username,
                publicKey: contact.publicKey,
                messages: savedMessages
              }
            }))
          }
        }
      } catch (e) {
        console.error('Failed to load saved data:', e)
      }
    }
    loadSavedData()
  }, [password])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, activeChat])

  const openChat = async (user) => {
    if (!sharedKeys[user.userId]) {
      try {
        const theirPubKey = JSON.parse(user.publicKey)
        const sk = await deriveSharedKey(keys.privateKeyJwk, theirPubKey)
        setSharedKeys(prev => ({ ...prev, [user.userId]: sk }))
      } catch (e) {
        console.error('Key derivation error:', e)
      }
    }
    setActiveChat(user)
    setMobileView('chat')
    setTimeout(() => inputRef.current?.focus(), 100)
    
    // Save contact to storage
    await saveContact(user, password)
    
    // Send read receipts for unread messages
    const socket = getSocket()
    const chatMessages = chats[user.userId]?.messages || []
    const unreadIds = chatMessages
      .filter(m => !m.mine && !m.read)
      .map(m => m.id)
    
    if (unreadIds.length > 0 && socket?.connected) {
      socket.emit('msg:read', { messageIds: unreadIds, to: user.userId })
      // Mark as read locally
      setChats(prev => ({
        ...prev,
        [user.userId]: {
          ...prev[user.userId],
          messages: chatMessages.map(m => 
            unreadIds.includes(m.id) ? { ...m, read: true } : m
          )
        }
      }))
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat) return
    const socket = getSocket()
    if (!socket?.connected) return

    const sk = sharedKeys[activeChat.userId]
    if (!sk) return

    try {
      const encrypted = await encryptMessage(sk, inputText.trim())
      const timestamp = Date.now()
      const msg = {
        id: timestamp.toString(),
        from: identity.userId,
        fromUsername: identity.username,
        text: inputText.trim(),
        timestamp,
        mine: true
      }

      // Stop typing when sending
      socket.emit('typing:stop', { to: activeChat.userId })
      
      const msgData = {
        to: activeChat.userId,
        encryptedText: encrypted,
        publicKey: JSON.stringify(keys.publicKeyJwk),
        timestamp: msg.timestamp
      }
      
      // Add reply reference if exists
      if (replyTo) {
        msgData.replyTo = {
          id: replyTo.id,
          text: replyTo.text.slice(0, 100), // Preview only
          fromUsername: replyTo.fromUsername
        }
        msg.replyTo = msgData.replyTo
      }
      
      socket.emit('msg:send', msgData)

      setChats(prev => {
        const updated = {
          ...prev,
          [activeChat.userId]: {
            userId: activeChat.userId,
            username: activeChat.username,
            publicKey: activeChat.publicKey,
            messages: [...(prev[activeChat.userId]?.messages || []), msg]
          }
        }
        saveMessages(activeChat.userId, updated[activeChat.userId].messages, password).catch(console.error)
        return updated
      })
      setInputText('')
      setReplyTo(null) // Clear reply after sending
    } catch (e) {
      console.error('Send error:', e)
    }
  }
  
  const deleteMessage = (messageId) => {
    if (!activeChat) return
    
    setChats(prev => {
      const updatedMessages = prev[activeChat.userId]?.messages?.map(m => 
        m.id === messageId ? { ...m, deleted: true, text: 'Сообщение удалено' } : m
      ) || []
      
      const updated = {
        ...prev,
        [activeChat.userId]: {
          ...prev[activeChat.userId],
          messages: updatedMessages
        }
      }
      saveMessages(activeChat.userId, updatedMessages, password).catch(console.error)
      return updated
    })
    setSelectedMessage(null)
  }
  
  const handleReply = (message) => {
    setReplyTo(message)
    inputRef.current?.focus()
  }
  
  const cancelReply = () => {
    setReplyTo(null)
  }
  
  const handleInputChange = (e) => {
    setInputText(e.target.value)
    
    if (!activeChat) return
    const socket = getSocket()
    if (!socket?.connected) return
    
    // Send typing:start
    socket.emit('typing:start', { to: activeChat.userId })
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Send typing:stop after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { to: activeChat.userId })
    }, 3000)
  }

  const handleLogout = () => {
    disconnectSocket()
    clearKeys()
    clearIdentity()
    onLogout()
  }
  
  const handleMessageAction = (action, message) => {
    if (action === 'delete') {
      deleteMessage(message.id)
    } else if (action === 'reply') {
      handleReply(message)
    } else if (action === 'forward') {
      setForwardMessage(message)
      setShowForwardModal(true)
    }
    setSelectedMessage(null)
  }
  
  const handleForward = async (targetUser) => {
    if (!forwardMessage || !targetUser) return
    
    const socket = getSocket()
    if (!socket?.connected) return
    
    // Get or create shared key
    let sk = sharedKeys[targetUser.userId]
    if (!sk) {
      try {
        const theirPubKey = JSON.parse(targetUser.publicKey)
        sk = await deriveSharedKey(keys.privateKeyJwk, theirPubKey)
        setSharedKeys(prev => ({ ...prev, [targetUser.userId]: sk }))
      } catch (e) {
        console.error('Key derivation error:', e)
        return
      }
    }
    
    try {
      const encrypted = await encryptMessage(sk, `Переслано:\n${forwardMessage.text}`)
      const timestamp = Date.now()
      
      socket.emit('msg:send', {
        to: targetUser.userId,
        encryptedText: encrypted,
        publicKey: JSON.stringify(keys.publicKeyJwk),
        timestamp
      })
      
      // Add to chat history
      const msg = {
        id: timestamp.toString(),
        from: identity.userId,
        fromUsername: identity.username,
        text: `Переслано:\n${forwardMessage.text}`,
        timestamp,
        mine: true,
        forwarded: true
      }
      
      setChats(prev => {
        const updated = {
          ...prev,
          [targetUser.userId]: {
            userId: targetUser.userId,
            username: targetUser.username,
            publicKey: targetUser.publicKey,
            messages: [...(prev[targetUser.userId]?.messages || []), msg]
          }
        }
        saveMessages(targetUser.userId, updated[targetUser.userId].messages, password).catch(console.error)
        return updated
      })
    } catch (e) {
      console.error('Forward error:', e)
    }
    
    setForwardMessage(null)
    setShowForwardModal(false)
  }
  
  const handleEmojiSelect = (emoji) => {
    setInputText(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const filteredUsers = onlineUsers.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen flex bg-dark-950 overflow-hidden">
      {/* Sidebar - optimized for mobile */}
      <div className={clsx(
        'w-full md:w-80 border-r border-dark-800 flex flex-col bg-dark-950 h-screen md:h-auto',
        mobileView === 'chat' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <span className="font-bold text-sm">SecureChat</span>
              <div className={clsx(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                connected ? 'bg-safe/10 text-safe' : 'bg-danger/10 text-danger'
              )}>
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? 'Online' : 'Offline'}
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost p-2" title="Выйти">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* My identity */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
            <ContactAvatar username={identity.username} userId={identity.userId} size="md" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{identity.username}</p>
              <p className="text-xs text-dark-500">Ты</p>
            </div>
            <button onClick={() => setShowInvite(!showInvite)} className="ml-auto p-1.5 rounded-lg hover:bg-dark-700 transition-colors" title="Пригласить">
              <UserPlus className="w-4 h-4 text-accent" />
            </button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors">
              <Info className="w-4 h-4 text-dark-400" />
            </button>
          </div>

          {showInvite && (
            <div className="mt-2 p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs animate-fade-in">
              <p className="text-dark-300 font-medium mb-2 flex items-center gap-1">
                <Link2 className="w-3 h-3 text-accent" /> Пригласить по ID
              </p>
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 bg-dark-900 rounded px-2 py-1 font-mono text-dark-200 text-[10px] break-all">
                  {identity.userId}
                </code>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}?connect=${identity.userId}`
                    navigator.clipboard.writeText(link)
                    setInviteLinkCopied(true)
                    setTimeout(() => setInviteLinkCopied(false), 2000)
                  }}
                  className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 transition-colors"
                  title="Копировать ссылку"
                >
                  {inviteLinkCopied ? <Check className="w-3 h-3 text-safe" /> : <Copy className="w-3 h-3 text-dark-400" />}
                </button>
              </div>
              <div className="border-t border-dark-700/50 pt-2 mt-2">
                <p className="text-dark-400 mb-1.5">Подключиться по ID:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={connectId}
                    onChange={e => setConnectId(e.target.value)}
                    placeholder="Вставь ID друга..."
                    className="flex-1 bg-dark-900 border border-dark-700 rounded px-2 py-1 text-xs outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={() => {
                      if (connectId.trim()) {
                        const socket = getSocket()
                        socket?.emit('user:request', { targetId: connectId.trim() })
                        setConnectId('')
                      }
                    }}
                    className="px-2 py-1 bg-accent hover:bg-accent-hover rounded text-white text-xs font-medium transition-colors"
                  >
                    Найти
                  </button>
                </div>
              </div>
            </div>
          )}
          {showInfo && (
            <div className="mt-2 p-3 rounded-xl bg-dark-900 border border-dark-700 text-xs text-dark-400 animate-fade-in">
              <p className="text-dark-300 font-medium mb-1">ID: <span className="font-mono text-dark-500">{identity.userId.slice(0, 16)}...</span></p>
              <p className="text-safe flex items-center gap-1"><Lock className="w-3 h-3" /> E2E ключи сгенерированы локально</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-dark-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск пользователей..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        </div>

        {/* Online users */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-dark-500" />
            <span className="text-xs text-dark-500 font-medium">
              Онлайн ({filteredUsers.length})
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-dark-600" />
              </div>
              <p className="text-dark-500 text-sm">
                {connected ? 'Нет пользователей онлайн' : 'Подключение...'}
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {filteredUsers.map(user => {
                const hasUnread = chats[user.userId]?.messages?.some(m => !m.mine && !m.read)
                const lastMsg = chats[user.userId]?.messages?.slice(-1)[0]
                return (
                  <button
                    key={user.userId}
                    onClick={() => openChat(user)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 text-left',
                      activeChat?.userId === user.userId
                        ? 'bg-accent/10 border border-accent/20'
                        : 'hover:bg-dark-800/50'
                    )}
                  >
                    <div className="relative">
                      <ContactAvatar username={user.username} userId={user.userId} size="md" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-safe rounded-full border-2 border-dark-950" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{user.username}</p>
                        {lastMsg && (
                          <span className="text-xs text-dark-600 flex-shrink-0">
                            {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-dark-500 truncate">
                        {lastMsg ? (lastMsg.mine ? `Ты: ${lastMsg.text}` : lastMsg.text) : 'Нажми чтобы написать'}
                      </p>
                    </div>
                    {hasUnread && (
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={clsx(
        'flex-1 flex flex-col h-screen md:h-auto',
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      )}>
        {activeChat ? (
          <>
            {/* Chat header - Telegram style */}
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-dark-800 bg-dark-900/95 backdrop-blur-md sticky top-0 z-20">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 -ml-2 rounded-full hover:bg-dark-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative flex-shrink-0">
                <ContactAvatar username={activeChat.username} userId={activeChat.userId} size="md" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-safe rounded-full border-2 border-dark-900" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{activeChat.username}</p>
                {typingUsers[activeChat.userId] ? (
                  <p className="text-xs text-accent flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    печатает...
                  </p>
                ) : (
                  <p className="text-xs text-safe flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-safe" />
                    онлайн
                  </p>
                )}
              </div>
              <button className="p-2 rounded-full hover:bg-dark-800 transition-colors">
                <Info className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            {/* Messages - Telegram style (fixed input, scrollable area) */}
            <div 
              className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              {(() => {
                const messages = chats[activeChat.userId]?.messages || []
                if (messages.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Lock className="w-7 h-7 text-accent" />
                      </div>
                      <div>
                        <p className="font-semibold text-dark-300 text-sm">Чат защищён</p>
                        <p className="text-xs text-dark-500 mt-1 px-4">
                          Сообщения шифруются на ваших устройствах. Ни сервер, ни третьи лица не могут их прочитать.
                        </p>
                      </div>
                    </div>
                  )
                }
                return messages.map((msg, i) => {
                  const prev = messages[i - 1]
                  const showTime = !prev || msg.timestamp - prev.timestamp > 60000
                  const showAvatar = !msg.mine && (!prev || prev.mine || msg.from !== prev.from)
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      showTime={showTime}
                      showAvatar={showAvatar}
                      activeChat={activeChat}
                      status={messageStatus[msg.id] || (msg.mine ? 'sent' : 'read')}
                      onAction={handleMessageAction}
                    />
                  )
                })
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Telegram style */}
            <div className="p-2 md:p-3 border-t border-dark-800 bg-dark-900/95 backdrop-blur-md safe-area-bottom">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-start gap-2 mb-2 px-1 animate-fade-in">
                  <div className="flex-1 bg-dark-800/50 rounded-lg p-2 text-xs border-l-2 border-accent">
                    <p className="text-accent font-medium mb-0.5">{replyTo.fromUsername}</p>
                    <p className="text-dark-400 truncate">{replyTo.text}</p>
                  </div>
                  <button 
                    onClick={cancelReply}
                    className="p-1 hover:bg-dark-800 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-dark-500" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-1.5 md:gap-2 bg-dark-800 rounded-2xl md:rounded-3xl px-3 md:px-4 py-2 border border-dark-700 focus-within:border-accent/50 transition-colors min-h-[44px] md:min-h-[48px]">
                {/* Emoji button */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-dark-500 hover:text-accent transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-50">
                      <EmojiPicker 
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </div>
                  )}
                </div>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Сообщение..."
                  className="flex-1 bg-transparent outline-none text-dark-100 placeholder-dark-600 text-base md:text-sm py-1.5 px-1 min-h-[24px]"
                  style={{ fontSize: '16px' }} // Prevents zoom on iOS
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className={clsx(
                    'p-2.5 md:p-2 rounded-xl md:rounded-lg transition-all duration-200 active:scale-90 flex-shrink-0',
                    inputText.trim()
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'text-dark-600 cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5 md:w-4 md:h-4" />
                </button>
              </div>
              <p className="text-center text-[10px] md:text-xs text-dark-700 mt-1.5 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> AES-256-GCM + ECDH P-256
              </p>
            </div>
            
            {/* Forward Modal */}
            {showForwardModal && (
              <div className="absolute inset-0 z-50 bg-dark-950/90 flex items-center justify-center p-4">
                <div className="bg-dark-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                    <h3 className="font-semibold">Переслать сообщение</h3>
                    <button 
                      onClick={() => setShowForwardModal(false)}
                      className="p-2 hover:bg-dark-800 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-2 bg-dark-800/50">
                    <p className="text-xs text-dark-400 px-2 py-1 truncate">
                      {forwardMessage?.text?.slice(0, 60)}...
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                    <p className="text-xs text-dark-500 px-2 py-2">Выберите получателя:</p>
                    {onlineUsers.map(user => (
                      <button
                        key={user.userId}
                        onClick={() => handleForward(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800 transition-colors text-left"
                      >
                        <ContactAvatar username={user.username} userId={user.userId} size="md" />
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-dark-500">
                            {chats[user.userId]?.messages?.length > 0 ? 'Есть переписка' : 'Новый чат'}
                          </p>
                        </div>
                        <Forward className="w-4 h-4 ml-auto text-accent" />
                      </button>
                    ))}
                    {onlineUsers.length === 0 && (
                      <p className="text-center text-dark-500 py-8">Нет пользователей онлайн</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6 shadow-2xl shadow-accent/10">
              <Shield className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-3">SecureChat</h2>
            <p className="text-dark-400 max-w-sm text-sm leading-relaxed">
              Выбери пользователя из списка слева чтобы начать зашифрованный чат.
              Все сообщения шифруются на твоём устройстве — сервер видит только зашифрованные данные.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-sm">
              {[
                ['🔒', 'E2E AES-256', 'Банковский стандарт'],
                ['👤', 'Анонимность', 'Без регистрации'],
                ['🚫', 'Нет логов', 'Чисто и безопасно'],
              ].map(([emoji, title, sub]) => (
                <div key={title} className="glass rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{emoji}</div>
                  <p className="text-xs font-medium text-dark-200">{title}</p>
                  <p className="text-xs text-dark-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
