import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

let socket = null

export function getSocket() {
  return socket
}

export function connectSocket(userId, username, publicKeyJwk) {
  if (socket?.connected) return socket

  socket = io(SERVER_URL, {
    auth: { userId, username, publicKey: JSON.stringify(publicKeyJwk) },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
