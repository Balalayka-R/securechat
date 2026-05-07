import clsx from 'clsx'
import ContactAvatar from './ContactAvatar'

export default function MessageBubble({ message, showTime, showAvatar, activeChat }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

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
        'flex items-end gap-1 max-w-[85%] md:max-w-[75%]',
        message.mine ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar for other person - Telegram style */}
        {!message.mine && showAvatar && activeChat && (
          <div className="flex-shrink-0 mb-1">
            <ContactAvatar 
              username={activeChat.username} 
              userId={activeChat.userId} 
              size="sm" 
            />
          </div>
        )}
        {!message.mine && !showAvatar && (
          <div className="w-8 flex-shrink-0" /> // Spacer for alignment
        )}
        
        {/* Message bubble - Telegram style */}
        <div className={clsx(
          'relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
          'shadow-sm',
          message.mine 
            ? 'bg-accent text-white rounded-br-md' 
            : 'bg-dark-800 text-dark-100 rounded-bl-md'
        )}>
          <p>{message.text}</p>
          
          {/* Time and checks */}
          <div className={clsx(
            'flex items-center gap-1 mt-1 select-none',
            message.mine ? 'text-white/70' : 'text-dark-500'
          )}>
            <span className="text-[11px]">{time}</span>
            {message.mine && (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
