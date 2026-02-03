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
const uploadDir = path.join(__dirname, '..', 'uploads')

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me')) {
  console.error('JWT_SECRET must be set to a strong value in production.')
  process.exit(1)
}

fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname)}`
    cb(null, safeName)
  }
})

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
      return cb(new Error('Only images are allowed'))
    }
    cb(null, true)
  }
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

const onlineUsers = new Map()

app.disable('x-powered-by')
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}))
app.use(cors(corsOptions))
app.use(express.json({ limit: '200kb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter)
app.use('/uploads', express.static(uploadDir))

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
    createdAt: row.created_at
  }
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
    lastAt: row.last_at
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
            lm.created_at as last_at
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
  onlineUsers.set(socket.userId, socket.id)
  io.emit('presence', { userId: socket.userId, online: true })

  socket.on('call:offer', ({ toUserId, offer }) => {
    const targetSocket = onlineUsers.get(toUserId)
    if (!targetSocket) {
      socket.emit('call:unavailable', { toUserId })
      return
    }
    io.to(targetSocket).emit('call:offer', { fromUserId: socket.userId, offer })
  })

  socket.on('call:answer', ({ toUserId, answer }) => {
    const targetSocket = onlineUsers.get(toUserId)
    if (!targetSocket) return
    io.to(targetSocket).emit('call:answer', { fromUserId: socket.userId, answer })
  })

  socket.on('call:ice', ({ toUserId, candidate }) => {
    const targetSocket = onlineUsers.get(toUserId)
    if (!targetSocket) return
    io.to(targetSocket).emit('call:ice', { fromUserId: socket.userId, candidate })
  })

  socket.on('call:decline', ({ toUserId, reason }) => {
    const targetSocket = onlineUsers.get(toUserId)
    if (!targetSocket) return
    io.to(targetSocket).emit('call:decline', { fromUserId: socket.userId, reason })
  })

  socket.on('call:end', ({ toUserId }) => {
    const targetSocket = onlineUsers.get(toUserId)
    if (!targetSocket) return
    io.to(targetSocket).emit('call:end', { fromUserId: socket.userId })
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId)
    io.emit('presence', { userId: socket.userId, online: false })
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

    const user = mapUser(result.rows[0])
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

    const user = mapUser(userRow)
    const token = signToken(user.id)

    res.json({ token, user })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query('select * from users where id = $1', [req.userId])
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ user: mapUser(result.rows[0]) })
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

    res.json({ user: mapUser(result.rows[0]) })
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' })
    }
    console.error('Update error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/avatar', uploadLimiter, auth, ensureNotBanned, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' })
    }
    const avatarUrl = `/uploads/${req.file.filename}`
    const result = await pool.query(
      'update users set avatar_url = $1 where id = $2 returning *',
      [avatarUrl, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ user: mapUser(result.rows[0]) })
  } catch (err) {
    console.error('Avatar upload error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/banner', uploadLimiter, auth, ensureNotBanned, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' })
    }
    const bannerUrl = `/uploads/${req.file.filename}`
    const result = await pool.query(
      'update users set banner_url = $1 where id = $2 returning *',
      [bannerUrl, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ user: mapUser(result.rows[0]) })
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
    const result = await pool.query(
      `select id, username, display_name, role, bio, avatar_url, banner_url, theme_color, created_at
       from users
       where username = $1`,
      [username]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({
      user: mapUser(result.rows[0])
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
              u.id as sender_id, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url
       from messages m
       left join users u on u.id = m.sender_id
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`,
      [conversationId]
    )

    const messages = result.rows.map((row) => ({
      id: row.id,
      body: row.body,
      attachmentUrl: row.attachment_url,
      createdAt: row.created_at,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      senderDisplayName: row.sender_display_name,
      senderAvatarUrl: row.sender_avatar_url
    }))

    res.json({ messages })
  } catch (err) {
    console.error('Messages error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations/:id/messages', messageLimiter, auth, ensureNotBanned, upload.single('file'), async (req, res) => {
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

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null

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
      senderAvatarUrl: sender.avatar_url || null
    }

    io.emit('message', { conversationId, message })

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

app.post('/api/posts', uploadLimiter, auth, ensureNotBanned, upload.single('image'), async (req, res) => {
  try {
    const body = req.body.body || ''
    if (!req.file && !isValidMessage(body)) {
      return res.status(400).json({ error: 'Пустой пост' })
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null
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
  console.error('Unhandled error', err)
  res.status(500).json({ error: 'Unexpected error' })
})

const port = process.env.PORT || 4000
server.listen(port, () => {
  console.log('Server listening on http://localhost:' + port)
})
