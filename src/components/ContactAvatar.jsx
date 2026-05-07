import { getAvatarColor, getInitials } from '../lib/identity'
import clsx from 'clsx'

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export default function ContactAvatar({ username, userId, size = 'md' }) {
  const color = getAvatarColor(userId)
  const initials = getInitials(username)

  return (
    <div
      className={clsx('rounded-xl flex items-center justify-center font-bold flex-shrink-0', sizes[size])}
      style={{ backgroundColor: color + '22', border: `1.5px solid ${color}44`, color }}
    >
      {initials}
    </div>
  )
}
