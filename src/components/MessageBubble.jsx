import { useState } from 'react'
import clsx from 'clsx'
import ContactAvatar from './ContactAvatar'
import { Reply, Trash2, Forward } from 'lucide-react'

export default function MessageBubble({ message, showTime, showAvatar, activeChat, status = 'sent', onAction }) {
  const [showMenu, setShowMenu] = useState(false)
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Status icons: sent (1 check), delivered (2 gray), read (2 blue)
  const StatusIcon = () => {
    if (!message.mine) return null
    
    if (status === 'read') {
      return (
        <svg className="w-3 h-3 text-safe" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
        </svg>
      )
    }
    
    if (status === 'delivered') {
      return (
        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
        </svg>
      )
    }
    
    return (
      <svg className="w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    )
  }

  const handleLongPress = (e) => {
    e.preventDefault()
    setShowMenu(true)
  }

  const handleAction = (action) => {
    onAction?.(action, message)
    setShowMenu(false)
  }

  // Deleted message
  if (message.deleted) {
    return (
      <div className={clsx('flex flex-col items-center py-2')}>
        <span className="text-xs text-dark-600 italic">Сообщение удалено</span>
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col animate-fade-in', message.mine ? 'items-end' : 'items-start')}>
      {showTime && (
        <span className="text-xs text-dark-600 mb-2 mx-auto py-2">
          {new Date(message.timestamp).toLocaleString([], {
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'short'
          })}
        </span>
      )}
      
      <div className={clsx(
        'flex items-end gap-1 max-w-[85%] md:max-w-[75%] relative group',
        message.mine ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar for other person */}
        {!message.mine && showAvatar && activeChat && (
          <div className="flex-shrink-0 mb-1">
            <ContactAvatar username={activeChat.username} userId={activeChat.userId} size="sm" />
          </div>
        )}
        {!message.mine && !showAvatar && <div className="w-8 flex-shrink-0" />}
        
        {/* Message bubble with reply preview */}
        <div 
          className={clsx(
            'relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
            'shadow-sm cursor-pointer select-none',
            message.mine 
              ? 'bg-accent text-white rounded-br-md' 
              : 'bg-dark-800 text-dark-100 rounded-bl-md'
          )}
          onContextMenu={handleLongPress}
          onTouchStart={(e) => {
            const timer = setTimeout(() => handleLongPress(e), 500)
            e.target.dataset.timer = timer
          }}
          onTouchEnd={(e) => {
            clearTimeout(e.target.dataset.timer)
          }}
          onClick={() => setShowMenu(!showMenu)}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <div className={clsx(
              'mb-1.5 pl-2 border-l-2 text-xs rounded',
              message.mine 
                ? 'border-white/40 text-white/80' 
                : 'border-accent/50 text-dark-400'
            )}>
              <p className="font-medium">{message.replyTo.fromUsername}</p>
              <p className="truncate max-w-[200px]">{message.replyTo.text}</p>
            </div>
          )}
          
          <p>{message.text}</p>
          
          {/* Time and checks */}
          <div className={clsx(
            'flex items-center gap-1 mt-1 select-none',
            message.mine ? 'text-white/70' : 'text-dark-500'
          )}>
            <span className="text-[11px]">{time}</span>
            <StatusIcon />
          </div>
          
          {/* Context menu */}
          {showMenu && (
            <div 
              className={clsx(
                'absolute z-50 bg-dark-800 rounded-lg shadow-xl border border-dark-700 py-1 min-w-[120px]',
                message.mine ? 'right-0 top-full mt-1' : 'left-0 top-full mt-1'
              )}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction('reply'); }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-dark-700 flex items-center gap-2"
              >
                <Reply className="w-3 h-3" /> Ответить
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction('forward'); }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-dark-700 flex items-center gap-2"
              >
                <Forward className="w-3 h-3" /> Переслать
              </button>
              {message.mine && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAction('delete'); }}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-dark-700 text-danger flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Удалить
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Click outside to close menu */}
        {showMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  )
}
