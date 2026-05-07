import clsx from 'clsx'

export default function MessageBubble({ message, showTime }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className={clsx('flex flex-col animate-fade-in', message.mine ? 'items-end' : 'items-start')}>
      {showTime && (
        <span className="text-xs text-dark-600 mb-2 mx-auto">
          {new Date(message.timestamp).toLocaleString([], {
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'short'
          })}
        </span>
      )}
      <div className="flex items-end gap-1.5 max-w-[75%]">
        <div className={message.mine ? 'msg-bubble-out' : 'msg-bubble-in'}>
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
          <p className={clsx(
            'text-xs mt-1',
            message.mine ? 'text-white/60 text-right' : 'text-dark-500 text-right'
          )}>
            {time}
          </p>
        </div>
      </div>
    </div>
  )
}
