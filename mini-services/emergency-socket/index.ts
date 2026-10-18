// ─────────────────────────────────────────────
// IHMS Emergency — Realtime Socket Service
// پورت 3003: سوکت کلاینت‌ها (از طریق Caddy)
// پورت 3004: نقطه داخلی emit برای سرور Next.js
// ─────────────────────────────────────────────
import { createServer } from 'http'
import { Server } from 'socket.io'
import crypto from 'crypto'

const PORT = 3003
const INTERNAL_PORT = 3004
const SECRET = process.env.IHMS_SECRET || 'ihms-emergency-secret-2026'

interface SessionPayload {
  uid: string
  org: string
  exp: number
  iat: number
}

function verifyToken(token?: string): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

const io = new Server(
  createServer(),
  {
    // DO NOT change the path, it is used by Caddy to forward the request to the correct port
    path: '/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  },
)

// سرور داخلی برای emit (فقط لوکال)
const internalServer = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try {
        const { room, event, data, secret } = JSON.parse(body)
        if (secret !== SECRET) {
          res.writeHead(403).end(JSON.stringify({ ok: false, error: 'forbidden' }))
          return
        }
        if (!room || !event) {
          res.writeHead(400).end(JSON.stringify({ ok: false, error: 'bad payload' }))
          return
        }
        io.to(room).emit(event, data)
        console.log(`[emit] room=${room} event=${event}`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400).end(JSON.stringify({ ok: false, error: String(e) }))
      }
    })
    return
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, clients: io.engine.clientsCount }))
    return
  }
  res.writeHead(404).end()
})

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`)

  socket.on('auth', ({ token }: { token?: string }) => {
    const payload = verifyToken(token)
    if (!payload) {
      socket.emit('auth:result', { ok: false, error: 'invalid token' })
      return
    }
    const room = `org:${payload.org}`
    socket.join(room)
    socket.data.uid = payload.uid
    socket.data.room = room
    socket.emit('auth:result', { ok: true, room, uid: payload.uid })
    console.log(`socket authed: ${socket.id} -> ${room}`)
  })

  socket.on('ping-alive', () => socket.emit('alive', Date.now()))

  socket.on('disconnect', () => {
    console.log(`socket disconnected: ${socket.id}`)
  })
})

io.listen(PORT)
internalServer.listen(INTERNAL_PORT, () => {
  console.log(`✅ IHMS Emergency socket service: ws:${PORT} + internal:${INTERNAL_PORT}`)
})
