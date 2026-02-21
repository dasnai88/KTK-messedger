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
const profileStatusTextMaxLength = 80
const profileStatusEmojiMaxLength = 16
const stickerTitleMaxLength = 48
const gifTitleMaxLength = 48
const pollQuestionMaxLength = 240
const pollOptionMaxLength = 120
const pollOptionMinCount = 2
const pollOptionMaxCount = 10

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

function createUpload({
  mimeTypes,
  extensions,
  maxFileSizeMb,
  errorMessage,
  allowWithoutExtension = false,
  allowOctetStreamByExtension = false,
  mimePrefixes = [],
  allowAnyExtensionWhenMimePrefix = false,
  allowUnknownMimeByExtension = false
}) {
  const allowedMimeTypes = new Set(mimeTypes)
  const allowedExtensions = new Set(extensions)
  const normalizedMimePrefixes = (Array.isArray(mimePrefixes) ? mimePrefixes : [])
    .map((prefix) => String(prefix || '').trim().toLowerCase())
    .filter(Boolean)
  return multer({
    storage: useDbStorage ? multer.memoryStorage() : diskStorage,
    limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase()
      const rawMime = String(file.mimetype || '').trim().toLowerCase()
      const mime = rawMime.split(';')[0]
      const mimeAllowed = allowedMimeTypes.has(rawMime) || allowedMimeTypes.has(mime)
      const mimePrefixAllowed = normalizedMimePrefixes.some((prefix) => rawMime.startsWith(prefix) || mime.startsWith(prefix))
      const extAllowed = allowedExtensions.has(ext)
      const noExtAllowed = allowWithoutExtension && !ext
      const octetLikeMime = (
        mime === 'application/octet-stream' ||
        mime === 'application/octetstream' ||
        mime === 'binary/octet-stream'
      )
      const octetStreamFallback = allowOctetStreamByExtension && octetLikeMime && (extAllowed || noExtAllowed)
      const unknownMimeFallback = allowUnknownMimeByExtension && !mime && extAllowed
      const unknownMimeNoExtFallback = allowUnknownMimeByExtension && !mime && noExtAllowed
      const extAccepted = extAllowed || noExtAllowed || (allowAnyExtensionWhenMimePrefix && mimePrefixAllowed)
      const mimeAccepted = mimeAllowed || mimePrefixAllowed

      if (!((mimeAccepted && extAccepted) || octetStreamFallback || unknownMimeFallback || unknownMimeNoExtFallback)) {
        return cb(new Error(errorMessage))
      }
      cb(null, true)
    }
  })
}

const imageUpload = createUpload({
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  maxFileSizeMb: 5,
  errorMessage: 'Only images are allowed'
})

const gifUpload = createUpload({
  mimeTypes: ['image/gif'],
  extensions: ['.gif'],
  maxFileSizeMb: 12,
  errorMessage: 'Only GIF files are allowed',
  allowWithoutExtension: true,
  allowOctetStreamByExtension: true,
  allowUnknownMimeByExtension: true
})

const audioUpload = createUpload({
  mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac'],
  extensions: ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'],
  maxFileSizeMb: 20,
  errorMessage: 'Only audio files are allowed'
})

const messageUpload = createUpload({
  mimeTypes: [
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2'
  ],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.ogv', '.ogg', '.mov', '.m4v', '.mkv', '.3gp', '.3g2'],
  maxFileSizeMb: 30,
  errorMessage: 'Only image or video attachments are allowed',
  allowWithoutExtension: true,
  allowOctetStreamByExtension: true,
  mimePrefixes: ['image/', 'video/'],
  allowAnyExtensionWhenMimePrefix: true,
  allowUnknownMimeByExtension: true
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

function normalizeReactionEmoji(value) {
  const emoji = String(value || '').trim()
  if (!emoji) return ''
  if (emoji.length > 16) return ''
  return emoji
}

function isValidUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getMessagePreviewText(body, attachmentUrl, attachmentKind) {
  const text = typeof body === 'string' ? body.trim() : ''
  if (text) {
    return text.length > 120 ? `${text.slice(0, 117)}...` : text
  }
  if (attachmentUrl) {
    if (attachmentKind === 'gif') return 'GIF'
    if (attachmentKind === 'sticker') return 'Sticker'
    if (attachmentKind === 'video-note') return 'Video note'
    if (attachmentKind === 'video') return 'Video'
    return 'Photo'
  }
  return 'New message'
}

const imageAttachmentExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const videoAttachmentExtensions = new Set(['.mp4', '.webm', '.ogv', '.ogg', '.mov', '.m4v', '.mkv', '.3gp', '.3g2'])

function normalizeMessageAttachmentKind(file, requestedKind) {
  if (!file) return null
  const mime = String(file.mimetype || '').toLowerCase()
  const requested = typeof requestedKind === 'string' ? requestedKind.trim().toLowerCase() : ''
  const extension = path.extname(file.originalname || '').toLowerCase()
  if (mime.startsWith('video/')) {
    return requested === 'video-note' ? 'video-note' : 'video'
  }
  if (mime.startsWith('image/')) {
    if (requested === 'gif') return 'gif'
    return requested === 'sticker' ? 'sticker' : 'image'
  }
  if (videoAttachmentExtensions.has(extension)) {
    return requested === 'video-note' ? 'video-note' : 'video'
  }
  if (imageAttachmentExtensions.has(extension)) {
    if (requested === 'gif') return 'gif'
    return requested === 'sticker' ? 'sticker' : 'image'
  }
  if (requested === 'video-note' || requested === 'video') return requested === 'video-note' ? 'video-note' : 'video'
  if (requested === 'sticker') return 'sticker'
  if (requested === 'gif') return 'gif'
  if (requested === 'image') return 'image'
  return null
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
    statusText: row.status_text || '',
    statusEmoji: row.status_emoji || '',
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

function mapSticker(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || '',
    imageUrl: row.image_url,
    mimeType: row.mime_type || null,
    createdAt: row.created_at
  }
}

function mapGif(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || '',
    imageUrl: row.image_url,
    mimeType: row.mime_type || null,
    createdAt: row.created_at
  }
}

function isProfileFeaturesSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('user_subscriptions') || message.includes('profile_tracks')
}

function isStickerFeaturesSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('user_stickers')
}

function isGifFeaturesSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('user_gifs')
}

function isAttachmentKindConstraintError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '23514') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('attachment_kind')
}

async function getUserByIdWithStats(userId, viewerId) {
  try {
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
  } catch (err) {
    if (!isProfileFeaturesSchemaError(err)) throw err
    const fallback = await pool.query(
      `select u.*,
              0::int as subscribers_count,
              0::int as subscriptions_count,
              0::int as tracks_count,
              false as is_subscribed
       from users u
       where u.id = $1`,
      [userId]
    )
    if (fallback.rowCount === 0) return null
    return mapUser(fallback.rows[0])
  }
}

async function getUserByUsernameWithStats(username, viewerId) {
  try {
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
  } catch (err) {
    if (!isProfileFeaturesSchemaError(err)) throw err
    const fallback = await pool.query(
      `select u.*,
              0::int as subscribers_count,
              0::int as subscriptions_count,
              0::int as tracks_count,
              false as is_subscribed
       from users u
       where u.username = $1`,
      [username]
    )
    if (fallback.rowCount === 0) return null
    return mapUser(fallback.rows[0])
  }
}

function mapOtherUser(row) {
  return {
    id: row.other_id,
    username: row.other_username,
    displayName: row.other_display_name,
    role: row.other_role,
    avatarUrl: row.other_avatar_url,
    statusText: row.other_status_text || '',
    statusEmoji: row.other_status_emoji || ''
  }
}

function mapConversation(row) {
  return {
    id: row.id,
    title: row.title,
    isGroup: row.is_group,
    isFavorite: row.is_favorite === true,
    other: row.other_id ? mapOtherUser(row) : null,
    lastMessage: getMessagePreviewText(row.last_body, row.last_attachment_url, row.last_attachment_kind),
    lastAt: row.last_at,
    unreadCount: Number(row.unread_count || 0)
  }
}

function isMessageReactionsSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('message_reactions')
}

function isMessageReplySchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('reply_to_id') || message.includes('reply_')
}

function isMessagePollSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703' && err.code !== '23514') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('message_polls') || message.includes('message_poll_votes') || message.includes('poll')
}

function normalizePollQuestion(value) {
  return String(value || '').trim().slice(0, pollQuestionMaxLength)
}

function normalizePollOptionText(value) {
  return String(value || '').trim().slice(0, pollOptionMaxLength)
}

function normalizePollOptionId(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 ? value : -1
  }
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  if (!Number.isInteger(parsed) || parsed < 0) return -1
  return parsed
}

function normalizePollOptionsValue(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return normalizePollOptionText(item)
      if (item && typeof item === 'object') {
        if (typeof item.text === 'string') return normalizePollOptionText(item.text)
        if (typeof item.label === 'string') return normalizePollOptionText(item.label)
      }
      return ''
    })
    .filter(Boolean)
    .slice(0, pollOptionMaxCount)
}

function normalizePollOptionsInput(value) {
  return normalizePollOptionsValue(value)
}

function buildPollPayload({
  question,
  allowsMultiple,
  options,
  voteCountsByOptionId = new Map(),
  selectedOptionIds = new Set(),
  participantsCount = 0
}) {
  const normalizedOptions = normalizePollOptionsValue(options)
  const pollOptions = normalizedOptions.map((text, index) => {
    const rawVotes = voteCountsByOptionId instanceof Map ? voteCountsByOptionId.get(index) : 0
    const votes = Number.isFinite(Number(rawVotes)) ? Math.max(0, Number(rawVotes)) : 0
    return {
      id: index,
      text,
      votes,
      selected: selectedOptionIds instanceof Set ? selectedOptionIds.has(index) : false
    }
  })
  const totalVotes = pollOptions.reduce((sum, option) => sum + option.votes, 0)
  return {
    question: normalizePollQuestion(question),
    allowsMultiple: allowsMultiple === true,
    options: pollOptions,
    totalVotes,
    participantsCount: Number.isFinite(Number(participantsCount)) ? Math.max(0, Number(participantsCount)) : 0
  }
}

function normalizeMessageReactions(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const emoji = typeof item.emoji === 'string' ? item.emoji : ''
      const count = Number(item.count || 0)
      return {
        emoji,
        count: Number.isFinite(count) ? count : 0,
        reacted: item.reacted === true
      }
    })
    .filter((item) => item.emoji && item.count > 0)
}

function mapMessageRow(row) {
  const replyTo = row.reply_id ? {
    id: row.reply_id,
    body: row.reply_body,
    attachmentUrl: row.reply_attachment_url,
    attachmentMime: row.reply_attachment_mime || null,
    attachmentKind: row.reply_attachment_kind || null,
    deletedAt: row.reply_deleted_at || null,
    senderId: row.reply_sender_id || null,
    senderUsername: row.reply_sender_username || null,
    senderDisplayName: row.reply_sender_display_name || null,
    senderAvatarUrl: row.reply_sender_avatar_url || null
  } : null

  return {
    id: row.id,
    body: row.body,
    attachmentUrl: row.attachment_url,
    attachmentMime: row.attachment_mime,
    attachmentKind: row.attachment_kind,
    editedAt: row.edited_at || null,
    createdAt: row.created_at,
    senderId: row.sender_id,
    senderUsername: row.sender_username || null,
    senderDisplayName: row.sender_display_name || null,
    senderAvatarUrl: row.sender_avatar_url || null,
    readByOther: row.read_by_other === true,
    replyTo,
    reactions: normalizeMessageReactions(row.reactions)
  }
}

async function getMessageReactions(messageId, viewerId) {
  const result = await pool.query(
    `select mr.emoji,
            count(*)::int as reaction_count,
            bool_or(mr.user_id = $2) as reacted
     from message_reactions mr
     where mr.message_id = $1
     group by mr.emoji
     order by reaction_count desc, mr.emoji asc`,
    [messageId, viewerId]
  )
  return result.rows.map((row) => ({
    emoji: row.emoji,
    count: Number(row.reaction_count || 0),
    reacted: row.reacted === true
  }))
}

function mapPollVoteCountMap(value) {
  const map = new Map()
  if (!Array.isArray(value)) return map
  value.forEach((item) => {
    const optionId = normalizePollOptionId(item && item.optionId)
    const count = Number(item && item.count)
    if (optionId < 0 || !Number.isFinite(count) || count <= 0) return
    map.set(optionId, count)
  })
  return map
}

function mapPollSelectedSet(value) {
  const set = new Set()
  if (!Array.isArray(value)) return set
  value.forEach((item) => {
    const optionId = normalizePollOptionId(item)
    if (optionId >= 0) {
      set.add(optionId)
    }
  })
  return set
}

function mapPollRow(row) {
  return buildPollPayload({
    question: row.question,
    allowsMultiple: row.allows_multiple === true,
    options: row.options,
    voteCountsByOptionId: mapPollVoteCountMap(row.option_votes),
    selectedOptionIds: mapPollSelectedSet(row.selected_options),
    participantsCount: Number(row.participants_count || 0)
  })
}

async function getPollPayloadForMessage(messageId, viewerId, fallback = null) {
  const result = await pool.query(
    `select mp.message_id,
            mp.question,
            mp.options,
            mp.allows_multiple,
            coalesce(votes.option_votes, '[]'::json) as option_votes,
            coalesce(selected.selected_options, '[]'::json) as selected_options,
            coalesce(participants.participants_count, 0)::int as participants_count
     from message_polls mp
     left join lateral (
       select json_agg(
                json_build_object(
                  'optionId', poll_votes.option_id,
                  'count', poll_votes.vote_count
                )
                order by poll_votes.option_id asc
              ) as option_votes
       from (
         select mpv.option_id, count(*)::int as vote_count
         from message_poll_votes mpv
         where mpv.message_id = mp.message_id
         group by mpv.option_id
       ) poll_votes
     ) votes on true
     left join lateral (
       select json_agg(mpv.option_id order by mpv.option_id asc) as selected_options
       from message_poll_votes mpv
       where mpv.message_id = mp.message_id and mpv.user_id = $2
     ) selected on true
     left join lateral (
       select count(distinct mpv.user_id)::int as participants_count
       from message_poll_votes mpv
       where mpv.message_id = mp.message_id
     ) participants on true
     where mp.message_id = $1
     limit 1`,
    [messageId, viewerId]
  )
  if (result.rowCount > 0) {
    return mapPollRow(result.rows[0])
  }
  if (!fallback || typeof fallback !== 'object') return null
  return buildPollPayload({
    question: fallback.question || '',
    allowsMultiple: fallback.allowsMultiple === true,
    options: fallback.options
  })
}

async function attachPollDataToMessages(messages, viewerId) {
  if (!Array.isArray(messages) || messages.length === 0) return messages
  const messageIds = messages
    .map((message) => message && message.id)
    .filter((id) => typeof id === 'string')
  if (messageIds.length === 0) return messages

  try {
    const result = await pool.query(
      `select mp.message_id,
              mp.question,
              mp.options,
              mp.allows_multiple,
              coalesce(votes.option_votes, '[]'::json) as option_votes,
              coalesce(selected.selected_options, '[]'::json) as selected_options,
              coalesce(participants.participants_count, 0)::int as participants_count
       from message_polls mp
       left join lateral (
         select json_agg(
                  json_build_object(
                    'optionId', poll_votes.option_id,
                    'count', poll_votes.vote_count
                  )
                  order by poll_votes.option_id asc
                ) as option_votes
         from (
           select mpv.option_id, count(*)::int as vote_count
           from message_poll_votes mpv
           where mpv.message_id = mp.message_id
           group by mpv.option_id
         ) poll_votes
       ) votes on true
       left join lateral (
         select json_agg(mpv.option_id order by mpv.option_id asc) as selected_options
         from message_poll_votes mpv
         where mpv.message_id = mp.message_id and mpv.user_id = $2
       ) selected on true
       left join lateral (
         select count(distinct mpv.user_id)::int as participants_count
         from message_poll_votes mpv
         where mpv.message_id = mp.message_id
       ) participants on true
       where mp.message_id = any($1::uuid[])`,
      [messageIds, viewerId]
    )

    if (result.rowCount === 0) return messages

    const pollByMessageId = new Map()
    result.rows.forEach((row) => {
      pollByMessageId.set(row.message_id, mapPollRow(row))
    })

    return messages.map((message) => {
      if (!message || !message.id) return message
      const poll = pollByMessageId.get(message.id)
      if (!poll) return message
      return { ...message, poll }
    })
  } catch (err) {
    if (isMessagePollSchemaError(err)) {
      return messages
    }
    throw err
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

async function getPostByIdForViewer(postId, viewerId) {
  const result = await pool.query(
    `select p.id, p.body, p.image_url, p.repost_of, p.edited_at, p.deleted_at, p.created_at,
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
    [postId, viewerId]
  )
  if (result.rowCount === 0) return null
  return mapPost(result.rows[0])
}

async function getUserConversations(userId) {
  const queryWithFavorites = `select c.id,
            c.title,
            c.is_group,
            me.is_favorite,
            u.id as other_id,
            u.username as other_username,
            u.display_name as other_display_name,
            u.role as other_role,
            u.avatar_url as other_avatar_url,
            u.status_text as other_status_text,
            u.status_emoji as other_status_emoji,
            lm.body as last_body,
            lm.attachment_url as last_attachment_url,
            lm.attachment_kind as last_attachment_kind,
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
        select m.body, m.attachment_url, m.attachment_kind, m.created_at, m.sender_id
        from messages m
        where m.conversation_id = c.id and m.deleted_at is null
        order by m.created_at desc
        limit 1
      ) lm on true
     order by me.is_favorite desc, lm.created_at desc nulls last, c.created_at desc`

  const queryWithoutFavorites = `select c.id,
            c.title,
            c.is_group,
            false as is_favorite,
            u.id as other_id,
            u.username as other_username,
            u.display_name as other_display_name,
            u.role as other_role,
            u.avatar_url as other_avatar_url,
            null::text as other_status_text,
            null::text as other_status_emoji,
            lm.body as last_body,
            lm.attachment_url as last_attachment_url,
            lm.attachment_kind as last_attachment_kind,
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
        select m.body, m.attachment_url, m.attachment_kind, m.created_at, m.sender_id
        from messages m
        where m.conversation_id = c.id and m.deleted_at is null
        order by m.created_at desc
        limit 1
      ) lm on true
     order by lm.created_at desc nulls last, c.created_at desc`

  try {
    const result = await pool.query(queryWithFavorites, [userId])
    return result.rows.map(mapConversation)
  } catch (err) {
    if (!err || err.code !== '42703') throw err
    const fallback = await pool.query(queryWithoutFavorites, [userId])
    return fallback.rows.map(mapConversation)
  }
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
    const statusText = typeof req.body.statusText === 'string'
      ? String(req.body.statusText).trim().slice(0, profileStatusTextMaxLength)
      : null
    const statusEmoji = typeof req.body.statusEmoji === 'string'
      ? String(req.body.statusEmoji).trim().slice(0, profileStatusEmojiMaxLength)
      : null

    if (username && !isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3+ chars and contain only a-z, 0-9, _' })
    }
    if (role && !roles.some((item) => item.value === role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (themeColor && !/^#([0-9a-fA-F]{6})$/.test(themeColor)) {
      return res.status(400).json({ error: 'Theme color must be hex like #1a2b3c' })
    }
    if (statusEmoji && statusEmoji.length > profileStatusEmojiMaxLength) {
      return res.status(400).json({ error: 'Status emoji is too long' })
    }
    if (statusText && statusText.length > profileStatusTextMaxLength) {
      return res.status(400).json({ error: 'Status text is too long' })
    }

    let result
    try {
      result = await pool.query(
        `update users
         set display_name = coalesce($1, display_name),
             bio = coalesce($2, bio),
             role = coalesce($3, role),
             username = coalesce($4, username),
             theme_color = coalesce($5, theme_color),
             status_text = coalesce($6, status_text),
             status_emoji = coalesce($7, status_emoji)
         where id = $8
         returning *`,
        [displayName, bio, role, username, themeColor, statusText, statusEmoji, req.userId]
      )
    } catch (err) {
      if (!(err && err.code === '42703')) {
        throw err
      }
      result = await pool.query(
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
    }

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

app.get('/api/me/stickers', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, user_id, title, image_url, mime_type, created_at
       from user_stickers
       where user_id = $1
       order by created_at desc
       limit 400`,
      [req.userId]
    )
    res.json({ stickers: result.rows.map(mapSticker) })
  } catch (err) {
    if (isStickerFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Sticker feature is unavailable: database migration required' })
    }
    console.error('Get stickers error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/stickers', uploadLimiter, auth, ensureNotBanned, imageUpload.single('sticker'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Sticker image is required' })
    }
    const rawTitle = typeof req.body.title === 'string' ? req.body.title.trim() : ''
    const title = rawTitle.slice(0, stickerTitleMaxLength) || null
    const imageUrl = await storeUpload(req.file)
    const mimeType = req.file.mimetype || null
    const result = await pool.query(
      `insert into user_stickers (user_id, title, image_url, mime_type)
       values ($1, $2, $3, $4)
       returning id, user_id, title, image_url, mime_type, created_at`,
      [req.userId, title, imageUrl, mimeType]
    )
    res.json({ sticker: mapSticker(result.rows[0]) })
  } catch (err) {
    if (isStickerFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Sticker feature is unavailable: database migration required' })
    }
    console.error('Upload sticker error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/me/stickers/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const stickerId = req.params.id
    const result = await pool.query(
      `delete from user_stickers
       where id = $1 and user_id = $2
       returning id`,
      [stickerId, req.userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    res.json({ ok: true, stickerId })
  } catch (err) {
    if (isStickerFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Sticker feature is unavailable: database migration required' })
    }
    console.error('Delete sticker error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me/gifs', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, user_id, title, image_url, mime_type, created_at
       from user_gifs
       where user_id = $1
       order by created_at desc
       limit 400`,
      [req.userId]
    )
    res.json({ gifs: result.rows.map(mapGif) })
  } catch (err) {
    if (isGifFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'GIF feature is unavailable: database migration required' })
    }
    console.error('Get gifs error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/gifs', uploadLimiter, auth, ensureNotBanned, gifUpload.single('gif'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'GIF file is required' })
    }
    const rawTitle = typeof req.body.title === 'string' ? req.body.title.trim() : ''
    const title = rawTitle.slice(0, gifTitleMaxLength) || null
    const imageUrl = await storeUpload(req.file)
    const mimeType = req.file.mimetype || null
    const result = await pool.query(
      `insert into user_gifs (user_id, title, image_url, mime_type)
       values ($1, $2, $3, $4)
       returning id, user_id, title, image_url, mime_type, created_at`,
      [req.userId, title, imageUrl, mimeType]
    )
    res.json({ gif: mapGif(result.rows[0]) })
  } catch (err) {
    if (isGifFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'GIF feature is unavailable: database migration required' })
    }
    console.error('Upload gif error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.delete('/api/me/gifs/:id', auth, ensureNotBanned, async (req, res) => {
  try {
    const gifId = req.params.id
    const result = await pool.query(
      `delete from user_gifs
       where id = $1 and user_id = $2
       returning id`,
      [gifId, req.userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'GIF not found' })
    }
    res.json({ ok: true, gifId })
  } catch (err) {
    if (isGifFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'GIF feature is unavailable: database migration required' })
    }
    console.error('Delete gif error', err)
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
    if (isProfileFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Profile music feature is unavailable: database migration required' })
    }
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
    if (isProfileFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Subscription feature is unavailable: database migration required' })
    }
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
    if (isProfileFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Profile music feature is unavailable: database migration required' })
    }
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
    if (isProfileFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Profile music feature is unavailable: database migration required' })
    }
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

    let convo
    try {
      convo = await pool.query(
        `select c.id,
                c.title,
                c.is_group,
                u.id as other_id,
                u.username as other_username,
                u.display_name as other_display_name,
                u.role as other_role,
                u.avatar_url as other_avatar_url,
                u.status_text as other_status_text,
                u.status_emoji as other_status_emoji,
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
    } catch (err) {
      if (!(err && err.code === '42703')) {
        throw err
      }
      convo = await pool.query(
        `select c.id,
                c.title,
                c.is_group,
                u.id as other_id,
                u.username as other_username,
                u.display_name as other_display_name,
                u.role as other_role,
                u.avatar_url as other_avatar_url,
                null::text as other_status_text,
                null::text as other_status_emoji,
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
    }

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

app.post('/api/conversations/:id/favorite', auth, ensureNotBanned, async (req, res) => {
  const conversationId = req.params.id
  const favorite = req.body && typeof req.body.favorite === 'boolean' ? req.body.favorite : null
  if (favorite === null) {
    return res.status(400).json({ error: 'Favorite flag must be boolean' })
  }
  try {
    const updated = await pool.query(
      `update conversation_members
       set is_favorite = $3
       where conversation_id = $1 and user_id = $2
       returning conversation_id, is_favorite`,
      [conversationId, req.userId, favorite]
    )
    if (updated.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const conversations = await getUserConversations(req.userId)
    const conversation = conversations.find((item) => item.id === conversationId) || null
    res.json({
      ok: true,
      isFavorite: updated.rows[0].is_favorite === true,
      conversation
    })
  } catch (err) {
    if (err && err.code === '42703') {
      return res.status(503).json({ error: 'Favorites feature is unavailable: database migration required' })
    }
    console.error('Favorite conversation error', err)
    res.status(500).json({ error: 'Unexpected error' })
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

    const messagesQueryWithReactions = `select m.id,
              m.body,
              m.attachment_url,
              m.attachment_mime,
              m.attachment_kind,
              m.reply_to_id,
              m.edited_at,
              m.created_at,
              u.id as sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              u.avatar_url as sender_avatar_url,
              rm.id as reply_id,
              rm.body as reply_body,
              rm.attachment_url as reply_attachment_url,
              rm.attachment_mime as reply_attachment_mime,
              rm.attachment_kind as reply_attachment_kind,
              rm.deleted_at as reply_deleted_at,
              ru.id as reply_sender_id,
              ru.username as reply_sender_username,
              ru.display_name as reply_sender_display_name,
              ru.avatar_url as reply_sender_avatar_url,
              c.is_group,
              (c.is_group = false
                and m.sender_id = $2
                and other.last_read_at is not null
                and m.created_at <= other.last_read_at) as read_by_other,
              coalesce((
                select json_agg(
                  json_build_object(
                    'emoji', reaction.emoji,
                    'count', reaction.reaction_count,
                    'reacted', reaction.reacted
                  )
                  order by reaction.reaction_count desc, reaction.emoji asc
                )
               from (
                  select mr.emoji,
                         count(*)::int as reaction_count,
                         bool_or(mr.user_id = $2) as reacted
                  from message_reactions mr
                  where mr.message_id = m.id
                  group by mr.emoji
                ) reaction
              ), '[]'::json) as reactions
       from messages m
       join conversations c on c.id = m.conversation_id
       left join users u on u.id = m.sender_id
       left join messages rm on rm.id = m.reply_to_id and rm.conversation_id = m.conversation_id
       left join users ru on ru.id = rm.sender_id
       left join conversation_members other
         on other.conversation_id = c.id
        and other.user_id <> $2
        and c.is_group = false
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`

    const messagesQueryWithReactionsLegacy = `select m.id,
              m.body,
              m.attachment_url,
              m.attachment_mime,
              m.attachment_kind,
              m.edited_at,
              m.created_at,
              u.id as sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              u.avatar_url as sender_avatar_url,
              c.is_group,
              (c.is_group = false
                and m.sender_id = $2
                and other.last_read_at is not null
                and m.created_at <= other.last_read_at) as read_by_other,
              coalesce((
                select json_agg(
                  json_build_object(
                    'emoji', reaction.emoji,
                    'count', reaction.reaction_count,
                    'reacted', reaction.reacted
                  )
                  order by reaction.reaction_count desc, reaction.emoji asc
                )
                from (
                  select mr.emoji,
                         count(*)::int as reaction_count,
                         bool_or(mr.user_id = $2) as reacted
                  from message_reactions mr
                  where mr.message_id = m.id
                  group by mr.emoji
                ) reaction
              ), '[]'::json) as reactions
       from messages m
       join conversations c on c.id = m.conversation_id
       left join users u on u.id = m.sender_id
       left join conversation_members other
         on other.conversation_id = c.id
        and other.user_id <> $2
        and c.is_group = false
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`

    const messagesQueryWithoutReactions = `select m.id,
              m.body,
              m.attachment_url,
              m.attachment_mime,
              m.attachment_kind,
              m.reply_to_id,
              m.edited_at,
              m.created_at,
              u.id as sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              u.avatar_url as sender_avatar_url,
              rm.id as reply_id,
              rm.body as reply_body,
              rm.attachment_url as reply_attachment_url,
              rm.attachment_mime as reply_attachment_mime,
              rm.attachment_kind as reply_attachment_kind,
              rm.deleted_at as reply_deleted_at,
              ru.id as reply_sender_id,
              ru.username as reply_sender_username,
              ru.display_name as reply_sender_display_name,
              ru.avatar_url as reply_sender_avatar_url,
              c.is_group,
              (c.is_group = false
                and m.sender_id = $2
                and other.last_read_at is not null
                and m.created_at <= other.last_read_at) as read_by_other,
              '[]'::json as reactions
       from messages m
       join conversations c on c.id = m.conversation_id
       left join users u on u.id = m.sender_id
       left join messages rm on rm.id = m.reply_to_id and rm.conversation_id = m.conversation_id
       left join users ru on ru.id = rm.sender_id
       left join conversation_members other
         on other.conversation_id = c.id
        and other.user_id <> $2
        and c.is_group = false
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`

    const messagesQueryWithoutReactionsLegacy = `select m.id,
              m.body,
              m.attachment_url,
              m.attachment_mime,
              m.attachment_kind,
              m.edited_at,
              m.created_at,
              u.id as sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              u.avatar_url as sender_avatar_url,
              c.is_group,
              (c.is_group = false
                and m.sender_id = $2
                and other.last_read_at is not null
                and m.created_at <= other.last_read_at) as read_by_other,
              '[]'::json as reactions
       from messages m
       join conversations c on c.id = m.conversation_id
       left join users u on u.id = m.sender_id
       left join conversation_members other
         on other.conversation_id = c.id
        and other.user_id <> $2
        and c.is_group = false
       where m.conversation_id = $1 and m.deleted_at is null
       order by m.created_at asc
       limit 200`

    let result
    try {
      result = await pool.query(messagesQueryWithReactions, [conversationId, req.userId])
    } catch (err) {
      if (isMessageReactionsSchemaError(err)) {
        try {
          result = await pool.query(messagesQueryWithoutReactions, [conversationId, req.userId])
        } catch (innerErr) {
          if (!isMessageReplySchemaError(innerErr)) throw innerErr
          result = await pool.query(messagesQueryWithoutReactionsLegacy, [conversationId, req.userId])
        }
      } else if (isMessageReplySchemaError(err)) {
        try {
          result = await pool.query(messagesQueryWithReactionsLegacy, [conversationId, req.userId])
        } catch (innerErr) {
          if (!isMessageReactionsSchemaError(innerErr)) throw innerErr
          result = await pool.query(messagesQueryWithoutReactionsLegacy, [conversationId, req.userId])
        }
      } else {
        throw err
      }
    }

    const mappedMessages = result.rows.map(mapMessageRow)
    const messages = await attachPollDataToMessages(mappedMessages, req.userId)

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

app.post('/api/conversations/:id/polls', messageLimiter, auth, ensureNotBanned, async (req, res) => {
  const conversationId = req.params.id
  const question = normalizePollQuestion(req.body && req.body.question)
  const rawOptions = Array.isArray(req.body && req.body.options) ? req.body.options : []
  const options = normalizePollOptionsInput(rawOptions)
  const allowsMultiple = req.body && req.body.allowsMultiple === true

  if (!question) {
    return res.status(400).json({ error: 'Poll question is required' })
  }
  if (rawOptions.length > pollOptionMaxCount) {
    return res.status(400).json({ error: `Too many options (max ${pollOptionMaxCount})` })
  }
  if (options.length < pollOptionMinCount) {
    return res.status(400).json({ error: `At least ${pollOptionMinCount} options are required` })
  }
  if (new Set(options.map((option) => option.toLowerCase())).size < pollOptionMinCount) {
    return res.status(400).json({ error: 'Poll options must be unique' })
  }

  const client = await pool.connect()
  try {
    const membership = await client.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
      [conversationId, req.userId]
    )
    if (membership.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const conversationResult = await client.query(
      'select is_group, title from conversations where id = $1',
      [conversationId]
    )
    if (conversationResult.rowCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const membersResult = await client.query(
      `select cm.user_id, u.username, u.display_name
       from conversation_members cm
       join users u on u.id = cm.user_id
       where cm.conversation_id = $1`,
      [conversationId]
    )

    let insertedMessage
    await client.query('begin')
    try {
      insertedMessage = await client.query(
        `insert into messages (conversation_id, sender_id, body)
         values ($1, $2, $3)
         returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
        [conversationId, req.userId, question]
      )
      await client.query(
        `insert into message_polls (message_id, question, options, allows_multiple, created_by)
         values ($1, $2, $3::jsonb, $4, $5)`,
        [insertedMessage.rows[0].id, question, JSON.stringify(options), allowsMultiple, req.userId]
      )
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    }

    const senderRow = await client.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderRow.rows[0] || {}

    const message = {
      id: insertedMessage.rows[0].id,
      body: insertedMessage.rows[0].body,
      attachmentUrl: insertedMessage.rows[0].attachment_url,
      attachmentMime: insertedMessage.rows[0].attachment_mime,
      attachmentKind: insertedMessage.rows[0].attachment_kind,
      editedAt: null,
      createdAt: insertedMessage.rows[0].created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo: null,
      reactions: [],
      poll: buildPollPayload({
        question,
        allowsMultiple,
        options
      })
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
        body: `📊 ${question}`,
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
    if (isMessagePollSchemaError(err)) {
      return res.status(503).json({ error: 'Poll feature is unavailable: database migration required' })
    }
    console.error('Create poll error', err)
    res.status(500).json({ error: 'Unexpected error' })
  } finally {
    client.release()
  }
})

app.post('/api/conversations/:id/stickers', messageLimiter, auth, ensureNotBanned, async (req, res) => {
  try {
    const conversationId = req.params.id
    const stickerId = typeof req.body.stickerId === 'string' ? req.body.stickerId.trim() : ''
    const rawReplyToMessageId = typeof req.body.replyToMessageId === 'string' ? req.body.replyToMessageId.trim() : ''

    if (!stickerId || !isValidUuid(stickerId)) {
      return res.status(400).json({ error: 'Sticker id is required' })
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

    const stickerResult = await pool.query(
      `select id, user_id, title, image_url, mime_type, created_at
       from user_stickers
       where id = $1 and user_id = $2
       limit 1`,
      [stickerId, req.userId]
    )
    if (stickerResult.rowCount === 0) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    const sticker = stickerResult.rows[0]

    let replyToMessageId = null
    let replyTo = null
    if (rawReplyToMessageId) {
      if (!isValidUuid(rawReplyToMessageId)) {
        return res.status(400).json({ error: 'Invalid reply target' })
      }
      const replyResult = await pool.query(
        `select m.id,
                m.body,
                m.attachment_url,
                m.attachment_mime,
                m.attachment_kind,
                m.deleted_at,
                u.id as sender_id,
                u.username as sender_username,
                u.display_name as sender_display_name,
                u.avatar_url as sender_avatar_url
         from messages m
         left join users u on u.id = m.sender_id
         where m.id = $1 and m.conversation_id = $2
         limit 1`,
        [rawReplyToMessageId, conversationId]
      )
      if (replyResult.rowCount === 0) {
        return res.status(400).json({ error: 'Reply target not found' })
      }
      const replyRow = replyResult.rows[0]
      replyToMessageId = replyRow.id
      replyTo = {
        id: replyRow.id,
        body: replyRow.body,
        attachmentUrl: replyRow.attachment_url,
        attachmentMime: replyRow.attachment_mime || null,
        attachmentKind: replyRow.attachment_kind || null,
        deletedAt: replyRow.deleted_at || null,
        senderId: replyRow.sender_id || null,
        senderUsername: replyRow.sender_username || null,
        senderDisplayName: replyRow.sender_display_name || null,
        senderAvatarUrl: replyRow.sender_avatar_url || null
      }
    }

    let result
    try {
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id)
         values ($1, $2, $3, $4, $5, 'sticker', $6)
         returning id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id, created_at`,
        [conversationId, req.userId, '', sticker.image_url, sticker.mime_type || null, replyToMessageId]
      )
    } catch (err) {
      if (isAttachmentKindConstraintError(err)) {
        return res.status(503).json({ error: 'Sticker feature is unavailable: database migration required' })
      }
      if (!isMessageReplySchemaError(err)) throw err
      if (replyToMessageId) {
        return res.status(503).json({ error: 'Reply feature is unavailable: database migration required' })
      }
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind)
         values ($1, $2, $3, $4, $5, 'sticker')
         returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
        [conversationId, req.userId, '', sticker.image_url, sticker.mime_type || null]
      )
    }

    const senderRow = await pool.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderRow.rows[0] || {}

    const message = {
      id: result.rows[0].id,
      body: result.rows[0].body,
      attachmentUrl: result.rows[0].attachment_url,
      attachmentMime: result.rows[0].attachment_mime,
      attachmentKind: result.rows[0].attachment_kind,
      editedAt: null,
      createdAt: result.rows[0].created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo,
      reactions: []
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
        body: getMessagePreviewText(message.body, message.attachmentUrl, message.attachmentKind),
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

    res.json({ message, sticker: mapSticker(sticker) })
  } catch (err) {
    if (isStickerFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'Sticker feature is unavailable: database migration required' })
    }
    console.error('Send sticker error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations/:id/gifs', messageLimiter, auth, ensureNotBanned, async (req, res) => {
  try {
    const conversationId = req.params.id
    const gifId = typeof req.body.gifId === 'string' ? req.body.gifId.trim() : ''
    const rawReplyToMessageId = typeof req.body.replyToMessageId === 'string' ? req.body.replyToMessageId.trim() : ''

    if (!gifId || !isValidUuid(gifId)) {
      return res.status(400).json({ error: 'GIF id is required' })
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

    const gifResult = await pool.query(
      `select id, user_id, title, image_url, mime_type, created_at
       from user_gifs
       where id = $1 and user_id = $2
       limit 1`,
      [gifId, req.userId]
    )
    if (gifResult.rowCount === 0) {
      return res.status(404).json({ error: 'GIF not found' })
    }
    const gif = gifResult.rows[0]

    let replyToMessageId = null
    let replyTo = null
    if (rawReplyToMessageId) {
      if (!isValidUuid(rawReplyToMessageId)) {
        return res.status(400).json({ error: 'Invalid reply target' })
      }
      const replyResult = await pool.query(
        `select m.id,
                m.body,
                m.attachment_url,
                m.attachment_mime,
                m.attachment_kind,
                m.deleted_at,
                u.id as sender_id,
                u.username as sender_username,
                u.display_name as sender_display_name,
                u.avatar_url as sender_avatar_url
         from messages m
         left join users u on u.id = m.sender_id
         where m.id = $1 and m.conversation_id = $2
         limit 1`,
        [rawReplyToMessageId, conversationId]
      )
      if (replyResult.rowCount === 0) {
        return res.status(400).json({ error: 'Reply target not found' })
      }
      const replyRow = replyResult.rows[0]
      replyToMessageId = replyRow.id
      replyTo = {
        id: replyRow.id,
        body: replyRow.body,
        attachmentUrl: replyRow.attachment_url,
        attachmentMime: replyRow.attachment_mime || null,
        attachmentKind: replyRow.attachment_kind || null,
        deletedAt: replyRow.deleted_at || null,
        senderId: replyRow.sender_id || null,
        senderUsername: replyRow.sender_username || null,
        senderDisplayName: replyRow.sender_display_name || null,
        senderAvatarUrl: replyRow.sender_avatar_url || null
      }
    }

    let result
    try {
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id)
         values ($1, $2, $3, $4, $5, 'gif', $6)
         returning id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id, created_at`,
        [conversationId, req.userId, '', gif.image_url, gif.mime_type || null, replyToMessageId]
      )
    } catch (err) {
      if (isAttachmentKindConstraintError(err)) {
        return res.status(503).json({ error: 'GIF feature is unavailable: database migration required' })
      }
      if (!isMessageReplySchemaError(err)) throw err
      if (replyToMessageId) {
        return res.status(503).json({ error: 'Reply feature is unavailable: database migration required' })
      }
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind)
         values ($1, $2, $3, $4, $5, 'gif')
         returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
        [conversationId, req.userId, '', gif.image_url, gif.mime_type || null]
      )
    }

    const senderRow = await pool.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderRow.rows[0] || {}

    const message = {
      id: result.rows[0].id,
      body: result.rows[0].body,
      attachmentUrl: result.rows[0].attachment_url,
      attachmentMime: result.rows[0].attachment_mime,
      attachmentKind: result.rows[0].attachment_kind,
      editedAt: null,
      createdAt: result.rows[0].created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo,
      reactions: []
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
        body: getMessagePreviewText(message.body, message.attachmentUrl, message.attachmentKind),
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

    res.json({ message, gif: mapGif(gif) })
  } catch (err) {
    if (isGifFeaturesSchemaError(err)) {
      return res.status(503).json({ error: 'GIF feature is unavailable: database migration required' })
    }
    console.error('Send gif error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/conversations/:id/messages', messageLimiter, auth, ensureNotBanned, messageUpload.single('file'), async (req, res) => {
  try {
    const conversationId = req.params.id
    const body = req.body.body || ''
    const rawReplyToMessageId = typeof req.body.replyToMessageId === 'string' ? req.body.replyToMessageId.trim() : ''

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
    const attachmentMime = req.file ? (req.file.mimetype || null) : null
    const attachmentKind = normalizeMessageAttachmentKind(req.file, req.body.attachmentKind)
    let replyToMessageId = null
    let replyTo = null

    if (rawReplyToMessageId) {
      if (!isValidUuid(rawReplyToMessageId)) {
        return res.status(400).json({ error: 'Invalid reply target' })
      }
      const replyResult = await pool.query(
        `select m.id,
                m.body,
                m.attachment_url,
                m.attachment_mime,
                m.attachment_kind,
                m.deleted_at,
                u.id as sender_id,
                u.username as sender_username,
                u.display_name as sender_display_name,
                u.avatar_url as sender_avatar_url
         from messages m
         left join users u on u.id = m.sender_id
         where m.id = $1 and m.conversation_id = $2
         limit 1`,
        [rawReplyToMessageId, conversationId]
      )
      if (replyResult.rowCount === 0) {
        return res.status(400).json({ error: 'Reply target not found' })
      }
      const replyRow = replyResult.rows[0]
      replyToMessageId = replyRow.id
      replyTo = {
        id: replyRow.id,
        body: replyRow.body,
        attachmentUrl: replyRow.attachment_url,
        attachmentMime: replyRow.attachment_mime || null,
        attachmentKind: replyRow.attachment_kind || null,
        deletedAt: replyRow.deleted_at || null,
        senderId: replyRow.sender_id || null,
        senderUsername: replyRow.sender_username || null,
        senderDisplayName: replyRow.sender_display_name || null,
        senderAvatarUrl: replyRow.sender_avatar_url || null
      }
    }
    let result
    try {
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, body, attachment_url, attachment_mime, attachment_kind, reply_to_id, created_at`,
        [conversationId, req.userId, body.trim(), attachmentUrl, attachmentMime, attachmentKind, replyToMessageId]
      )
    } catch (err) {
      if (!isMessageReplySchemaError(err)) throw err
      if (replyToMessageId) {
        return res.status(503).json({ error: 'Reply feature is unavailable: database migration required' })
      }
      result = await pool.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind)
         values ($1, $2, $3, $4, $5, $6)
         returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
        [conversationId, req.userId, body.trim(), attachmentUrl, attachmentMime, attachmentKind]
      )
    }

    const senderRow = await pool.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderRow.rows[0] || {}

    const message = {
      id: result.rows[0].id,
      body: result.rows[0].body,
      attachmentUrl: result.rows[0].attachment_url,
      attachmentMime: result.rows[0].attachment_mime,
      attachmentKind: result.rows[0].attachment_kind,
      editedAt: null,
      createdAt: result.rows[0].created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo,
      reactions: []
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
        body: getMessagePreviewText(message.body, message.attachmentUrl, message.attachmentKind),
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
       `select p.id, p.body, p.image_url, p.repost_of, p.edited_at, p.deleted_at, p.created_at,
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
    const post = await getPostByIdForViewer(result.rows[0].id, req.userId)
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
      newPost = await getPostByIdForViewer(created.rows[0].id, req.userId)
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
       returning id, body, attachment_url, attachment_mime, attachment_kind, edited_at, created_at, sender_id`,
      [body, messageId]
    )

    res.json({
      message: {
        id: updated.rows[0].id,
        body: updated.rows[0].body,
        attachmentUrl: updated.rows[0].attachment_url,
        attachmentMime: updated.rows[0].attachment_mime,
        attachmentKind: updated.rows[0].attachment_kind,
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

app.post('/api/messages/:id/poll-vote', auth, ensureNotBanned, async (req, res) => {
  const messageId = req.params.id
  const optionId = normalizePollOptionId(req.body && req.body.optionId)
  if (optionId < 0) {
    return res.status(400).json({ error: 'Invalid poll option' })
  }

  try {
    const pollResult = await pool.query(
      `select m.conversation_id,
              m.deleted_at,
              mp.question,
              mp.options,
              mp.allows_multiple
       from messages m
       join message_polls mp on mp.message_id = m.id
       join conversation_members cm
         on cm.conversation_id = m.conversation_id
        and cm.user_id = $2
       where m.id = $1
       limit 1`,
      [messageId, req.userId]
    )
    if (pollResult.rowCount === 0) {
      return res.status(404).json({ error: 'Poll not found' })
    }
    if (pollResult.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Message is deleted' })
    }

    const row = pollResult.rows[0]
    const options = normalizePollOptionsValue(row.options)
    if (options.length < pollOptionMinCount) {
      return res.status(400).json({ error: 'Poll data is invalid' })
    }
    if (optionId >= options.length) {
      return res.status(400).json({ error: 'Invalid poll option' })
    }

    const allowsMultiple = row.allows_multiple === true
    const client = await pool.connect()
    try {
      await client.query('begin')
      if (allowsMultiple) {
        const inserted = await client.query(
          `insert into message_poll_votes (message_id, user_id, option_id)
           values ($1, $2, $3)
           on conflict do nothing
           returning message_id`,
          [messageId, req.userId, optionId]
        )
        if (inserted.rowCount === 0) {
          await client.query(
            'delete from message_poll_votes where message_id = $1 and user_id = $2 and option_id = $3',
            [messageId, req.userId, optionId]
          )
        }
      } else {
        const currentVote = await client.query(
          'select 1 from message_poll_votes where message_id = $1 and user_id = $2 and option_id = $3',
          [messageId, req.userId, optionId]
        )
        if (currentVote.rowCount > 0) {
          await client.query(
            'delete from message_poll_votes where message_id = $1 and user_id = $2 and option_id = $3',
            [messageId, req.userId, optionId]
          )
        } else {
          await client.query(
            'delete from message_poll_votes where message_id = $1 and user_id = $2',
            [messageId, req.userId]
          )
          await client.query(
            `insert into message_poll_votes (message_id, user_id, option_id)
             values ($1, $2, $3)`,
            [messageId, req.userId, optionId]
          )
        }
      }
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }

    const poll = await getPollPayloadForMessage(messageId, req.userId, {
      question: row.question,
      allowsMultiple,
      options
    })
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' })
    }

    const conversationId = row.conversation_id
    const memberIds = await getConversationMemberIds(conversationId)
    memberIds.forEach((memberId) => {
      emitToUser(memberId, 'poll:update', {
        conversationId,
        messageId,
        poll
      })
    })

    res.json({
      ok: true,
      conversationId,
      messageId,
      poll
    })
  } catch (err) {
    if (isMessagePollSchemaError(err)) {
      return res.status(503).json({ error: 'Poll feature is unavailable: database migration required' })
    }
    console.error('Poll vote error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/messages/:id/reactions', auth, ensureNotBanned, async (req, res) => {
  try {
    const messageId = req.params.id
    const emoji = normalizeReactionEmoji(req.body.emoji)
    if (!emoji) {
      return res.status(400).json({ error: 'Invalid emoji' })
    }

    const messageResult = await pool.query(
      `select m.conversation_id, m.deleted_at
       from messages m
       join conversation_members cm
         on cm.conversation_id = m.conversation_id
        and cm.user_id = $2
       where m.id = $1`,
      [messageId, req.userId]
    )
    if (messageResult.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (messageResult.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Message is deleted' })
    }

    const conversationId = messageResult.rows[0].conversation_id
    const inserted = await pool.query(
      `insert into message_reactions (message_id, user_id, emoji)
       values ($1, $2, $3)
       on conflict do nothing
       returning message_id`,
      [messageId, req.userId, emoji]
    )

    const active = inserted.rowCount > 0
    if (!active) {
      await pool.query(
        'delete from message_reactions where message_id = $1 and user_id = $2 and emoji = $3',
        [messageId, req.userId, emoji]
      )
    }

    const reactions = await getMessageReactions(messageId, req.userId)
    const memberIds = await getConversationMemberIds(conversationId)
    memberIds.forEach((memberId) => {
      emitToUser(memberId, 'message:reaction', {
        conversationId,
        messageId,
        emoji,
        userId: req.userId,
        active
      })
    })

    res.json({
      ok: true,
      conversationId,
      messageId,
      emoji,
      active,
      reactions
    })
  } catch (err) {
    if (isMessageReactionsSchemaError(err)) {
      return res.status(503).json({ error: 'Message reactions are unavailable: database migration required' })
    }
    console.error('Message reaction error', err)
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
    const updatedPost = await getPostByIdForViewer(postId, req.userId)
    if (updatedPost) {
      io.emit('post:update', { post: updatedPost })
    }
    res.json({ ok: true, post: updatedPost })
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
    return res.status(400).json({ error: 'Разрешены только изображения (jpg, png, webp, gif)' })
  }
  if (err && err.message && err.message.includes('Only GIF files')) {
    return res.status(400).json({ error: 'Only GIF files are allowed' })
  }
  if (err && err.message && err.message.includes('Only image or video attachments')) {
    return res.status(400).json({ error: 'Разрешены только изображения и видео файлы.' })
  }
  if (err && err.message && err.message.includes('Only audio files')) {
    return res.status(400).json({ error: 'Разрешены только аудио файлы (mp3, wav, ogg, webm, m4a, aac)' })
  }
  console.error('Unhandled error', err)
  res.status(500).json({ error: 'Unexpected error' })
})

const port = process.env.PORT || 4000
const autoApplySchema = String(process.env.AUTO_APPLY_SCHEMA || 'true').toLowerCase() !== 'false'

async function applySchemaOnStartup() {
  if (!autoApplySchema) {
    console.log('AUTO_APPLY_SCHEMA=false, skipping schema apply on startup')
    return
  }

  const schemaPath = path.join(__dirname, 'schema.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
  const client = await pool.connect()
  try {
    await client.query(schemaSql)
    console.log('Database schema applied successfully')
  } finally {
    client.release()
  }
}

async function startServer() {
  try {
    await applySchemaOnStartup()
    server.listen(port, () => {
      console.log('Server listening on http://localhost:' + port)
    })
  } catch (err) {
    console.error('Startup failed:', err)
    process.exit(1)
  }
}

startServer()
