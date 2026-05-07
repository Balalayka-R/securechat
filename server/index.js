import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000']

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => o === '*' || origin.startsWith(o))) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: ${origin} not allowed`))
    }
  },
  methods: ['GET', 'POST']
}

const io = new Server(httpServer, { cors: corsOptions })

app.use(cors(corsOptions))
app.get('/health', (_, res) => res.json({ status: 'ok', users: onlineUsers.size }))

/**
 * In-memory user store — NO persistent logging
 * Users are anonymous: only userId, username, publicKey (for E2E), socketId
 */
const onlineUsers = new Map()

io.use((socket, next) => {
  const { userId, username, publicKey } = socket.handshake.auth
  if (!userId || !username || !publicKey) {
    return next(new Error('Missing auth data'))
  }
  socket.userId = userId
  socket.username = username
  socket.publicKey = publicKey
  next()
})

io.on('connection', (socket) => {
  const user = {
    userId: socket.userId,
    username: socket.username,
    publicKey: socket.publicKey,
    socketId: socket.id
  }

  onlineUsers.set(socket.userId, user)

  console.log(`[+] ${socket.username} joined (${onlineUsers.size} online)`)

  socket.emit('users:online', Array.from(onlineUsers.values()).filter(u => u.userId !== socket.userId))
  socket.broadcast.emit('user:joined', {
    userId: user.userId,
    username: user.username,
    publicKey: user.publicKey
  })

  socket.on('msg:send', ({ to, encryptedText, publicKey, timestamp }) => {
    const recipient = onlineUsers.get(to)
    if (!recipient) return

    io.to(recipient.socketId).emit('msg:receive', {
      from: socket.userId,
      fromUsername: socket.username,
      encryptedText,
      publicKey: socket.publicKey,
      timestamp
    })
  })

  socket.on('user:request', ({ targetId }) => {
    const target = onlineUsers.get(targetId)
    if (target) {
      socket.emit('user:found', {
        userId: target.userId,
        username: target.username,
        publicKey: target.publicKey
      })
      io.to(target.socketId).emit('user:found', {
        userId: user.userId,
        username: user.username,
        publicKey: user.publicKey
      })
    } else {
      socket.emit('user:notfound', { targetId })
    }
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId)
    socket.broadcast.emit('user:left', { userId: socket.userId })
    console.log(`[-] ${socket.username} left (${onlineUsers.size} online)`)
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`SecureChat server running on :${PORT}`)
  console.log('No messages are stored. No logs. Pure relay.')
})
