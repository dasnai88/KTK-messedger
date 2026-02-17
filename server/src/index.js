require('dotenv').config()

const path = require('path')
const fs = require('fs')
const http = require('http')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const { Server } = require('socket.io')
const webpush = require('web-push')
const { pool } = require('./db')

const app = express()
const server = http.createServer(app)

const roles = [
  { value: 'programmist', label: 'Программист' },
  { value: 'tehnik', label: 'Техник' },
  { value: 'polimer', label: 'Полимер' },
  { value: 'pirotehnik', label: 'Пиротехник' },
  { value: 'tehmash', label: 'Техмаш' },
  { value: 'holodilchik', label: 'Холодильчик' }
]

const jwtSecret = process.env.JWT_SECRET || 'change_me'
const uploadStorage = String(process.env.UPLOAD_STORAGE || 'disk').toLowerCase()
const useDbStorage = uploadStorage === 'db'
const defaultUploadDir = path.join(__dirname, '..', 'uploads')
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : defaultUploadDir
const webPushSubject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com'
const webPushPublicKey = process.env.WEB_PUSH_PUBLIC_KEY || ''
const webPushPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY || ''
const webPushEnabled = Boolean(webPushPublicKey && webPushPrivateKey)

if (webPushEnabled) {
  webpush.setVapidDetails(webPushSubject, webPushPublicKey, webPushPrivateKey)
}

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me')) {
  console.error('JWT_SECRET must be set to a strong value in production.')
  process.exit(1)
}

if (!useDbStorage) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname)}`
    cb(null, safeName)
  }
})

function createUpload({ mimeTypes, extensions, maxFileSizeMb, errorMessage }) {
  const allowedMimeTypes = new Set(mimeTypes)
  const allowedExtensions = new Set(extensions)
  return multer({
    storage: useDbStorage ? multer.memoryStorage() : diskStorage,
    limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase()
      if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
        return cb(new Error(errorMessage))
      }
      cb(null, true)
    }
  })
}

const imageUpload = createUpload({
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  maxFileSizeMb: 5,
  errorMessage: 'Only images are allowed'
})

const audioUpload = createUpload({
  mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac'],
  extensions: ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'],
  maxFileSizeMb: 20,
  errorMessage: 'Only audio files are allowed'
})

const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173'
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowAllOrigins = allowedOrigins.includes('*')

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowAllOrigins) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Попробуйте позже.' }
})

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
})

const messageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
})

const io = new Server(server, {
  cors: {
    origin: allowAllOrigins ? '*' : allowedOrigins,
    credentials: true
  }
})

const onlineUsers = new Map() // userId => Set(socketId)
const socketState = new Map() // socketId => { userId, focused, activeConversationId }

app.disable('x-powered-by')
const trustProxyRaw = typeof process.env.TRUST_PROXY === 'string' ? process.env.TRUST_PROXY.trim() : ''
const hostedBehindProxy = Boolean(
  process.env.RENDER ||
  process.env.RAILWAY_STATIC_URL ||
  process.env.HEROKU ||
  process.env.FLY_APP_NAME
)
if (trustProxyRaw) {
  const lower = trustProxyRaw.toLowerCase()
  if (lower === 'true') {
    app.set('trust proxy', 1)
  } else if (lower === 'false') {
    app.set('trust proxy', false)
  } else if (/^\d+$/.test(trustProxyRaw)) {
    app.set('trust proxy', Number(trustProxyRaw))
  } else {
    app.set('trust proxy', trustProxyRaw)
  }
} else if (process.env.NODE_ENV === 'production' || hostedBehindProxy) {
  app.set('trust proxy', 1)
}
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}))
app.use(cors(corsOptions))
app.use(express.json({ limit: '200kb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter)
if (!useDbStorage) {
  app.use('/uploads', express.static(uploadDir))
}

function normalizeLogin(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,}$/.test(value)
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 6
}

function isValidMessage(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 1000
}

function isValidUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getMessagePreviewText(body, attachmentUrl) {
  const text = typeof body === 'string' ? body.trim() : ''
  if (text) {
    return text.length > 120 ? `${text.slice(0, 117)}...` : text
  }
  if (attachmentUrl) return 'Attachment'
  return 'New message'
}

async function storeUpload(file) {
  if (!file) return null
  if (!useDbStorage) {
    return `/uploads/${file.filename}`
  }
  const result = await pool.query(
    'insert into uploads (mime_type, data) values ($1, $2) returning id',
    [file.mimetype || 'application/octet-stream', file.buffer]
  )
  return `/uploads/${result.rows[0].id}`
}

if (useDbStorage) {
  app.get('/uploads/:id', async (req, res) => {
    try {
      const id = req.params.id
      if (!isValidUuid(id)) {
        return res.status(400).end()
      }
      const result = await pool.query('select mime_type, data from uploads where id = $1', [id])
      if (result.rowCount === 0) return res.status(404).end()
      res.setHeader('Content-Type', result.rows[0].mime_type || 'application/octet-stream')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return res.send(result.rows[0].data)
    } catch (err) {
      console.error('Upload fetch error', err)
      return res.status(500).end()
    }
  })
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '7d' })
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(token, jwtSecret)
    req.userId = payload.sub
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

async function ensureNotBanned(req, res, next) {
  try {
    const result = await pool.query('select is_banned from users where id = $1', [req.userId])
    if (result.rowCount === 0) return res.status(401).json({ error: 'User not found' })
    if (result.rows[0].is_banned) {
      return res.status(403).json({ error: 'User is banned' })
    }
    return next()
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' })
  }
}

async function adminOnly(req, res, next) {
  try {
    const result = await pool.query('select is_admin, is_moderator from users where id = $1', [req.userId])
    if (result.rowCount === 0) return res.status(401).json({ error: 'User not found' })
    if (!result.rows[0].is_admin) return res.status(403).json({ error: 'Admin only' })
    return next()
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' })
  }
}

app.param('id', (req, res, next, id) => {
  if (!isValidUuid(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return next()
})

function mapUser(row) {
  return {
    id: row.id,
    login: row.login,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    themeColor: row.theme_color,
    isAdmin: row.is_admin,
    isModerator: row.is_moderator,
    isBanned: row.is_banned,
    warningsCount: row.warnings_count,
    subscribersCount: Number(row.subscribers_count || 0),
    subscriptionsCount: Number(row.subscriptions_count || 0),
    tracksCount: Number(row.tracks_count || 0),
    isSubscribed: row.is_subscribed === true,
    createdAt: row.created_at
  }
}

function mapProfileTrack(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    artist: row.artist,
    audioUrl: row.audio_url,
    createdAt: row.created_at
  }
}

async function getUserByIdWithStats(userId, viewerId) {
  const result = await pool.query(
    `select u.*,
            (select count(*) from user_subscriptions s where s.target_user_id = u.id) as subscribers_count,
            (select count(*) from user_subscriptions s where s.subscriber_id = u.id) as subscriptions_count,
            (select count(*) from profile_tracks t where t.user_id = u.id) as tracks_count,
            exists(
              select 1
              from user_subscriptions s
              where s.subscriber_id = $2 and s.target_user_id = u.id
            ) as is_subscribed
     from users u
     where u.id = $1`,
    [userId, viewerId || null]
  )
  if (result.rowCount === 0) return null
  return mapUser(result.rows[0])
}

async function getUserByUsernameWithStats(username, viewerId) {
  const result = await pool.query(
    `select u.*,
            (select count(*) from user_subscriptions s where s.target_user_id = u.id) as subscribers_count,
            (select count(*) from user_subscriptions s where s.subscriber_id = u.id) as subscriptions_count,
            (select count(*) from profile_tracks t where t.user_id = u.id) as tracks_count,
            exists(
              select 1
              from user_subscriptions s
              where s.subscriber_id = $2 and s.target_user_id = u.id
            ) as is_subscribed
     from users u
     where u.username = $1`,
    [username, viewerId || null]
  )
  if (result.rowCount === 0) return null
  return mapUser(result.rows[0])
}

function mapOtherUser(row) {
  return {
    id: row.other_id,
    username: row.other_username,
    displayName: row.other_display_name,
    role: row.other_role,
    avatarUrl: row.other_avatar_url
  }
}

function mapConversation(row) {
  return {
    id: row.id,
    title: row.title,
    isGroup: row.is_group,
    other: row.other_id ? mapOtherUser(row) : null,
    lastMessage: row.last_body,
    lastAt: row.last_at,
    unreadCount: Number(row.unread_count || 0)
  }
}

function mapPost(row) {
  return {
    id: row.id,
    body: row.body,
    imageUrl: row.image_url,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    likesCount: Number(row.likes_count || 0),
    commentsCount: Number(row.comments_count || 0),
    repostsCount: Number(row.reposts_count || 0),
    liked: row.liked || false,
    reposted: row.reposted || false,
    repostOf: row.repost_of ? {
      id: row.repost_of,
      authorUsername: row.repost_author_username,
      authorDisplayName: row.repost_author_display_name,
      body: row.repost_body,
      imageUrl: row.repost_image_url,
      createdAt: row.repost_created_at
    } : null,
    author: {
      id: row.author_id,
      username: row.author_username,
      displayName: row.author_display_name,
      avatarUrl: row.author_avatar_url
    }
  }
}

async function getUserConversations(userId) {
  const result = await pool.query(
    `select c.id,
            c.title,
            c.is_group,
            u.id as other_id,
            u.username as other_username,
            u.display_name as other_display_name,
            u.role as other_role,
            u.avatar_url as other_avatar_url,
            lm.body as last_body,
            lm.created_at as last_at,
            (
              select count(*)
              from messages m
              where m.conversation_id = c.id
                and m.deleted_at is null
                and m.sender_id <> $1
                and (me.last_read_at is null or m.created_at > me.last_read_at)
            ) as unread_count
     from conversations c
     join conversation_members me on me.conversation_id = c.id and me.user_id = $1
     left join conversation_members other on other.conversation_id = c.id and other.user_id <> $1 and c.is_group = false
     left join users u on u.id = other.user_id
     left join lateral (
       select m.body, m.created_at, m.sender_id
       from messages m
       where m.conversation_id = c.id
       order by m.created_at desc
       limit 1
     ) lm on true
     order by lm.created_at desc nulls last, c.created_at desc`,
    [userId]
  )

  return result.rows.map(mapConversation)
}

function getSocketIdsForUser(userId) {
  const sockets = onlineUsers.get(userId)
  if (!sockets || sockets.size === 0) return []
  return Array.from(sockets)
}

function addOnlineSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId) || new Set()
  const wasOffline = sockets.size === 0
  sockets.add(socketId)
  onlineUsers.set(userId, sockets)
  return wasOffline
}

function removeOnlineSocket(userId, socketId) {
  const sockets = onlineUsers.get(userId)
  if (!sockets) return false
  sockets.delete(socketId)
  if (sockets.size === 0) {
    onlineUsers.delete(userId)
    return true
  }
  return false
}

function emitToUser(userId, eventName, payload) {
  const socketIds = getSocketIdsForUser(userId)
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(eventName, payload)
  })
}

async function getConversationMemberIds(conversationId) {
  const result = await pool.query(
    'select user_id from conversation_members where conversation_id = $1',
    [conversationId]
  )
  return result.rows.map((row) => row.user_id)
}

function parsePushSubscriptionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : ''
  const keys = payload.keys && typeof payload.keys === 'object' ? payload.keys : {}
  const p256dh = typeof keys.p256dh === 'string' ? keys.p256dh.trim() : ''
  const auth = typeof keys.auth === 'string' ? keys.auth.trim() : ''
  if (!endpoint || !p256dh || !auth) return null
  return {
    endpoint,
    keys: { p256dh, auth }
  }
}

async function upsertPushSubscription(userId, subscription, userAgent) {
  await pool.query(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_seen_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (endpoint) do update
       set user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           user_agent = excluded.user_agent,
           last_seen_at = now()`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent || null]
  )
}

async function removePushSubscription(userId, endpoint) {
  await pool.query(
    'delete from push_subscriptions where user_id = $1 and endpoint = $2',
    [userId, endpoint]
  )
}

function shouldSendPushToUser(userId, conversationId) {
  const socketIds = getSocketIdsForUser(userId)
  if (socketIds.length === 0) return true
  return !socketIds.some((socketId) => {
    const state = socketState.get(socketId)
    if (!state) return false
    return state.focused === true && state.activeConversationId === conversationId
  })
}

async function sendPushToUsers(userIds, payload) {
  if (!webPushEnabled) return
  const targets = Array.from(new Set((userIds || []).filter((id) => typeof id === 'string')))
  if (targets.length === 0) return

  const subscriptions = await pool.query(
    `select user_id, endpoint, p256dh, auth
     from push_subscriptions
     where user_id = any($1::uuid[])`,
    [targets]
  )
  if (subscriptions.rowCount === 0) return

  const body = JSON.stringify(payload)
  await Promise.all(subscriptions.rows.map(async (row) => {
    if (!shouldSendPushToUser(row.user_id, payload.conversationId || null)) return
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      }, body, {
        TTL: 60,
        urgency: 'high',
        topic: payload.tag || undefined
      })
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await pool.query('delete from push_subscriptions where endpoint = $1', [row.endpoint]).catch(() => {})
      }
    }
  }))
}

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token
  if (!token) return next(new Error('No token'))
  try {
    const payload = jwt.verify(token, jwtSecret)
    socket.userId = payload.sub
    return next()
  } catch (err) {
    return next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  const becameOnline = addOnlineSocket(socket.userId, socket.id)
  socketState.set(socket.id, {
    userId: socket.userId,
    focused: false,
    activeConversationId: null
  })

  if (becameOnline) {
    io.emit('presence', { userId: socket.userId, online: true })
  }

  socket.on('presence:state', (payload) => {
    const current = socketState.get(socket.id) || {
      userId: socket.userId,
      focused: false,
      activeConversationId: null
    }
    const focused = payload && typeof payload.focused === 'boolean' ? payload.focused : current.focused
    const activeConversationId = payload && (typeof payload.activeConversationId === 'string' || payload.activeConversationId === null)
      ? payload.activeConversationId
      : current.activeConversationId
    socketState.set(socket.id, {
      userId: socket.userId,
      focused,
      activeConversationId
    })
  })

  socket.on('typing:start', async ({ conversationId }) => {
    try {
      if (!isValidUuid(conversationId)) return
      const memberIds = await getConversationMemberIds(conversationId)
      if (!memberIds.includes(socket.userId)) return
      memberIds.forEach((memberId) => {
        if (memberId === socket.userId) return
        emitToUser(memberId, 'typing:start', {
          conversationId,
          userId: socket.userId
        })
      })
    } catch (err) {
      // ignore typing errors
    }
  })

  socket.on('typing:stop', async ({ conversationId }) => {
    try {
      if (!isValidUuid(conversationId)) return
      const memberIds = await getConversationMemberIds(conversationId)
      if (!memberIds.includes(socket.userId)) return
      memberIds.forEach((memberId) => {
        if (memberId === socket.userId) return
        emitToUser(memberId, 'typing:stop', {
          conversationId,
          userId: socket.userId
        })
      })
    } catch (err) {
      // ignore typing errors
    }
  })

  socket.on('call:offer', ({ toUserId, offer }) => {
    const targetSockets = getSocketIdsForUser(toUserId)
    if (targetSockets.length === 0) {
      socket.emit('call:unavailable', { toUserId })
      return
    }
    targetSockets.forEach((socketId) => {
      io.to(socketId).emit('call:offer', { fromUserId: socket.userId, offer })
    })
  })

  socket.on('call:answer', ({ toUserId, answer }) => {
    emitToUser(toUserId, 'call:answer', { fromUserId: socket.userId, answer })
  })

  socket.on('call:ice', ({ toUserId, candidate }) => {
    emitToUser(toUserId, 'call:ice', { fromUserId: socket.userId, candidate })
  })

  socket.on('call:decline', ({ toUserId, reason }) => {
    emitToUser(toUserId, 'call:decline', { fromUserId: socket.userId, reason })
  })

  socket.on('call:end', ({ toUserId }) => {
    emitToUser(toUserId, 'call:end', { fromUserId: socket.userId })
  })

  socket.on('disconnect', () => {
    socketState.delete(socket.id)
    const becameOffline = removeOnlineSocket(socket.userId, socket.id)
    if (becameOffline) {
      io.emit('presence', { userId: socket.userId, online: false })
    }
  })
})

app.get('/api/health', async (req, res) => {
  let db = false
  try {
    await pool.query('select 1')
    db = true
  } catch (err) {
    console.error('Health check failed', err)
  }
  res.json({ ok: true, db, time: new Date().toISOString() })
})

app.get('/api/roles', (req, res) => {
  res.json({ roles })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login)
    const username = normalizeUsername(req.body.username)
    const password = req.body.password
    const role = req.body.role

    if (login.length < 3) {
      return res.status(400).json({ error: 'Login must be at least 3 characters' })
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3+ chars and contain only a-z, 0-9, _' })
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (!roles.some((item) => item.value === role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      'insert into users (login, username, password_hash, role) values ($1, $2, $3, $4) returning *',
      [login, username, passwordHash, role]
    )

    const user = await getUserByIdWithStats(result.rows[0].id, result.rows[0].id) || mapUser(result.rows[0])
    const token = signToken(user.id)

    res.json({ token, user })
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Login or username already taken' })
    }
    console.error('Register error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login)
    const password = req.body.password

    if (login.length < 3) {
      return res.status(400).json({ error: 'Login must be at least 3 characters' })
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const result = await pool.query(
      'select * from users where login = $1 or username = $1 limit 1',
      [login]
    )

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid login or password' })
    }

    const userRow = result.rows[0]
    if (userRow.is_banned) {
      return res.status(403).json({ error: 'User is banned' })
    }

    const match = await bcrypt.compare(password, userRow.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid login or password' })
    }

    const user = await getUserByIdWithStats(userRow.id, userRow.id) || mapUser(userRow)
    const token = signToken(user.id)

    res.json({ token, user })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me', auth, ensureNotBanned, async (req, res) => {
  try {
    const user = await getUserByIdWithStats(req.userId, req.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    console.error('Me error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.patch('/api/me', auth, ensureNotBanned, async (req, res) => {
  try {
    const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : null
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null
    const role = req.body.role
    const username = req.body.username ? normalizeUsername(req.body.username) : null
    const themeColor = typeof req.body.themeColor === 'string' ? req.body.themeColor.trim() : null

    if (username && !isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3+ chars and contain only a-z, 0-9, _' })
    }
    if (role && !roles.some((item) => item.value === role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (themeColor && !/^#([0-9a-fA-F]{6})$/.test(themeColor)) {
      return res.status(400).json({ error: 'Theme color must be hex like #1a2b3c' })
    }

    const result = await pool.query(
      `update users
       set display_name = coalesce($1, display_name),
           bio = coalesce($2, bio),
           role = coalesce($3, role),
           username = coalesce($4, username),
           theme_color = coalesce($5, theme_color)
       where id = $6
       returning *`,
      [displayName, bio, role, username, themeColor, req.userId]
    )

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    const user = await getUserByIdWithStats(req.userId, req.userId)
    res.json({ user })
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' })
    }
    console.error('Update error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/notifications/vapid-public-key', auth, ensureNotBanned, (req, res) => {
  if (!webPushEnabled) {
    return res.status(503).json({ error: 'Web push is not configured on the server' })
  }
  res.json({ publicKey: webPushPublicKey })
})

app.put('/api/notifications/push-subscription', auth, ensureNotBanned, async (req, res) => {
  try {
    if (!webPushEnabled) {
      return res.status(503).json({ error: 'Web push is not configured on the server' })
    }
    const subscription = parsePushSubscriptionPayload(req.body.subscription)
    if (!subscription) {
      return res.status(400).json({ error: 'Invalid push subscription payload' })
    }
    await upsertPushSubscription(req.userId, subscription, req.headers['user-agent'] || null)
    res.json({ ok: true })
  } catch (err) {
    console.error('Upsert push subscription error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/notifications/push-subscription', auth, ensureNotBanned, async (req, res) => {
  try {
    const endpoint = typeof req.body.endpoint === 'string' ? req.body.endpoint.trim() : ''
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' })
    }
    await removePushSubscription(req.userId, endpoint)
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete push subscription error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/avatar', uploadLimiter, auth, ensureNotBanned, imageUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' })
    }
    const avatarUrl = await storeUpload(req.file)
    const result = await pool.query(
      'update users set avatar_url = $1 where id = $2 returning *',
      [avatarUrl, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const user = await getUserByIdWithStats(req.userId, req.userId)
    res.json({ user })
  } catch (err) {
    console.error('Avatar upload error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/banner', uploadLimiter, auth, ensureNotBanned, imageUpload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' })
    }
    const bannerUrl = await storeUpload(req.file)
    const result = await pool.query(
      'update users set banner_url = $1 where id = $2 returning *',
      [bannerUrl, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const user = await getUserByIdWithStats(req.userId, req.userId)
    res.json({ user })
  } catch (err) {
    console.error('Banner upload error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/search', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.query.username)
    if (!username || username.length < 3) {
      return res.json({ users: [] })
    }
    const result = await pool.query(
      `select id, username, display_name, role
       from users
       where username ilike $1 and id <> $2
       order by username
       limit 10`,
      [`${username}%`, req.userId]
    )
    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      online: onlineUsers.has(row.id)
    }))
    res.json({ users })
  } catch (err) {
    console.error('Search error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const user = await getUserByUsernameWithStats(username, req.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      user
    })
  } catch (err) {
    console.error('Profile error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/posts', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const userResult = await pool.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const profileId = userResult.rows[0].id
    const result = await pool.query(
      `select p.id, p.body, p.image_url, p.repost_of, p.created_at,
              u.id as author_id, u.username as author_username,
              u.display_name as author_display_name, u.avatar_url as author_avatar_url,
              ru.username as repost_author_username, ru.display_name as repost_author_display_name,
              rp.body as repost_body, rp.image_url as repost_image_url, rp.created_at as repost_created_at,
              (select count(*) from post_likes pl where pl.post_id = p.id) as likes_count,
              (select count(*) from post_comments pc where pc.post_id = p.id) as comments_count,
              (select count(*) from post_reposts pr where pr.post_id = p.id) as reposts_count,
              exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = $1) as liked,
              exists(select 1 from post_reposts pr where pr.post_id = p.id and pr.user_id = $1) as reposted
       from posts p
       join users u on u.id = p.author_id
       left join posts rp on rp.id = p.repost_of
       left join users ru on ru.id = rp.author_id
       where p.author_id = $2 and p.deleted_at is null
       order by p.created_at desc
       limit 50`,
      [req.userId, profileId]
    )
    res.json({ posts: result.rows.map(mapPost) })
  } catch (err) {
    console.error('Profile posts error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/tracks', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const userResult = await pool.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    const tracksResult = await pool.query(
      `select id, user_id, title, artist, audio_url, created_at
       from profile_tracks
       where user_id = $1
       order by created_at desc
       limit 100`,
      [userResult.rows[0].id]
    )
    res.json({ tracks: tracksResult.rows.map(mapProfileTrack) })
  } catch (err) {
    console.error('Profile tracks error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/users/:username/subscribe', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const targetResult = await pool.query('select id from users where username = $1', [username])
    if (targetResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    const targetId = targetResult.rows[0].id
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot subscribe to yourself' })
    }

    const existing = await pool.query(
      'select 1 from user_subscriptions where subscriber_id = $1 and target_user_id = $2',
      [req.userId, targetId]
    )

    let subscribed = false
    if (existing.rowCount > 0) {
      await pool.query(
        'delete from user_subscriptions where subscriber_id = $1 and target_user_id = $2',
        [req.userId, targetId]
      )
      subscribed = false
    } else {
      await pool.query(
        'insert into user_subscriptions (subscriber_id, target_user_id) values ($1, $2)',
        [req.userId, targetId]
      )
      subscribed = true
    }

    const user = await getUserByIdWithStats(targetId, req.userId)
    res.json({ subscribed, user })
  } catch (err) {
    console.error('Subscribe error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/tracks', uploadLimiter, auth, ensureNotBanned, audioUpload.single('track'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' })
    }
    const titleRaw = typeof req.body.title === 'string' ? req.body.title.trim() : ''
    const artistRaw = typeof req.body.artist === 'string' ? req.body.artist.trim() : ''
    const title = titleRaw.slice(0, 120) || null
    const artist = artistRaw.slice(0, 120) || null
    const audioUrl = await storeUpload(req.file)

    const result = await pool.query(
      `insert into profile_tracks (user_id, title, artist, audio_url)
       values ($1, $2, $3, $4)
       returning id, user_id, title, artist, audio_url, created_at`,
      [req.userId, title, artist, audioUrl]
    )
    res.json({ track: mapProfileTrack(result.rows[0]) })
  } catch (err) {
    console.error('Track upload error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/me/tracks/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const trackId = req.params.id
    const deleted = await pool.query(
      'delete from profile_tracks where id = $1 and user_id = $2 returning id',
      [trackId, req.userId]
    )
    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: 'Track not found' })
    }
    res.json({ ok: true, trackId })
  } catch (err) {
    console.error('Delete track error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/conversations', auth, ensureNotBanned, async (req, res) => {
  try {
    const conversations = await getUserConversations(req.userId)
    res.json({ conversations })
  } catch (err) {
    console.error('Conversations error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations', auth, ensureNotBanned, async (req, res) => {
  const username = normalizeUsername(req.body.username)
  if (!username || !isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username' })
  }

  const client = await pool.connect()
  try {
    const userResult = await client.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const otherId = userResult.rows[0].id
    if (otherId === req.userId) {
      return res.status(400).json({ error: 'Cannot start chat with yourself' })
    }

    await client.query('begin')

    const existing = await client.query(
      `select c.id
       from conversations c
       join conversation_members m1 on m1.conversation_id = c.id and m1.user_id = $1
       join conversation_members m2 on m2.conversation_id = c.id and m2.user_id = $2
       where c.is_group = false
       limit 1`,
      [req.userId, otherId]
    )

    let conversationId
    if (existing.rowCount > 0) {
      conversationId = existing.rows[0].id
    } else {
      const created = await client.query(
        'insert into conversations (title, is_group) values (null, false) returning id',
        []
      )
      conversationId = created.rows[0].id
      await client.query(
        'insert into conversation_members (conversation_id, user_id) values ($1, $2), ($1, $3)',
        [conversationId, req.userId, otherId]
      )
    }

    await client.query('commit')

    const convo = await pool.query(
      `select c.id,
              c.title,
              c.is_group,
              u.id as other_id,
              u.username as other_username,
              u.display_name as other_display_name,
              u.role as other_role,
              lm.body as last_body,
              lm.created_at as last_at
       from conversations c
       join conversation_members me on me.conversation_id = c.id and me.user_id = $1
       join conversation_members other on other.conversation_id = c.id and other.user_id <> $1
       join users u on u.id = other.user_id
       left join lateral (
         select m.body, m.created_at, m.sender_id
         from messages m
         where m.conversation_id = c.id
         order by m.created_at desc
         limit 1
       ) lm on true
       where c.id = $2
       limit 1`,
      [req.userId, conversationId]
    )

    res.json({ conversation: convo.rows[0] ? mapConversation(convo.rows[0]) : null })
  } catch (err) {
    await client.query('rollback')
    console.error('Create conversation error', err)
    res.status(500).json({ error: 'Unexpected error' })
  } finally {
    client.release()
  }
})

app.post('/api/conversations/group', auth, ensureNotBanned, async (req, res) => {
  const title = String(req.body.title || '').trim()
  const members = Array.isArray(req.body.members) ? req.body.members : []
  const usernames = members.map((name) => normalizeUsername(name)).filter(Boolean)

  if (title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' })
  }
  if (usernames.length < 2) {
    return res.status(400).json({ error: 'Add at least 2 members' })
  }

  const client = await pool.connect()
  try {
    await client.query('begin')

    const usersResult = await client.query(
      'select id, username from users where username = any($1::text[])',
      [usernames]
    )

    if (usersResult.rowCount < usernames.length) {
      return res.status(404).json({ error: 'Some users not found' })
    }

    const created = await client.query(
      'insert into conversations (title, is_group) values ($1, true) returning id',
      [title]
    )
    const conversationId = created.rows[0].id

    const allMembers = [req.userId, ...usersResult.rows.map((row) => row.id)]

    for (const memberId of allMembers) {
      await client.query(
        'insert into conversation_members (conversation_id, user_id, role) values ($1, $2, $3)',
        [conversationId, memberId, memberId === req.userId ? 'admin' : 'member']
      )
    }

    await client.query('commit')

    const conversations = await getUserConversations(req.userId)
    const createdConversation = conversations.find((item) => item.id === conversationId)

    res.json({ conversation: createdConversation })
  } catch (err) {
    await client.query('rollback')
    console.error('Create group error', err)
    res.status(500).json({ error: 'Unexpected error' })
  } finally {
    client.release()
  }
})

app.get('/api/conversations/:id/messages', auth, ensureNotBanned, async (req, res) => {
  try {
    const conversationId = req.params.id
    const membership = await pool.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
      [conversationId, req.userId]
    )
    if (membership.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await pool.query(
      `select m.id, m.body, m.attachment_url, m.created_at,
              u.id as sender_id, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url,
              c.is_group,
              (c.is_group = false
                and m.sender_id = $2
                and other.last_read_at is not null
                and m.created_at <= other.last_read_at) as read_by_other
       from messages m
       join conversations c on c.id = m.conversation_id
       left join users u on u.id = m.sender_id
       left join conversation_members other
         on other.conversation_id = c.id
        and other.user_id <> $2
        and c.is_group = false
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`,
      [conversationId, req.userId]
    )

    const messages = result.rows.map((row) => ({
      id: row.id,
      body: row.body,
      attachmentUrl: row.attachment_url,
      createdAt: row.created_at,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      senderDisplayName: row.sender_display_name,
      senderAvatarUrl: row.sender_avatar_url,
      readByOther: row.read_by_other === true
    }))

    res.json({ messages })
  } catch (err) {
    console.error('Messages error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations/:id/read', auth, ensureNotBanned, async (req, res) => {
  try {
    const conversationId = req.params.id
    const membership = await pool.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
      [conversationId, req.userId]
    )
    if (membership.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const updated = await pool.query(
      'update conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2 returning last_read_at',
      [conversationId, req.userId]
    )
    const convo = await pool.query('select is_group from conversations where id = $1', [conversationId])
    if (convo.rowCount > 0 && !convo.rows[0].is_group) {
      const others = await pool.query(
        'select user_id from conversation_members where conversation_id = $1 and user_id <> $2',
        [conversationId, req.userId]
      )
      const lastReadAt = updated.rows[0] ? updated.rows[0].last_read_at : new Date().toISOString()
      others.rows.forEach((row) => {
        emitToUser(row.user_id, 'conversation:read', {
          conversationId,
          userId: req.userId,
          lastReadAt
        })
      })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Read update error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations/:id/messages', messageLimiter, auth, ensureNotBanned, imageUpload.single('file'), async (req, res) => {
  try {
    const conversationId = req.params.id
    const body = req.body.body || ''

    if (!req.file && !isValidMessage(body)) {
      return res.status(400).json({ error: 'Message is empty' })
    }

    const membership = await pool.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
      [conversationId, req.userId]
    )
    if (membership.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const conversationResult = await pool.query(
      'select is_group, title from conversations where id = $1',
      [conversationId]
    )
    if (conversationResult.rowCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const membersResult = await pool.query(
      `select cm.user_id, u.username, u.display_name
       from conversation_members cm
       join users u on u.id = cm.user_id
       where cm.conversation_id = $1`,
      [conversationId]
    )

    const attachmentUrl = req.file ? await storeUpload(req.file) : null

    const result = await pool.query(
      `insert into messages (conversation_id, sender_id, body, attachment_url)
       values ($1, $2, $3, $4)
       returning id, body, attachment_url, created_at`,
      [conversationId, req.userId, body.trim(), attachmentUrl]
    )

    const senderRow = await pool.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderRow.rows[0] || {}

    const message = {
      id: result.rows[0].id,
      body: result.rows[0].body,
      attachmentUrl: result.rows[0].attachment_url,
      createdAt: result.rows[0].created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false
    }

    membersResult.rows.forEach((member) => {
      emitToUser(member.user_id, 'message', { conversationId, message })
    })

    const recipients = membersResult.rows
      .map((member) => member.user_id)
      .filter((memberId) => memberId !== req.userId)

    if (recipients.length > 0) {
      const isGroup = conversationResult.rows[0].is_group === true
      const senderName = sender.display_name || sender.username || 'New message'
      const pushTitle = isGroup
        ? (conversationResult.rows[0].title || 'New message in group')
        : senderName
      const pushPayload = {
        title: pushTitle,
        body: getMessagePreviewText(message.body, message.attachmentUrl),
        conversationId,
        url: `/?conversation=${conversationId}`,
        tag: `conversation-${conversationId}`,
        senderId: req.userId,
        messageId: message.id,
        createdAt: message.createdAt,
        skipWhenVisible: true
      }
      void sendPushToUsers(recipients, pushPayload).catch((err) => {
        console.error('Push send error', err)
      })
    }

    res.json({ message })
  } catch (err) {
    console.error('Send message error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/posts', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
       `select p.id, p.body, p.image_url, p.repost_of, p.created_at,
              u.id as author_id, u.username as author_username,
              u.display_name as author_display_name, u.avatar_url as author_avatar_url,
              ru.username as repost_author_username, ru.display_name as repost_author_display_name,
              rp.body as repost_body, rp.image_url as repost_image_url, rp.created_at as repost_created_at,
              (select count(*) from post_likes pl where pl.post_id = p.id) as likes_count,
              (select count(*) from post_comments pc where pc.post_id = p.id) as comments_count,
              (select count(*) from post_reposts pr where pr.post_id = p.id) as reposts_count,
              exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = $1) as liked,
              exists(select 1 from post_reposts pr where pr.post_id = p.id and pr.user_id = $1) as reposted
       from posts p
       join users u on u.id = p.author_id
       left join posts rp on rp.id = p.repost_of
       left join users ru on ru.id = rp.author_id
       where p.deleted_at is null
       order by p.created_at desc
       limit 50`,
      [req.userId]
    )
    res.json({ posts: result.rows.map(mapPost) })
  } catch (err) {
    console.error('Posts error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/posts', uploadLimiter, auth, ensureNotBanned, imageUpload.single('image'), async (req, res) => {
  try {
    const body = req.body.body || ''
    if (!req.file && !isValidMessage(body)) {
      return res.status(400).json({ error: 'Пустой пост' })
    }
    const imageUrl = req.file ? await storeUpload(req.file) : null
    const result = await pool.query(
      `insert into posts (author_id, body, image_url)
       values ($1, $2, $3)
       returning id, body, image_url, created_at`,
      [req.userId, body.trim(), imageUrl]
    )
    const postRow = await pool.query(
       `select p.id, p.body, p.image_url, p.repost_of, p.created_at,
              u.id as author_id, u.username as author_username,
              u.display_name as author_display_name, u.avatar_url as author_avatar_url,
              ru.username as repost_author_username, ru.display_name as repost_author_display_name,
              rp.body as repost_body, rp.image_url as repost_image_url, rp.created_at as repost_created_at,
              (select count(*) from post_likes pl where pl.post_id = p.id) as likes_count,
              (select count(*) from post_comments pc where pc.post_id = p.id) as comments_count,
              (select count(*) from post_reposts pr where pr.post_id = p.id) as reposts_count,
              exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = $2) as liked,
              exists(select 1 from post_reposts pr where pr.post_id = p.id and pr.user_id = $2) as reposted
       from posts p
       join users u on u.id = p.author_id
       left join posts rp on rp.id = p.repost_of
       left join users ru on ru.id = rp.author_id
       where p.id = $1`,
      [result.rows[0].id, req.userId]
    )
    const post = postRow.rows[0] ? mapPost(postRow.rows[0]) : null
    if (post) {
      io.emit('post:new', { post })
    }
    res.json({ post })
  } catch (err) {
    console.error('Create post error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/posts/:id/like', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const existing = await pool.query(
      'select 1 from post_likes where post_id = $1 and user_id = $2',
      [postId, req.userId]
    )
    if (existing.rowCount > 0) {
      await pool.query('delete from post_likes where post_id = $1 and user_id = $2', [postId, req.userId])
    } else {
      await pool.query('insert into post_likes (post_id, user_id) values ($1, $2)', [postId, req.userId])
    }
    const count = await pool.query('select count(*) from post_likes where post_id = $1', [postId])
    res.json({ liked: existing.rowCount === 0, likesCount: Number(count.rows[0].count) })
  } catch (err) {
    console.error('Like error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/posts/:id/repost', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const original = await pool.query(
      'select id, author_id, repost_of from posts where id = $1 and deleted_at is null',
      [postId]
    )
    if (original.rowCount === 0) return res.status(404).json({ error: 'Post not found' })
    if (original.rows[0].repost_of && original.rows[0].author_id === req.userId) {
      return res.status(400).json({ error: 'Нельзя репостить свой репост' })
    }

    const existing = await pool.query(
      'select 1 from post_reposts where post_id = $1 and user_id = $2',
      [postId, req.userId]
    )

    let newPost = null
    let deletedPostId = null

    if (existing.rowCount > 0) {
      await pool.query('delete from post_reposts where post_id = $1 and user_id = $2', [postId, req.userId])
      const deleted = await pool.query(
        'delete from posts where repost_of = $1 and author_id = $2 returning id',
        [postId, req.userId]
      )
      deletedPostId = deleted.rows[0] ? deleted.rows[0].id : null
    } else {
      await pool.query('insert into post_reposts (post_id, user_id) values ($1, $2)', [postId, req.userId])
      const created = await pool.query(
        'insert into posts (author_id, body, image_url, repost_of) values ($1, $2, $3, $4) returning id',
        [req.userId, '', null, postId]
      )
      const postRow = await pool.query(
        `select p.id, p.body, p.image_url, p.repost_of, p.created_at,
                u.id as author_id, u.username as author_username,
                u.display_name as author_display_name, u.avatar_url as author_avatar_url,
                ru.username as repost_author_username, ru.display_name as repost_author_display_name,
                rp.body as repost_body, rp.image_url as repost_image_url, rp.created_at as repost_created_at,
                (select count(*) from post_likes pl where pl.post_id = p.id) as likes_count,
                (select count(*) from post_comments pc where pc.post_id = p.id) as comments_count,
                (select count(*) from post_reposts pr where pr.post_id = p.id) as reposts_count,
                exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = $2) as liked,
                exists(select 1 from post_reposts pr where pr.post_id = p.id and pr.user_id = $2) as reposted
         from posts p
         join users u on u.id = p.author_id
         left join posts rp on rp.id = p.repost_of
         left join users ru on ru.id = rp.author_id
         where p.id = $1`,
        [created.rows[0].id, req.userId]
      )
      newPost = postRow.rows[0] ? mapPost(postRow.rows[0]) : null
    }

    const count = await pool.query('select count(*) from post_reposts where post_id = $1', [postId])
    if (newPost) {
      io.emit('post:new', { post: newPost })
    }
    if (deletedPostId) {
      io.emit('post:delete', { postId: deletedPostId })
    }
    res.json({ reposted: existing.rowCount === 0, repostsCount: Number(count.rows[0].count) })
  } catch (err) {
    console.error('Repost error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/posts/:id/comments', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const result = await pool.query(
      `select c.id, c.body, c.created_at,
              u.id as user_id, u.username, u.display_name, u.avatar_url
       from post_comments c
       join users u on u.id = c.user_id
       where c.post_id = $1
       order by c.created_at asc
       limit 100`,
      [postId]
    )
    const comments = result.rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }))
    res.json({ comments })
  } catch (err) {
    console.error('Comments error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/posts/:id/comments', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const body = String(req.body.body || '').trim()
    if (!body) return res.status(400).json({ error: 'Комментарий пуст' })
    const result = await pool.query(
      `insert into post_comments (post_id, user_id, body)
       values ($1, $2, $3)
       returning id, body, created_at`,
      [postId, req.userId, body]
    )
    const userRow = await pool.query(
      'select id, username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    res.json({
      comment: {
        id: result.rows[0].id,
        body: result.rows[0].body,
        createdAt: result.rows[0].created_at,
        user: {
          id: userRow.rows[0].id,
          username: userRow.rows[0].username,
          displayName: userRow.rows[0].display_name,
          avatarUrl: userRow.rows[0].avatar_url
        }
      }
    })
  } catch (err) {
    console.error('Create comment error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.patch('/api/messages/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const messageId = req.params.id
    const body = String(req.body.body || '').trim()
    if (!body) return res.status(400).json({ error: 'Message is empty' })

    const msg = await pool.query(
      'select sender_id, conversation_id, deleted_at from messages where id = $1',
      [messageId]
    )
    if (msg.rowCount === 0) return res.status(404).json({ error: 'Message not found' })
    if (msg.rows[0].deleted_at) return res.json({ ok: true })

    const adminRow = await pool.query('select is_admin from users where id = $1', [req.userId])
    const isAdmin = adminRow.rows[0] && adminRow.rows[0].is_admin
    if (msg.rows[0].sender_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updated = await pool.query(
      `update messages
       set body = $1, edited_at = now()
       where id = $2
       returning id, body, attachment_url, edited_at, created_at, sender_id`,
      [body, messageId]
    )

    res.json({
      message: {
        id: updated.rows[0].id,
        body: updated.rows[0].body,
        attachmentUrl: updated.rows[0].attachment_url,
        editedAt: updated.rows[0].edited_at,
        createdAt: updated.rows[0].created_at,
        senderId: updated.rows[0].sender_id
      }
    })
  } catch (err) {
    console.error('Edit message error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/messages/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const messageId = req.params.id
    const msg = await pool.query(
      'select sender_id from messages where id = $1',
      [messageId]
    )
    if (msg.rowCount === 0) return res.status(404).json({ error: 'Message not found' })

    const adminRow = await pool.query('select is_admin from users where id = $1', [req.userId])
    const isAdmin = adminRow.rows[0] && adminRow.rows[0].is_admin
    if (msg.rows[0].sender_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await pool.query(
      `update messages
       set body = '[deleted]', deleted_at = now(), deleted_by = $2
       where id = $1`,
      [messageId, req.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete message error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.patch('/api/posts/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const body = String(req.body.body || '').trim()
    if (!body) return res.status(400).json({ error: 'Post is empty' })

    const post = await pool.query('select author_id from posts where id = $1 and deleted_at is null', [postId])
    if (post.rowCount === 0) return res.status(404).json({ error: 'Post not found' })

    const adminRow = await pool.query('select is_admin from users where id = $1', [req.userId])
    const isAdmin = adminRow.rows[0] && adminRow.rows[0].is_admin
    if (post.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await pool.query(
      'update posts set body = $1, edited_at = now() where id = $2',
      [body, postId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Edit post error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/posts/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const postId = req.params.id
    const post = await pool.query('select author_id from posts where id = $1 and deleted_at is null', [postId])
    if (post.rowCount === 0) return res.status(404).json({ error: 'Post not found' })

    const adminRow = await pool.query('select is_admin from users where id = $1', [req.userId])
    const isAdmin = adminRow.rows[0] && adminRow.rows[0].is_admin
    if (post.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await pool.query(
      'update posts set deleted_at = now(), deleted_by = $2 where id = $1',
      [postId, req.userId]
    )
    io.emit('post:delete', { postId })
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete post error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const result = await pool.query(
      `select id, username, display_name, is_banned, warnings_count, is_admin, is_moderator
       from users
       where ($1 = '' or username ilike $2)
       order by username
       limit 50`,
      [q, `${q}%`]
    )
    res.json({ users: result.rows })
  } catch (err) {
    console.error('Admin users error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/ban', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    await pool.query('update users set is_banned = true where id = $1', [userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Ban error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/unban', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    await pool.query('update users set is_banned = false where id = $1', [userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Unban error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/warn', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    const reason = String(req.body.reason || '').trim()
    await pool.query(
      'insert into warnings (user_id, admin_id, reason) values ($1, $2, $3)',
      [userId, req.userId, reason]
    )
    await pool.query('update users set warnings_count = warnings_count + 1 where id = $1', [userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Warn error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/clear-warnings', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    await pool.query('delete from warnings where user_id = $1', [userId])
    await pool.query('update users set warnings_count = 0 where id = $1', [userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Clear warnings error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/moder', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    const makeModerator = Boolean(req.body.makeModerator)
    await pool.query('update users set is_moderator = $2 where id = $1', [userId, makeModerator])
    res.json({ ok: true })
  } catch (err) {
    console.error('Moderator role error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/presence', auth, async (req, res) => {
  res.json({ online: Array.from(onlineUsers.keys()) })
})

app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Only images')) {
    return res.status(400).json({ error: 'Разрешены только изображения (jpg, png, webp)' })
  }
  if (err && err.message && err.message.includes('Only audio files')) {
    return res.status(400).json({ error: 'Разрешены только аудио файлы (mp3, wav, ogg, webm, m4a, aac)' })
  }
  console.error('Unhandled error', err)
  res.status(500).json({ error: 'Unexpected error' })
})

const port = process.env.PORT || 4000
server.listen(port, () => {
  console.log('Server listening on http://localhost:' + port)
})
