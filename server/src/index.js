require('dotenv').config()

const path = require('path')
const fs = require('fs')
const http = require('http')
const crypto = require('crypto')
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

const defaultRoles = [
  { value: '*', label: 'Owner' },
  { value: 'student', label: 'РЎС‚СѓРґРµРЅС‚' },
  { value: 'teacher', label: 'РЈС‡РёС‚РµР»СЊ' },
  { value: 'programmist', label: 'РџСЂРѕРіСЂР°РјРјРёСЃС‚' },
  { value: 'biomed', label: 'Р‘РёРѕРјРµРґ' },
  { value: 'holodilchik', label: 'РҐРѕР»РѕРґРёР»СЊС‡РёРє' },
  { value: 'tehmash', label: 'РўРµС…РјР°С€' },
  { value: 'promteh', label: 'РџСЂРѕРјС‚РµС…' },
  { value: 'laborant', label: 'Р›Р°Р±РѕСЂР°РЅС‚' },
  { value: 'polimer', label: 'РџРѕР»РёРјРµСЂ' },
  { value: 'energomat', label: 'Р­РЅРµСЂРіРѕРјР°С‚' },
  { value: 'himanaliz', label: 'РҐРёРјР°РЅР°Р»РёР·' },
  { value: 'pishrast', label: 'РџРёС‰СЂР°СЃС‚' },
  { value: 'pishzhiv', label: 'РџРёС‰Р¶РёРІ' },
  { value: 'legprom', label: 'Р›РµРіРїСЂРѕРј' },
  { value: 'povar', label: 'РџРѕРІР°СЂ' },
  { value: 'turizm', label: 'РўСѓСЂРёР·Рј' },
  { value: 'deloproizvod', label: 'Р”РµР»РѕРїСЂРѕРёР·РІРѕРґ' }
]
const ownerRoleValue = '*'
const reservedOwnerUsernames = new Set(['snow'])
const allowedRoleValues = new Set(defaultRoles.map((item) => item.value))

const jwtSecret = process.env.JWT_SECRET || 'change_me'
const uploadStorage = String(process.env.UPLOAD_STORAGE || 'disk').toLowerCase()
const useDbStorage = uploadStorage === 'db'
const defaultUploadDir = path.join(__dirname, '..', 'uploads')
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : defaultUploadDir
const webPushSubject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com'
const webPushPublicKey = process.env.WEB_PUSH_PUBLIC_KEY || ''
const webPushPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY || ''
const webPushEnabled = Boolean(webPushPublicKey && webPushPrivateKey)
const pushNotificationIcon = '/pwa-icon.svg'
const pushNotificationBadge = '/pwa-badge.svg'
const profileStatusTextMaxLength = 80
const profileStatusEmojiMaxLength = 16
const stickerTitleMaxLength = 48
const gifTitleMaxLength = 48
const profileShowcaseHeadlineMaxLength = 120
const profileShowcaseSkillMaxLength = 24
const profileShowcaseSkillsMaxCount = 8
const profileShowcaseBadgesMaxCount = 6
const profileShowcaseLinksMaxCount = 2
const profileShowcaseLinkLabelMaxLength = 30
const profileShowcaseLinkUrlMaxLength = 240
const profileShowcaseThemeOptions = new Set(['default', 'sunset', 'ocean', 'forest', 'neon'])
const profileShowcaseBadgeOptions = new Set([
  'builder',
  'designer',
  'mentor',
  'gamer',
  'music',
  'rapid',
  'night',
  'communicator'
])
const pollQuestionMaxLength = 240
const pollOptionMaxLength = 120
const pollOptionMinCount = 2
const pollOptionMaxCount = 10
const verificationRequestFullNameMaxLength = 80
const verificationRequestReasonMaxLength = 360
const verificationRequestEvidenceMaxLength = 220
const verificationRequestAdminNoteMaxLength = 260
const verificationRequestStatuses = new Set(['pending', 'approved', 'rejected', 'cancelled'])
const jwtVerifyOptions = { algorithms: ['HS256'] }
const blockedUploadExtensions = new Set([
  '.html',
  '.htm',
  '.xhtml',
  '.svg',
  '.xml',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.map',
  '.wasm',
  '.php',
  '.phtml',
  '.exe',
  '.dll',
  '.msi',
  '.bat',
  '.cmd',
  '.sh'
])
const safeDiskUploadExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.mp3',
  '.wav',
  '.ogg',
  '.webm',
  '.m4a',
  '.aac',
  '.mp4',
  '.ogv',
  '.mov',
  '.m4v',
  '.mkv',
  '.3gp',
  '.3g2'
])
const authTokenTtlSeconds = 7 * 24 * 60 * 60
const twoFactorChallengeTtlSeconds = 10 * 60
const twoFactorPendingTtlMinutes = 15
const twoFactorOtpStepSeconds = 30
const twoFactorOtpDigits = 6
const twoFactorBackupCodesCount = 10
const twoFactorBackupCodeLength = 10
const sessionListLimit = 30
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERSONAL_FAVORITES_TITLE = '\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435'
const LEGACY_PERSONAL_FAVORITES_TITLES = [
  'РР·Р±СЂР°РЅРЅРѕРµ',
  'Избранное'
]
const PERSONAL_FAVORITES_TITLE_ALIASES = Array.from(new Set([
  PERSONAL_FAVORITES_TITLE,
  ...LEGACY_PERSONAL_FAVORITES_TITLES
]))

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
    const originalExt = path.extname(file.originalname || '').toLowerCase()
    const safeExt = safeDiskUploadExtensions.has(originalExt) ? originalExt : ''
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`
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
      if (ext && blockedUploadExtensions.has(ext)) {
        return cb(new Error(errorMessage))
      }
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
  allowUnknownMimeByExtension: true
})

const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173'
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowAllOrigins = allowedOrigins.includes('*')

function isAllowedCorsOrigin(origin) {
  if (!origin || allowAllOrigins) return true
  return allowedOrigins.includes(origin)
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedCorsOrigin(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
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
  message: { error: 'РЎР»РёС€РєРѕРј РјРЅРѕРіРѕ РїРѕРїС‹С‚РѕРє. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.' }
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
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
  },
  maxHttpBufferSize: 1e6
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
  app.use('/uploads', express.static(uploadDir, {
    dotfiles: 'deny',
    fallthrough: false,
    maxAge: '7d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'none'; script-src 'none'; object-src 'none'; frame-ancestors 'none'"
      )
    }
  }))
}

function normalizeLogin(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function extractMentionedUsernames(value) {
  const matches = String(value || '').match(/@([a-z0-9_]{3,})/gi) || []
  return Array.from(new Set(matches
    .map((item) => normalizeUsername(String(item || '').replace(/^@/, '')))
    .filter(Boolean)))
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

function normalizeBooleanFlag(value, fallback = null) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

function hashTokenValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function normalizeTotpCode(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function decodeBase32Secret(secret) {
  const clean = String(secret || '').replace(/[\s-]+/g, '').toUpperCase()
  if (!clean) return Buffer.alloc(0)
  let bits = ''
  for (const char of clean) {
    const index = base32Alphabet.indexOf(char)
    if (index < 0) return Buffer.alloc(0)
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function generateTotpSecret(size = 20) {
  const bytes = crypto.randomBytes(Math.max(16, size))
  let bits = ''
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0')
  }
  let output = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5)
    if (chunk.length < 5) break
    output += base32Alphabet[Number.parseInt(chunk, 2)]
  }
  return output.slice(0, 32)
}

function generateTotpCode(secret, timestampMs = Date.now()) {
  const key = decodeBase32Secret(secret)
  if (!key.length) return ''
  const counter = Math.floor(Math.max(0, Number(timestampMs || 0)) / 1000 / twoFactorOtpStepSeconds)
  const counterBuffer = Buffer.alloc(8)
  const high = Math.floor(counter / 0x100000000)
  const low = counter >>> 0
  counterBuffer.writeUInt32BE(high >>> 0, 0)
  counterBuffer.writeUInt32BE(low, 4)
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  )
  const otp = binary % (10 ** twoFactorOtpDigits)
  return String(otp).padStart(twoFactorOtpDigits, '0')
}

function verifyTotpCode(secret, code, windowSize = 1) {
  const normalized = normalizeTotpCode(code)
  if (!/^\d{6}$/.test(normalized)) return false
  const now = Date.now()
  for (let offset = -Math.abs(windowSize); offset <= Math.abs(windowSize); offset += 1) {
    const candidate = generateTotpCode(secret, now + (offset * twoFactorOtpStepSeconds * 1000))
    if (candidate && candidate === normalized) {
      return true
    }
  }
  return false
}

function generateBackupCodes() {
  const codes = []
  for (let i = 0; i < twoFactorBackupCodesCount; i += 1) {
    const raw = crypto.randomBytes(6).toString('base64url').slice(0, twoFactorBackupCodeLength).toUpperCase()
    const code = raw.replace(/[^A-Z0-9]/g, '').padEnd(twoFactorBackupCodeLength, 'X').slice(0, twoFactorBackupCodeLength)
    codes.push(code)
  }
  return codes
}

async function hashBackupCodes(codes) {
  const uniqueCodes = Array.from(new Set((Array.isArray(codes) ? codes : []).map((item) => String(item || '').trim()).filter(Boolean)))
  const hashes = []
  for (const code of uniqueCodes) {
    hashes.push(await bcrypt.hash(code, 10))
  }
  return hashes
}

function getRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  if (forwarded) return forwarded.slice(0, 120)
  const remote = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || ''
  return String(remote || '').slice(0, 120)
}

function getSocketIp(socket) {
  const forwarded = socket && socket.handshake && socket.handshake.headers
    ? String(socket.handshake.headers['x-forwarded-for'] || '').split(',')[0].trim()
    : ''
  if (forwarded) return forwarded.slice(0, 120)
  const remote = socket && socket.handshake && socket.handshake.address ? socket.handshake.address : ''
  return String(remote || '').slice(0, 120)
}

function createTwoFactorChallengeToken(userId) {
  return jwt.sign(
    { sub: userId, purpose: '2fa_login' },
    jwtSecret,
    { expiresIn: twoFactorChallengeTtlSeconds, algorithm: 'HS256' }
  )
}

function verifyTwoFactorChallengeToken(rawToken) {
  const token = extractJwtToken(rawToken)
  if (!token) return null
  try {
    const payload = jwt.verify(token, jwtSecret, jwtVerifyOptions)
    if (!payload || payload.purpose !== '2fa_login' || !payload.sub) return null
    return payload
  } catch (_err) {
    return null
  }
}

async function createAuthSessionToken(userId, meta = {}) {
  const sessionId = crypto.randomUUID()
  const token = jwt.sign(
    { sub: userId, sid: sessionId },
    jwtSecret,
    { expiresIn: authTokenTtlSeconds, algorithm: 'HS256' }
  )
  const tokenHash = hashTokenValue(token)
  const expiresAt = new Date(Date.now() + authTokenTtlSeconds * 1000)
  await pool.query(
    `insert into user_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at, last_seen_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())`,
    [
      sessionId,
      userId,
      tokenHash,
      meta.userAgent ? String(meta.userAgent).slice(0, 400) : null,
      meta.ipAddress ? String(meta.ipAddress).slice(0, 120) : null,
      expiresAt.toISOString()
    ]
  )
  return token
}

async function validateSessionByTokenPayload({ userId, sessionId, token, touch = true }) {
  if (!isValidUuid(sessionId)) return { ok: false, reason: 'invalid_session' }
  const tokenHash = hashTokenValue(token)
  const result = await pool.query(
    `select id, user_id, expires_at, revoked_at
     from user_sessions
     where id = $1 and user_id = $2 and token_hash = $3
     limit 1`,
    [sessionId, userId, tokenHash]
  )
  if (result.rowCount === 0) return { ok: false, reason: 'not_found' }
  const session = result.rows[0]
  if (session.revoked_at) return { ok: false, reason: 'revoked' }
  const expiresAtMs = Date.parse(session.expires_at || '')
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  if (touch) {
    await pool.query(
      `update user_sessions
       set last_seen_at = now()
       where id = $1`,
      [sessionId]
    ).catch(() => {})
  }
  return { ok: true, session }
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

function extractJwtToken(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return ''
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(value)
  const token = String(bearerMatch ? bearerMatch[1] : value).trim()
  if (!token || token.length > 2048) return ''
  if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) return ''
  return token
}

async function auth(req, res, next) {
  const token = extractJwtToken(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(token, jwtSecret, jwtVerifyOptions)
    if (!payload || !payload.sub || !payload.sid) {
      return res.status(401).json({ error: 'Session expired' })
    }
    const validation = await validateSessionByTokenPayload({
      userId: payload.sub,
      sessionId: payload.sid,
      token,
      touch: true
    })
    if (!validation.ok) {
      return res.status(401).json({ error: 'Session expired' })
    }
    req.userId = payload.sub
    req.sessionId = payload.sid
    req.authToken = token
    return next()
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Security feature is unavailable: database migration required' })
    }
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
    const access = await getUserAccessFlags(req.userId)
    if (!access.exists) return res.status(401).json({ error: 'User not found' })
    if (!access.isAdmin) return res.status(403).json({ error: 'Admin only' })
    req.accessFlags = access
    return next()
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' })
  }
}

async function ownerOnly(req, res, next) {
  try {
    const access = await getUserAccessFlags(req.userId)
    if (!access.exists) return res.status(401).json({ error: 'User not found' })
    if (!access.isOwner) return res.status(403).json({ error: 'Owner only' })
    req.accessFlags = access
    return next()
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' })
  }
}

function normalizeRoleValue(rawValue) {
  return String(rawValue || '').trim().toLowerCase()
}

function normalizeRoleLabel(rawLabel) {
  return String(rawLabel || '').trim()
}

function normalizeVerificationRequestStatus(rawStatus, fallback = 'pending') {
  const status = String(rawStatus || '').trim().toLowerCase()
  if (verificationRequestStatuses.has(status)) return status
  return fallback
}

function normalizeVerificationRequestFullName(value) {
  return String(value || '').trim().slice(0, verificationRequestFullNameMaxLength)
}

function normalizeVerificationRequestReason(value) {
  return String(value || '').trim().slice(0, verificationRequestReasonMaxLength)
}

function normalizeVerificationRequestEvidence(value) {
  return String(value || '').trim().slice(0, verificationRequestEvidenceMaxLength)
}

function normalizeVerificationRequestAdminNote(value) {
  return String(value || '').trim().slice(0, verificationRequestAdminNoteMaxLength)
}

function isValidRoleValue(roleValue) {
  if (roleValue === ownerRoleValue) return true
  return /^[a-z][a-z0-9_]{2,31}$/.test(roleValue)
}

function isValidRoleLabel(roleLabel) {
  return roleLabel.length >= 2 && roleLabel.length <= 48
}

async function getAvailableRoles() {
  const roleLabelByValue = new Map(defaultRoles.map((item) => [item.value, item.label]))
  try {
    const result = await pool.query(
      `select value, label
       from roles
       where value = any($1::text[])`,
      [Array.from(allowedRoleValues)]
    )
    result.rows.forEach((row) => {
      const value = normalizeRoleValue(row.value)
      if (!value || !allowedRoleValues.has(value)) return
      roleLabelByValue.set(value, row.label || roleLabelByValue.get(value))
    })
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
  }
  return defaultRoles.map((item) => ({
    value: item.value,
    label: roleLabelByValue.get(item.value) || item.label
  }))
}

async function hasAllowedRole(roleValue) {
  if (!roleValue || !allowedRoleValues.has(roleValue)) return false
  try {
    const result = await pool.query(
      'select 1 from roles where value = $1 limit 1',
      [roleValue]
    )
    if (result.rowCount > 0) return true
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
    return true
  }
  return false
}

function normalizeRoleValues(value) {
  const source = Array.isArray(value) ? value : [value]
  const unique = new Set()
  source.forEach((item) => {
    const normalized = normalizeRoleValue(item)
    if (!normalized) return
    unique.add(normalized)
  })
  return Array.from(unique)
}

async function getAllowedRoleValues(roleValues) {
  const normalized = normalizeRoleValues(roleValues)
  const normalizedAllowed = normalized.filter((item) => allowedRoleValues.has(item))
  if (normalizedAllowed.length === 0) return []
  try {
    const result = await pool.query(
      `select value
       from roles
       where value = any($1::text[])`,
      [normalizedAllowed]
    )
    const allowed = new Set(
      result.rows
        .map((row) => normalizeRoleValue(row.value))
        .filter((item) => allowedRoleValues.has(item))
    )
    return normalizedAllowed.filter((item) => allowed.has(item))
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
  }
  return normalizedAllowed
}

function normalizeUserRolesFromRow(row) {
  if (!row || typeof row !== 'object') return []
  const byArray = Array.isArray(row.roles)
    ? row.roles.map((item) => normalizeRoleValue(item)).filter(Boolean)
    : []
  if (byArray.length > 0) return Array.from(new Set(byArray))
  const single = normalizeRoleValue(row.role)
  return single ? [single] : []
}

function hasRoleValueInRow(row, roleValue) {
  const normalizedRoleValue = normalizeRoleValue(roleValue)
  if (!normalizedRoleValue || !row || typeof row !== 'object') return false
  const roles = normalizeUserRolesFromRow(row)
  if (roles.includes(normalizedRoleValue)) return true
  return normalizeRoleValue(row.role) === normalizedRoleValue
}

async function getUserAccessFlags(userId, dbClient = null) {
  const db = dbClient || pool
  if (!isValidUuid(userId)) {
    return { exists: false, isAdmin: false, isOwner: false }
  }
  try {
    const result = await db.query(
      `select u.id,
              u.is_admin,
              u.role,
              coalesce(
                (select array_agg(ur.role_value order by ur.role_value asc)
                 from user_roles ur
                 where ur.user_id = u.id),
                array[u.role]
              ) as roles
       from users u
       where u.id = $1
       limit 1`,
      [userId]
    )
    if (result.rowCount === 0) {
      return { exists: false, isAdmin: false, isOwner: false }
    }
    const row = result.rows[0]
    const isOwner = hasRoleValueInRow(row, ownerRoleValue)
    return {
      exists: true,
      isAdmin: row.is_admin === true || isOwner,
      isOwner
    }
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
  }
  const fallback = await db.query(
    'select id, is_admin, role from users where id = $1 limit 1',
    [userId]
  )
  if (fallback.rowCount === 0) {
    return { exists: false, isAdmin: false, isOwner: false }
  }
  const row = fallback.rows[0]
  const isOwner = normalizeRoleValue(row.role) === ownerRoleValue
  return {
    exists: true,
    isAdmin: row.is_admin === true || isOwner,
    isOwner
  }
}

async function hasAdminAccess(userId, dbClient = null) {
  const access = await getUserAccessFlags(userId, dbClient)
  return access.exists && access.isAdmin
}

async function isOwnerAccount(userId, dbClient = null) {
  const access = await getUserAccessFlags(userId, dbClient)
  return access.exists && access.isOwner
}

async function ensureActorCanManageTarget(actorUserId, targetUserId, dbClient = null) {
  const db = dbClient || pool
  const [actorAccess, targetAccess] = await Promise.all([
    getUserAccessFlags(actorUserId, db),
    getUserAccessFlags(targetUserId, db)
  ])
  if (!actorAccess.exists) {
    return { ok: false, status: 401, error: 'User not found' }
  }
  if (!targetAccess.exists) {
    return { ok: false, status: 404, error: 'User not found' }
  }
  if (targetAccess.isOwner && !actorAccess.isOwner) {
    return { ok: false, status: 403, error: 'Only owner can manage owner account' }
  }
  return {
    ok: true,
    actorAccess,
    targetAccess
  }
}

async function saveUserRoles(userId, roleValues, dbClient = null) {
  const normalized = normalizeRoleValues(roleValues)
  if (normalized.length === 0) {
    throw new Error('At least one role is required')
  }
  const allowed = await getAllowedRoleValues(normalized)
  if (allowed.length !== normalized.length) {
    throw new Error('Invalid role')
  }

  const primaryRole = allowed[0]
  const db = dbClient || pool
  await db.query('update users set role = $2 where id = $1', [userId, primaryRole])
  try {
    await db.query('delete from user_roles where user_id = $1', [userId])
    await db.query(
      `insert into user_roles (user_id, role_value)
       select $1, role_value
       from unnest($2::text[]) as role_value
       on conflict (user_id, role_value) do nothing`,
      [userId, allowed]
    )
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
  }
  return allowed
}

function isReservedOwnerUsername(username) {
  const normalizedUsername = normalizeUsername(username)
  return normalizedUsername ? reservedOwnerUsernames.has(normalizedUsername) : false
}

async function enforceReservedOwnerAccess(userId, username, dbClient = null) {
  if (!isValidUuid(userId) || !isReservedOwnerUsername(username)) {
    return false
  }
  const db = dbClient || pool
  await saveUserRoles(userId, [ownerRoleValue], db)
  await db.query(
    `update users
     set is_admin = true
     where id = $1`,
    [userId]
  )
  return true
}

app.param('id', (req, res, next, id) => {
  if (!isValidUuid(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return next()
})

function mapUser(row) {
  const roles = normalizeUserRolesFromRow(row)
  const primaryRole = row.role || roles[0] || ''
  const isOwner = roles.includes(ownerRoleValue) || normalizeRoleValue(primaryRole) === ownerRoleValue
  const isAdmin = row.is_admin === true || isOwner
  return {
    id: row.id,
    login: row.login,
    username: row.username,
    role: primaryRole,
    roles,
    showRole: row.show_role !== false,
    displayName: row.display_name,
    bio: row.bio,
    statusText: row.status_text || '',
    statusEmoji: row.status_emoji || '',
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    themeColor: row.theme_color,
    isVerified: row.is_verified === true,
    isOwner,
    isAdmin,
    isModerator: row.is_moderator,
    isBanned: row.is_banned,
    twoFactorEnabled: row.two_factor_enabled === true,
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

function mapVerificationRequest(row) {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name || '',
    reason: row.reason || '',
    evidence: row.evidence || '',
    status: normalizeVerificationRequestStatus(row.status),
    adminNote: row.admin_note || '',
    reviewedBy: row.reviewed_by || null,
    reviewedByUsername: row.reviewed_by_username || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    reviewedAt: row.reviewed_at || null
  }
}

function normalizeProfileShowcaseTheme(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'default'
  return profileShowcaseThemeOptions.has(normalized) ? normalized : 'default'
}

function normalizeProfileShowcaseSkills(value) {
  if (!Array.isArray(value)) return []
  const unique = new Set()
  value.forEach((item) => {
    if (unique.size >= profileShowcaseSkillsMaxCount) return
    const normalized = String(item || '').trim().slice(0, profileShowcaseSkillMaxLength)
    if (!normalized) return
    unique.add(normalized)
  })
  return Array.from(unique)
}

function normalizeProfileShowcaseBadges(value) {
  if (!Array.isArray(value)) return []
  const unique = new Set()
  value.forEach((item) => {
    if (unique.size >= profileShowcaseBadgesMaxCount) return
    const normalized = String(item || '').trim()
    if (!normalized || !profileShowcaseBadgeOptions.has(normalized)) return
    unique.add(normalized)
  })
  return Array.from(unique)
}

function normalizeProfileShowcaseLinks(value) {
  if (!Array.isArray(value)) return []
  const links = []
  value.forEach((item) => {
    if (links.length >= profileShowcaseLinksMaxCount) return
    if (!item || typeof item !== 'object') return
    const label = String(item.label || '').trim().slice(0, profileShowcaseLinkLabelMaxLength)
    const rawUrl = String(item.url || '').trim().slice(0, profileShowcaseLinkUrlMaxLength)
    if (!label || !rawUrl) return
    let url = rawUrl
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`
    }
    links.push({ label, url })
  })
  return links
}

function normalizeProfileShowcasePayload(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    headline: String(source.headline || '').trim().slice(0, profileShowcaseHeadlineMaxLength),
    heroTheme: normalizeProfileShowcaseTheme(source.heroTheme),
    skills: normalizeProfileShowcaseSkills(source.skills),
    badges: normalizeProfileShowcaseBadges(source.badges),
    links: normalizeProfileShowcaseLinks(source.links)
  }
}

function emptyProfileShowcase() {
  return {
    headline: '',
    heroTheme: 'default',
    skills: [],
    badges: [],
    links: [],
    updatedAt: null
  }
}

function mapProfileShowcaseRow(row) {
  if (!row || typeof row !== 'object') return emptyProfileShowcase()
  const normalized = normalizeProfileShowcasePayload({
    headline: row.headline,
    heroTheme: row.hero_theme,
    skills: row.skills,
    badges: row.badges,
    links: row.links
  })
  return {
    ...normalized,
    updatedAt: row.updated_at || null
  }
}

function isVerificationSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('verification_requests') || message.includes('is_verified')
}

function isSecuritySchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return (
    message.includes('user_sessions') ||
    message.includes('user_security_settings') ||
    message.includes('user_two_factor_pending') ||
    message.includes('user_privacy_controls')
  )
}

function mapPrivacyControlRow(row) {
  if (!row || typeof row !== 'object') {
    return {
      isMuted: false,
      isBlocked: false,
      hideProfileContent: false,
      denyDm: false
    }
  }
  return {
    isMuted: row.is_muted === true,
    isBlocked: row.is_blocked === true,
    hideProfileContent: row.hide_profile_content === true,
    denyDm: row.deny_dm === true
  }
}

async function getPrivacyControl(ownerId, targetUserId, dbClient = null) {
  const db = dbClient || pool
  const result = await db.query(
    `select is_muted, is_blocked, hide_profile_content, deny_dm
     from user_privacy_controls
     where owner_id = $1 and target_user_id = $2
     limit 1`,
    [ownerId, targetUserId]
  )
  if (result.rowCount === 0) return mapPrivacyControlRow(null)
  return mapPrivacyControlRow(result.rows[0])
}

async function upsertPrivacyControl(ownerId, targetUserId, patch, dbClient = null) {
  const db = dbClient || pool
  const current = await getPrivacyControl(ownerId, targetUserId, db)
  let next = {
    isMuted: normalizeBooleanFlag(patch.isMuted, current.isMuted),
    isBlocked: normalizeBooleanFlag(patch.isBlocked, current.isBlocked),
    hideProfileContent: normalizeBooleanFlag(patch.hideProfileContent, current.hideProfileContent),
    denyDm: normalizeBooleanFlag(patch.denyDm, current.denyDm)
  }
  if (next.isBlocked) {
    next = {
      ...next,
      denyDm: true,
      hideProfileContent: true
    }
  }
  const hasAnyRule = next.isMuted || next.isBlocked || next.hideProfileContent || next.denyDm
  if (!hasAnyRule) {
    await db.query(
      'delete from user_privacy_controls where owner_id = $1 and target_user_id = $2',
      [ownerId, targetUserId]
    )
    return next
  }
  await db.query(
    `insert into user_privacy_controls (
       owner_id,
       target_user_id,
       is_muted,
       is_blocked,
       hide_profile_content,
       deny_dm,
       created_at,
       updated_at
     )
     values ($1, $2, $3, $4, $5, $6, now(), now())
     on conflict (owner_id, target_user_id)
     do update set
       is_muted = excluded.is_muted,
       is_blocked = excluded.is_blocked,
       hide_profile_content = excluded.hide_profile_content,
       deny_dm = excluded.deny_dm,
       updated_at = now()`,
    [ownerId, targetUserId, next.isMuted, next.isBlocked, next.hideProfileContent, next.denyDm]
  )
  return next
}

async function getPrivacyRelationship(viewerId, targetUserId, dbClient = null) {
  const db = dbClient || pool
  const [viewerControl, targetControl] = await Promise.all([
    getPrivacyControl(viewerId, targetUserId, db),
    getPrivacyControl(targetUserId, viewerId, db)
  ])
  const dmBlocked = (
    viewerControl.isBlocked ||
    viewerControl.denyDm ||
    targetControl.isBlocked ||
    targetControl.denyDm
  )
  const profileHidden = (
    viewerControl.hideProfileContent ||
    viewerControl.isBlocked ||
    targetControl.isBlocked
  )
  return {
    viewerControl,
    targetControl,
    dmBlocked,
    profileHidden,
    blockedByTarget: targetControl.isBlocked === true
  }
}

async function isDirectMessagingBlocked(userId, targetUserId, dbClient = null) {
  const relation = await getPrivacyRelationship(userId, targetUserId, dbClient)
  return relation.dmBlocked === true
}

async function isProfileHiddenForViewer(viewerId, targetUserId, dbClient = null) {
  const relation = await getPrivacyRelationship(viewerId, targetUserId, dbClient)
  return relation.profileHidden === true
}

async function getUserSecuritySettings(userId, dbClient = null) {
  const db = dbClient || pool
  let result
  try {
    result = await db.query(
      `select user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at
       from user_security_settings
       where user_id = $1
       limit 1`,
      [userId]
    )
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return {
        userId,
        twoFactorEnabled: false,
        twoFactorSecret: '',
        backupCodeHashes: [],
        updatedAt: null
      }
    }
    throw err
  }
  if (result.rowCount === 0) {
    return {
      userId,
      twoFactorEnabled: false,
      twoFactorSecret: '',
      backupCodeHashes: [],
      updatedAt: null
    }
  }
  const row = result.rows[0]
  const backupCodeHashes = Array.isArray(row.two_factor_backup_codes)
    ? row.two_factor_backup_codes.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  return {
    userId: row.user_id,
    twoFactorEnabled: row.two_factor_enabled === true,
    twoFactorSecret: String(row.two_factor_secret || ''),
    backupCodeHashes,
    updatedAt: row.updated_at || null
  }
}

async function isTeacherAccount(userId, dbClient = null) {
  const db = dbClient || pool
  try {
    const result = await db.query(
      `select exists(
          select 1
          from user_roles
          where user_id = $1 and role_value = 'teacher'
        ) as is_teacher`,
      [userId]
    )
    if (result.rowCount > 0) return result.rows[0].is_teacher === true
  } catch (err) {
    if (!(err && err.code === '42P01')) {
      throw err
    }
  }
  const fallback = await db.query('select role from users where id = $1 limit 1', [userId])
  if (fallback.rowCount === 0) return false
  return String(fallback.rows[0].role || '').trim().toLowerCase() === 'teacher'
}

async function isTwoFactorEligibleForUser(userId, dbClient = null) {
  const db = dbClient || pool
  const access = await getUserAccessFlags(userId, db)
  if (!access.exists) return false
  if (access.isAdmin) return true
  return isTeacherAccount(userId, db)
}

async function consumeBackupCodeHash(userId, backupCode) {
  const normalizedCode = normalizeTotpCode(backupCode).toUpperCase()
  if (!normalizedCode) return false
  const settings = await getUserSecuritySettings(userId)
  if (!settings.twoFactorEnabled || settings.backupCodeHashes.length === 0) return false
  let matchedIndex = -1
  for (let index = 0; index < settings.backupCodeHashes.length; index += 1) {
    const hashValue = settings.backupCodeHashes[index]
    try {
      const matched = await bcrypt.compare(normalizedCode, hashValue)
      if (matched) {
        matchedIndex = index
        break
      }
    } catch (_err) {
      // ignore invalid hash rows
    }
  }
  if (matchedIndex < 0) return false
  const remaining = settings.backupCodeHashes.filter((_item, idx) => idx !== matchedIndex)
  await pool.query(
    `insert into user_security_settings (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
     values ($1, true, $2, $3::jsonb, now())
     on conflict (user_id)
     do update set
       two_factor_enabled = excluded.two_factor_enabled,
       two_factor_secret = excluded.two_factor_secret,
       two_factor_backup_codes = excluded.two_factor_backup_codes,
       updated_at = now()`,
    [userId, settings.twoFactorSecret, JSON.stringify(remaining)]
  )
  return true
}

async function getLatestVerificationRequestForUser(userId, dbClient = null) {
  const db = dbClient || pool
  const result = await db.query(
    `select id,
            user_id,
            full_name,
            reason,
            evidence,
            status,
            admin_note,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
     from verification_requests
     where user_id = $1
     order by created_at desc
     limit 1`,
    [userId]
  )
  if (result.rowCount === 0) return null
  return mapVerificationRequest(result.rows[0])
}

function isProfileFeaturesSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return (
    message.includes('user_subscriptions') ||
    message.includes('profile_tracks') ||
    message.includes('user_roles') ||
    message.includes('user_security_settings')
  )
}

function isProfileShowcaseSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('user_profile_showcases')
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
              coalesce(ss.two_factor_enabled, false) as two_factor_enabled,
              coalesce(
                (select array_agg(ur.role_value order by ur.role_value asc)
                 from user_roles ur
                 where ur.user_id = u.id),
                array[u.role]
              ) as roles,
              (select count(*) from user_subscriptions s where s.target_user_id = u.id) as subscribers_count,
              (select count(*) from user_subscriptions s where s.subscriber_id = u.id) as subscriptions_count,
              (select count(*) from profile_tracks t where t.user_id = u.id) as tracks_count,
              exists(
                select 1
               from user_subscriptions s
               where s.subscriber_id = $2 and s.target_user_id = u.id
              ) as is_subscribed
       from users u
       left join user_security_settings ss on ss.user_id = u.id
       where u.id = $1`,
      [userId, viewerId || null]
    )
    if (result.rowCount === 0) return null
    return mapUser(result.rows[0])
  } catch (err) {
    if (!isProfileFeaturesSchemaError(err)) throw err
    const fallback = await pool.query(
      `select u.*,
              false as two_factor_enabled,
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
              coalesce(ss.two_factor_enabled, false) as two_factor_enabled,
              coalesce(
                (select array_agg(ur.role_value order by ur.role_value asc)
                 from user_roles ur
                 where ur.user_id = u.id),
                array[u.role]
              ) as roles,
              (select count(*) from user_subscriptions s where s.target_user_id = u.id) as subscribers_count,
              (select count(*) from user_subscriptions s where s.subscriber_id = u.id) as subscriptions_count,
              (select count(*) from profile_tracks t where t.user_id = u.id) as tracks_count,
              exists(
                select 1
               from user_subscriptions s
               where s.subscriber_id = $2 and s.target_user_id = u.id
              ) as is_subscribed
       from users u
       left join user_security_settings ss on ss.user_id = u.id
       where u.username = $1`,
      [username, viewerId || null]
    )
    if (result.rowCount === 0) return null
    return mapUser(result.rows[0])
  } catch (err) {
    if (!isProfileFeaturesSchemaError(err)) throw err
    const fallback = await pool.query(
      `select u.*,
              false as two_factor_enabled,
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
    showRole: row.other_show_role !== false,
    avatarUrl: row.other_avatar_url,
    isVerified: row.other_is_verified === true,
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
    isPersonalFavorites: row.is_personal_favorites === true,
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

function isMessageForwardSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('message_forwards')
}

function isMessageBookmarksSchemaError(err) {
  if (!err || typeof err !== 'object') return false
  if (err.code !== '42P01' && err.code !== '42703') return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('message_bookmarks')
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

async function attachForwardDataToMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages
  const messageIds = messages
    .map((message) => message && message.id)
    .filter((id) => typeof id === 'string')
  if (messageIds.length === 0) return messages

  try {
    const result = await pool.query(
      `select mf.message_id,
              mf.source_message_id,
              mf.source_sender_id,
              mf.source_sender_username,
              mf.source_sender_display_name,
              mf.source_conversation_id
       from message_forwards mf
       where mf.message_id = any($1::uuid[])`,
      [messageIds]
    )
    if (result.rowCount === 0) return messages

    const forwardedByMessageId = new Map()
    result.rows.forEach((row) => {
      forwardedByMessageId.set(row.message_id, {
        sourceMessageId: row.source_message_id || null,
        sourceSenderId: row.source_sender_id || null,
        sourceSenderUsername: row.source_sender_username || null,
        sourceSenderDisplayName: row.source_sender_display_name || null,
        sourceConversationId: row.source_conversation_id || null
      })
    })

    return messages.map((message) => {
      if (!message || !message.id) return message
      const forwardedFrom = forwardedByMessageId.get(message.id)
      if (!forwardedFrom) return message
      return { ...message, forwardedFrom }
    })
  } catch (err) {
    if (isMessageForwardSchemaError(err)) {
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
      showRole: row.author_show_role !== false,
      avatarUrl: row.author_avatar_url
    }
  }
}

async function getPostByIdForViewer(postId, viewerId) {
  const result = await pool.query(
    `select p.id, p.body, p.image_url, p.repost_of, p.edited_at, p.deleted_at, p.created_at,
            u.id as author_id, u.username as author_username,
            u.display_name as author_display_name, u.show_role as author_show_role, u.avatar_url as author_avatar_url,
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

async function getPersonalFavoritesConversations(client, userId) {
  const result = await client.query(
    `select c.id,
            c.title,
            c.created_at,
            coalesce((
              select count(*)
              from messages m
              where m.conversation_id = c.id
                and m.deleted_at is null
            ), 0)::int as message_count
     from conversations c
     join conversation_members me on me.conversation_id = c.id and me.user_id = $1
     where c.is_group = true
       and c.title = any($2::text[])
       and not exists (
         select 1
         from conversation_members other
         where other.conversation_id = c.id
           and other.user_id <> $1
       )
     order by (c.title = $3) desc, message_count desc, c.created_at asc, c.id asc`,
    [userId, PERSONAL_FAVORITES_TITLE_ALIASES, PERSONAL_FAVORITES_TITLE]
  )
  return result.rows || []
}

async function normalizePersonalFavoritesConversations(client, userId) {
  const conversations = await getPersonalFavoritesConversations(client, userId)
  if (!Array.isArray(conversations) || conversations.length === 0) return null

  const primary = conversations[0]
  const primaryId = primary.id

  if (primary.title !== PERSONAL_FAVORITES_TITLE) {
    await client.query(
      'update conversations set title = $1 where id = $2',
      [PERSONAL_FAVORITES_TITLE, primaryId]
    )
  }

  const duplicates = conversations.slice(1)
  for (const duplicate of duplicates) {
    const duplicateId = duplicate.id
    if (!duplicateId || duplicateId === primaryId) continue

    await client.query(
      `update messages
       set conversation_id = $1
       where conversation_id = $2`,
      [primaryId, duplicateId]
    )

    try {
      await client.query(
        `update message_bookmarks
         set conversation_id = $1
         where conversation_id = $2`,
        [primaryId, duplicateId]
      )
    } catch (err) {
      if (!isMessageBookmarksSchemaError(err)) throw err
    }

    try {
      await client.query(
        `update message_forwards
         set source_conversation_id = $1
         where source_conversation_id = $2`,
        [primaryId, duplicateId]
      )
    } catch (err) {
      if (!isMessageForwardSchemaError(err)) throw err
    }

    await client.query(
      'delete from conversations where id = $1',
      [duplicateId]
    )
  }

  return primaryId
}

async function setConversationFavoriteIfSupported(client, conversationId, userId) {
  try {
    await client.query(
      `update conversation_members
       set is_favorite = true
       where conversation_id = $1 and user_id = $2`,
      [conversationId, userId]
    )
  } catch (err) {
    if (!err || err.code !== '42703') throw err
  }
}

async function ensurePersonalFavoritesConversation(userId) {
  if (!isValidUuid(userId)) return null
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`personal-favorites:${userId}`])

    let conversationId = await normalizePersonalFavoritesConversations(client, userId)
    if (!conversationId) {
      const createdConversation = await client.query(
        'insert into conversations (title, is_group) values ($1, true) returning id',
        [PERSONAL_FAVORITES_TITLE]
      )
      conversationId = createdConversation.rows[0].id
    }

    await client.query(
      `insert into conversation_members (conversation_id, user_id, role)
       values ($1, $2, 'owner')
       on conflict (conversation_id, user_id) do nothing`,
      [conversationId, userId]
    )

    await setConversationFavoriteIfSupported(client, conversationId, userId)

    await client.query('commit')
    return conversationId
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

async function repairLegacyPersonalFavoritesConversations() {
  try {
    const result = await pool.query(
      `select distinct me.user_id
       from conversations c
       join conversation_members me on me.conversation_id = c.id
       where c.is_group = true
         and c.title = any($1::text[])
         and not exists (
           select 1
           from conversation_members other
           where other.conversation_id = c.id
             and other.user_id <> me.user_id
         )`,
      [LEGACY_PERSONAL_FAVORITES_TITLES]
    )

    const userIds = result.rows
      .map((row) => row.user_id)
      .filter((value) => isValidUuid(value))

    if (userIds.length === 0) return

    let repairedCount = 0
    for (const userId of userIds) {
      try {
        await ensurePersonalFavoritesConversation(userId)
        repairedCount += 1
      } catch (err) {
        console.error('Personal favorites repair user error', { userId, err })
      }
    }

    console.log(`Personal favorites repair completed: ${repairedCount}/${userIds.length}`)
  } catch (err) {
    console.error('Personal favorites repair failed', err)
  }
}

async function getUserConversations(userId) {
  try {
    await ensurePersonalFavoritesConversation(userId)
  } catch (err) {
    console.error('Ensure personal favorites conversation error', err)
  }

  const queryWithFavorites = `select c.id,
            c.title,
            c.is_group,
            me.is_favorite,
            (
              c.is_group = true
              and c.title = $2
              and not exists (
                select 1
                from conversation_members personal_members
                where personal_members.conversation_id = c.id
                  and personal_members.user_id <> $1
              )
            ) as is_personal_favorites,
            u.id as other_id,
            u.username as other_username,
            u.display_name as other_display_name,
            u.role as other_role,
            u.show_role as other_show_role,
            u.avatar_url as other_avatar_url,
            u.is_verified as other_is_verified,
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
     order by is_personal_favorites desc, me.is_favorite desc, lm.created_at desc nulls last, c.created_at desc`

  const queryWithoutFavorites = `select c.id,
            c.title,
            c.is_group,
            false as is_favorite,
            (
              c.is_group = true
              and c.title = $2
              and not exists (
                select 1
                from conversation_members personal_members
                where personal_members.conversation_id = c.id
                  and personal_members.user_id <> $1
              )
            ) as is_personal_favorites,
            u.id as other_id,
            u.username as other_username,
            u.display_name as other_display_name,
            u.role as other_role,
            u.show_role as other_show_role,
            u.avatar_url as other_avatar_url,
            null::boolean as other_is_verified,
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
     order by is_personal_favorites desc, lm.created_at desc nulls last, c.created_at desc`

  try {
    const result = await pool.query(queryWithFavorites, [userId, PERSONAL_FAVORITES_TITLE])
    return result.rows.map(mapConversation)
  } catch (err) {
    if (!err || err.code !== '42703') throw err
    const fallback = await pool.query(queryWithoutFavorites, [userId, PERSONAL_FAVORITES_TITLE])
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

async function getUserIdentityById(userId) {
  if (!isValidUuid(userId)) return null
  const result = await pool.query(
    `select id, username, display_name
     from users
     where id = $1
     limit 1`,
    [userId]
  )
  return result.rowCount > 0 ? result.rows[0] : null
}

async function getUserIdsByUsernames(usernames, excludedUserIds = []) {
  const normalizedUsernames = Array.from(new Set((Array.isArray(usernames) ? usernames : [])
    .map((item) => normalizeUsername(item))
    .filter(Boolean)))
  if (normalizedUsernames.length === 0) return []

  const excluded = new Set((Array.isArray(excludedUserIds) ? excludedUserIds : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))
  const result = await pool.query(
    `select id
     from users
     where username = any($1::text[])`,
    [normalizedUsernames]
  )
  return Array.from(new Set(result.rows
    .map((row) => String(row.id || '').trim())
    .filter((userId) => userId && !excluded.has(userId))))
}

function createPushPayload(payload = {}) {
  const url = typeof payload.url === 'string' && payload.url.trim() ? payload.url.trim() : '/'
  return {
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'KTK Messenger',
    body: typeof payload.body === 'string' ? payload.body.trim() : '',
    url,
    tag: typeof payload.tag === 'string' && payload.tag.trim() ? payload.tag.trim() : 'ktk-general',
    conversationId: typeof payload.conversationId === 'string' ? payload.conversationId : null,
    messageId: typeof payload.messageId === 'string' ? payload.messageId : null,
    postId: typeof payload.postId === 'string' ? payload.postId : null,
    username: typeof payload.username === 'string' ? payload.username : null,
    settingsSection: typeof payload.settingsSection === 'string' ? payload.settingsSection : null,
    openComments: payload.openComments === true,
    icon: typeof payload.icon === 'string' && payload.icon.trim() ? payload.icon.trim() : pushNotificationIcon,
    badge: typeof payload.badge === 'string' && payload.badge.trim() ? payload.badge.trim() : pushNotificationBadge,
    skipWhenVisible: payload.skipWhenVisible !== false
  }
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
  if (!conversationId) return true
  const socketIds = getSocketIdsForUser(userId)
  if (socketIds.length === 0) return true
  return !socketIds.some((socketId) => {
    const state = socketState.get(socketId)
    if (!state) return false
    return state.focused === true && state.activeConversationId === conversationId
  })
}

function serializePushErrorHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {}
  if (typeof headers.forEach === 'function') {
    const serialized = {}
    headers.forEach((value, key) => {
      serialized[key] = String(value)
    })
    return serialized
  }
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, value.map((item) => String(item)).join(', ')]
    }
    return [key, String(value)]
  }))
}

function createPushErrorPreview(value, maxLength = 280) {
  let raw = ''
  if (typeof value === 'string') {
    raw = value
  } else if (Buffer.isBuffer(value)) {
    raw = value.toString('utf8')
  } else if (value && typeof value === 'object') {
    try {
      raw = JSON.stringify(value)
    } catch (_err) {
      raw = String(value)
    }
  } else if (value != null) {
    raw = String(value)
  }
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed
}

function logPushDeliveryFailure(details) {
  console.error('Web push delivery failed', details)
}

function createPushTopic(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''

  const sanitized = raw
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (sanitized && sanitized.length <= 32) {
    return sanitized
  }

  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
  const prefix = sanitized.slice(0, 15).replace(/^-+|-+$/g, '')
  return prefix ? `${prefix}-${hash}` : hash
}

async function sendPushToUsers(userIds, payload) {
  const summary = {
    sent: 0,
    expired: 0,
    failed: 0,
    skipped: 0,
    results: []
  }
  if (!webPushEnabled) return summary
  const targets = Array.from(new Set((userIds || []).filter((id) => typeof id === 'string')))
  if (targets.length === 0) return summary
  const normalizedPayload = createPushPayload(payload)

  const subscriptions = await pool.query(
    `select user_id, endpoint, p256dh, auth
     from push_subscriptions
     where user_id = any($1::uuid[])`,
    [targets]
  )
  if (subscriptions.rowCount === 0) return summary

  const body = JSON.stringify(normalizedPayload)
  const results = await Promise.all(subscriptions.rows.map(async (row) => {
    if (!shouldSendPushToUser(row.user_id, normalizedPayload.conversationId || null)) {
      return {
        userId: row.user_id,
        endpoint: row.endpoint,
        status: 'skipped-visible',
        errorCode: '',
        errorMessage: ''
      }
    }
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
        topic: createPushTopic(normalizedPayload.tag) || undefined
      })
      return {
        userId: row.user_id,
        endpoint: row.endpoint,
        status: 'sent',
        errorCode: '',
        errorMessage: ''
      }
    } catch (err) {
      const statusCode = err && typeof err.statusCode === 'number' ? err.statusCode : null
      const errorCode = String(
        (err && (err.code || err.name)) ||
        (statusCode ? `http_${statusCode}` : 'push_send_failed')
      ).trim()
      const errorMessage = createPushErrorPreview(
        err && Object.prototype.hasOwnProperty.call(err, 'body') ? err.body : (err && err.message ? err.message : '')
      )
      logPushDeliveryFailure({
        userId: row.user_id,
        endpoint: row.endpoint,
        statusCode,
        errorCode,
        errorMessage,
        headers: serializePushErrorHeaders(err && err.headers ? err.headers : null)
      })
      if (statusCode === 404 || statusCode === 410) {
        await pool.query('delete from push_subscriptions where endpoint = $1', [row.endpoint]).catch(() => {})
        return {
          userId: row.user_id,
          endpoint: row.endpoint,
          status: 'expired',
          errorCode,
          errorMessage: errorMessage || 'Push subscription is no longer valid.'
        }
      }
      return {
        userId: row.user_id,
        endpoint: row.endpoint,
        status: 'failed',
        errorCode,
        errorMessage: errorMessage || 'Push delivery failed.'
      }
    }
  }))
  results.filter(Boolean).forEach((result) => {
    summary.results.push(result)
    if (result.status === 'sent') {
      summary.sent += 1
    } else if (result.status === 'expired') {
      summary.expired += 1
    } else if (result.status === 'failed') {
      summary.failed += 1
    } else {
      summary.skipped += 1
    }
  })
  return summary
}

async function notifyUserAboutAdminAction(userId, payload = {}) {
  if (!userId || typeof userId !== 'string') return
  const normalizedPayload = createPushPayload({
    url: '/?settings=security',
    settingsSection: 'security',
    skipWhenVisible: false,
    ...payload
  })
  await sendPushToUsers([userId], normalizedPayload)
}

io.use(async (socket, next) => {
  const token = extractJwtToken(socket.handshake.auth && socket.handshake.auth.token)
  if (!token) return next(new Error('No token'))
  try {
    const payload = jwt.verify(token, jwtSecret, jwtVerifyOptions)
    if (!payload || !payload.sub || !payload.sid) {
      return next(new Error('Session expired'))
    }
    const validation = await validateSessionByTokenPayload({
      userId: payload.sub,
      sessionId: payload.sid,
      token,
      touch: false
    })
    if (!validation.ok) {
      return next(new Error('Session expired'))
    }
    socket.userId = payload.sub
    socket.sessionId = payload.sid
    socket.userIp = getSocketIp(socket)
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
  if (socket.sessionId && isValidUuid(socket.sessionId)) {
    void pool.query(
      `update user_sessions
       set last_seen_at = now(),
           ip_address = coalesce($2, ip_address)
       where id = $1 and user_id = $3`,
      [socket.sessionId, socket.userIp || null, socket.userId]
    ).catch(() => {})
  }

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

app.get('/api/roles', async (req, res) => {
  try {
    const roles = await getAvailableRoles()
    res.json({ roles })
  } catch (err) {
    console.error('Roles list error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login)
    const username = normalizeUsername(req.body.username)
    const password = req.body.password
    const requestedRoles = ['student']

    if (login.length < 3) {
      return res.status(400).json({ error: 'Login must be at least 3 characters' })
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3+ chars and contain only a-z, 0-9, _' })
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const allowedRoles = await getAllowedRoleValues(requestedRoles)
    if (allowedRoles.length !== requestedRoles.length) {
      return res.status(500).json({ error: 'Role catalog is not ready' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const client = await pool.connect()
    let result
    try {
      await client.query('begin')
      result = await client.query(
        'insert into users (login, username, password_hash, role) values ($1, $2, $3, $4) returning *',
        [login, username, passwordHash, allowedRoles[0]]
      )
      await saveUserRoles(result.rows[0].id, allowedRoles, client)
      await enforceReservedOwnerAccess(result.rows[0].id, username, client)
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }

    const user = await getUserByIdWithStats(result.rows[0].id, result.rows[0].id) || mapUser(result.rows[0])
    const token = await createAuthSessionToken(user.id, {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: getRequestIp(req)
    })

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

    const securitySettings = await getUserSecuritySettings(userRow.id)
    const twoFactorEligible = await isTwoFactorEligibleForUser(userRow.id)
    if (twoFactorEligible && securitySettings.twoFactorEnabled) {
      const twoFactorToken = createTwoFactorChallengeToken(userRow.id)
      return res.json({
        requiresTwoFactor: true,
        twoFactorToken
      })
    }

    const user = await getUserByIdWithStats(userRow.id, userRow.id) || mapUser(userRow)
    const token = await createAuthSessionToken(user.id, {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: getRequestIp(req)
    })

    res.json({
      token,
      user,
      twoFactorSetupRecommended: twoFactorEligible && !securitySettings.twoFactorEnabled
    })
  } catch (err) {
    console.error('Login error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const challenge = verifyTwoFactorChallengeToken(req.body.twoFactorToken)
    if (!challenge || !isValidUuid(String(challenge.sub || ''))) {
      return res.status(401).json({ error: 'Invalid 2FA challenge' })
    }
    const userId = String(challenge.sub)
    const code = normalizeTotpCode(req.body.code)
    const backupCode = normalizeTotpCode(req.body.backupCode).toUpperCase()
    if (!code && !backupCode) {
      return res.status(400).json({ error: '2FA code or backup code is required' })
    }

    const securitySettings = await getUserSecuritySettings(userId)
    if (!securitySettings.twoFactorEnabled || !securitySettings.twoFactorSecret) {
      return res.status(403).json({ error: '2FA is not enabled for this account' })
    }

    let passed = false
    if (code) {
      passed = verifyTotpCode(securitySettings.twoFactorSecret, code, 1)
    } else if (backupCode) {
      passed = await consumeBackupCodeHash(userId, backupCode)
    }
    if (!passed) {
      return res.status(401).json({ error: 'Invalid 2FA code' })
    }

    const user = await getUserByIdWithStats(userId, userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.isBanned) return res.status(403).json({ error: 'User is banned' })

    const token = await createAuthSessionToken(user.id, {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: getRequestIp(req)
    })
    res.json({ token, user })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Security feature is unavailable: database migration required' })
    }
    console.error('2FA verify login error', err)
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

app.post('/api/me/change-password', auth, ensureNotBanned, async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : ''
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : ''

    if (!isValidPassword(currentPassword)) {
      return res.status(400).json({ error: 'Current password must be at least 6 characters' })
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' })
    }

    const userResult = await pool.query(
      'select id, password_hash, is_banned from users where id = $1 limit 1',
      [req.userId]
    )
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const userRow = userResult.rows[0]
    if (userRow.is_banned === true) return res.status(403).json({ error: 'User is banned' })

    const match = await bcrypt.compare(currentPassword, userRow.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query('update users set password_hash = $2 where id = $1', [req.userId, passwordHash])

    let revokedCount = 0
    try {
      const revokeResult = await pool.query(
        `update user_sessions
         set revoked_at = now(),
             revoke_reason = 'password_changed'
         where user_id = $1
           and revoked_at is null
           and id <> $2`,
        [req.userId, req.sessionId || null]
      )
      revokedCount = Number(revokeResult.rowCount || 0)
    } catch (sessionErr) {
      if (!isSecuritySchemaError(sessionErr)) {
        throw sessionErr
      }
    }

    res.json({ ok: true, revokedCount })
  } catch (err) {
    console.error('Change password error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me/sessions', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `select id,
              user_agent,
              ip_address,
              created_at,
              last_seen_at,
              expires_at,
              revoked_at
       from user_sessions
       where user_id = $1
       order by created_at desc
       limit $2`,
      [req.userId, sessionListLimit]
    )
    const sessions = result.rows.map((row) => ({
      id: row.id,
      userAgent: row.user_agent || '',
      ipAddress: row.ip_address || '',
      createdAt: row.created_at || null,
      lastSeenAt: row.last_seen_at || null,
      expiresAt: row.expires_at || null,
      revokedAt: row.revoked_at || null,
      isCurrent: req.sessionId && row.id === req.sessionId
    }))
    res.json({ sessions })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Sessions feature is unavailable: database migration required' })
    }
    console.error('Get sessions error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/sessions/:id/revoke', auth, ensureNotBanned, async (req, res) => {
  try {
    const sessionId = req.params.id
    if (!isValidUuid(sessionId)) {
      return res.status(400).json({ error: 'Invalid session id' })
    }
    const revokeReason = String(req.body.reason || 'manual').trim().slice(0, 120) || 'manual'
    const result = await pool.query(
      `update user_sessions
       set revoked_at = now(),
           revoke_reason = $3
       where id = $1
         and user_id = $2
         and revoked_at is null
       returning id`,
      [sessionId, req.userId, revokeReason]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }
    res.json({ ok: true, sessionId })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Sessions feature is unavailable: database migration required' })
    }
    console.error('Revoke session error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/sessions/revoke-others', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `update user_sessions
       set revoked_at = now(),
           revoke_reason = 'revoke_others'
       where user_id = $1
         and revoked_at is null
         and id <> $2`,
      [req.userId, req.sessionId || null]
    )
    res.json({ ok: true, revokedCount: Number(result.rowCount || 0) })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Sessions feature is unavailable: database migration required' })
    }
    console.error('Revoke other sessions error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me/2fa/status', auth, ensureNotBanned, async (req, res) => {
  try {
    const eligible = await isTwoFactorEligibleForUser(req.userId)
    const settings = await getUserSecuritySettings(req.userId)
    const pending = await pool.query(
      `select expires_at
       from user_two_factor_pending
       where user_id = $1
       limit 1`,
      [req.userId]
    )
    const pendingRow = pending.rowCount > 0 ? pending.rows[0] : null
    const pendingActive = Boolean(pendingRow && Date.parse(pendingRow.expires_at || '') > Date.now())
    res.json({
      twoFactor: {
        eligible,
        enabled: settings.twoFactorEnabled === true,
        pendingSetup: pendingActive,
        backupCodesCount: settings.backupCodeHashes.length
      }
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: '2FA feature is unavailable: database migration required' })
    }
    console.error('Get 2FA status error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/2fa/setup', auth, ensureNotBanned, async (req, res) => {
  try {
    const eligible = await isTwoFactorEligibleForUser(req.userId)
    if (!eligible) {
      return res.status(403).json({ error: '2FA setup is available only for admins, owners and teachers' })
    }

    const userResult = await pool.query(
      'select username from users where id = $1 limit 1',
      [req.userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const secret = generateTotpSecret()
    const expiresAt = new Date(Date.now() + (twoFactorPendingTtlMinutes * 60 * 1000))
    await pool.query(
      `insert into user_two_factor_pending (user_id, secret, created_at, expires_at)
       values ($1, $2, now(), $3)
       on conflict (user_id)
       do update set
         secret = excluded.secret,
         created_at = now(),
         expires_at = excluded.expires_at`,
      [req.userId, secret, expiresAt.toISOString()]
    )

    const username = userResult.rows[0].username
    const issuer = 'KTK Messenger'
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(`${issuer}:${username}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${twoFactorOtpDigits}&period=${twoFactorOtpStepSeconds}`
    res.json({
      setup: {
        secret,
        otpAuthUrl,
        expiresAt: expiresAt.toISOString()
      }
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: '2FA feature is unavailable: database migration required' })
    }
    console.error('2FA setup error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/2fa/enable', auth, ensureNotBanned, async (req, res) => {
  try {
    const code = normalizeTotpCode(req.body.code)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid 2FA code format' })
    }
    const eligible = await isTwoFactorEligibleForUser(req.userId)
    if (!eligible) {
      return res.status(403).json({ error: '2FA setup is available only for admins, owners and teachers' })
    }
    const pending = await pool.query(
      `select secret, expires_at
       from user_two_factor_pending
       where user_id = $1
       limit 1`,
      [req.userId]
    )
    if (pending.rowCount === 0) {
      return res.status(404).json({ error: '2FA setup session not found' })
    }
    const pendingRow = pending.rows[0]
    const expiresAtMs = Date.parse(pendingRow.expires_at || '')
    if (!expiresAtMs || expiresAtMs <= Date.now()) {
      await pool.query('delete from user_two_factor_pending where user_id = $1', [req.userId]).catch(() => {})
      return res.status(410).json({ error: '2FA setup session expired. Start setup again.' })
    }
    if (!verifyTotpCode(pendingRow.secret, code, 1)) {
      return res.status(401).json({ error: 'Invalid 2FA code' })
    }

    const backupCodes = generateBackupCodes()
    const backupCodeHashes = await hashBackupCodes(backupCodes)
    await pool.query(
      `insert into user_security_settings (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
       values ($1, true, $2, $3::jsonb, now())
       on conflict (user_id)
       do update set
         two_factor_enabled = true,
         two_factor_secret = excluded.two_factor_secret,
         two_factor_backup_codes = excluded.two_factor_backup_codes,
         updated_at = now()`,
      [req.userId, pendingRow.secret, JSON.stringify(backupCodeHashes)]
    )
    await pool.query('delete from user_two_factor_pending where user_id = $1', [req.userId]).catch(() => {})
    res.json({
      ok: true,
      backupCodes
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: '2FA feature is unavailable: database migration required' })
    }
    console.error('2FA enable error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/2fa/disable', auth, ensureNotBanned, async (req, res) => {
  try {
    const code = normalizeTotpCode(req.body.code)
    const backupCode = normalizeTotpCode(req.body.backupCode).toUpperCase()
    if (!code && !backupCode) {
      return res.status(400).json({ error: '2FA code or backup code is required' })
    }
    const settings = await getUserSecuritySettings(req.userId)
    if (!settings.twoFactorEnabled || !settings.twoFactorSecret) {
      return res.status(400).json({ error: '2FA is not enabled' })
    }
    let passed = false
    if (code) {
      passed = verifyTotpCode(settings.twoFactorSecret, code, 1)
    } else if (backupCode) {
      passed = await consumeBackupCodeHash(req.userId, backupCode)
    }
    if (!passed) {
      return res.status(401).json({ error: 'Invalid 2FA code' })
    }
    await pool.query(
      `insert into user_security_settings (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
       values ($1, false, null, '[]'::jsonb, now())
       on conflict (user_id)
       do update set
         two_factor_enabled = false,
         two_factor_secret = null,
         two_factor_backup_codes = '[]'::jsonb,
         updated_at = now()`,
      [req.userId]
    )
    await pool.query('delete from user_two_factor_pending where user_id = $1', [req.userId]).catch(() => {})
    res.json({ ok: true })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: '2FA feature is unavailable: database migration required' })
    }
    console.error('2FA disable error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/2fa/regenerate-backup-codes', auth, ensureNotBanned, async (req, res) => {
  try {
    const code = normalizeTotpCode(req.body.code)
    const settings = await getUserSecuritySettings(req.userId)
    if (!settings.twoFactorEnabled || !settings.twoFactorSecret) {
      return res.status(400).json({ error: '2FA is not enabled' })
    }
    if (!verifyTotpCode(settings.twoFactorSecret, code, 1)) {
      return res.status(401).json({ error: 'Invalid 2FA code' })
    }
    const backupCodes = generateBackupCodes()
    const backupCodeHashes = await hashBackupCodes(backupCodes)
    await pool.query(
      `insert into user_security_settings (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
       values ($1, true, $2, $3::jsonb, now())
       on conflict (user_id)
       do update set
         two_factor_enabled = true,
         two_factor_secret = excluded.two_factor_secret,
         two_factor_backup_codes = excluded.two_factor_backup_codes,
         updated_at = now()`,
      [req.userId, settings.twoFactorSecret, JSON.stringify(backupCodeHashes)]
    )
    res.json({ ok: true, backupCodes })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: '2FA feature is unavailable: database migration required' })
    }
    console.error('2FA regenerate backup codes error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/me/verification-request', auth, ensureNotBanned, async (req, res) => {
  try {
    const verificationRequest = await getLatestVerificationRequestForUser(req.userId)
    res.json({ request: verificationRequest })
  } catch (err) {
    if (isVerificationSchemaError(err)) {
      return res.status(503).json({ error: 'Verification requests feature is unavailable: database migration required' })
    }
    console.error('Get my verification request error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/verification-request', auth, ensureNotBanned, async (req, res) => {
  try {
    const fullName = normalizeVerificationRequestFullName(req.body.fullName)
    const reason = normalizeVerificationRequestReason(req.body.reason)
    const evidence = normalizeVerificationRequestEvidence(req.body.evidence)

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters' })
    }
    if (reason.length < 12) {
      return res.status(400).json({ error: 'Reason must be at least 12 characters' })
    }

    const userResult = await pool.query(
      `select id, is_verified
       from users
       where id = $1
       limit 1`,
      [req.userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (userResult.rows[0].is_verified === true) {
      return res.status(400).json({ error: 'Profile is already verified' })
    }

    const pendingResult = await pool.query(
      `select id,
              user_id,
              full_name,
              reason,
              evidence,
              status,
              admin_note,
              reviewed_by,
              reviewed_at,
              created_at,
              updated_at
       from verification_requests
       where user_id = $1
         and status = 'pending'
       order by created_at desc
       limit 1`,
      [req.userId]
    )
    if (pendingResult.rowCount > 0) {
      return res.status(409).json({
        error: 'Pending verification request already exists',
        request: mapVerificationRequest(pendingResult.rows[0])
      })
    }

    const created = await pool.query(
      `insert into verification_requests (
         user_id,
         full_name,
         reason,
         evidence,
         status,
         created_at,
         updated_at
       )
       values ($1, $2, $3, $4, 'pending', now(), now())
       returning id,
                 user_id,
                 full_name,
                 reason,
                 evidence,
                 status,
                 admin_note,
                 reviewed_by,
                 reviewed_at,
                 created_at,
                 updated_at`,
      [req.userId, fullName, reason, evidence]
    )

    res.status(201).json({ ok: true, request: mapVerificationRequest(created.rows[0]) })
  } catch (err) {
    if (isVerificationSchemaError(err)) {
      return res.status(503).json({ error: 'Verification requests feature is unavailable: database migration required' })
    }
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Pending verification request already exists' })
    }
    console.error('Create verification request error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/verification-request/cancel', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `update verification_requests vr
       set status = 'cancelled',
           updated_at = now(),
           admin_note = null,
           reviewed_by = null,
           reviewed_at = null
       where vr.id = (
         select id
         from verification_requests
         where user_id = $1
           and status = 'pending'
         order by created_at desc
         limit 1
       )
       returning id,
                 user_id,
                 full_name,
                 reason,
                 evidence,
                 status,
                 admin_note,
                 reviewed_by,
                 reviewed_at,
                 created_at,
                 updated_at`,
      [req.userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pending verification request not found' })
    }
    res.json({ ok: true, request: mapVerificationRequest(result.rows[0]) })
  } catch (err) {
    if (isVerificationSchemaError(err)) {
      return res.status(503).json({ error: 'Verification requests feature is unavailable: database migration required' })
    }
    console.error('Cancel verification request error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.patch('/api/me', auth, ensureNotBanned, async (req, res) => {
  try {
    const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : null
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null
    const role = req.body.role ? normalizeRoleValue(req.body.role) : null
    const showRole = normalizeBooleanFlag(req.body.showRole, null)
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
    if (role && !(await hasAllowedRole(role))) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (role === ownerRoleValue) {
      const isOwner = await isOwnerAccount(req.userId)
      if (!isOwner) {
        return res.status(403).json({ error: 'Only owner can assign owner role' })
      }
    }
    if (role === 'teacher') {
      const isAdmin = await hasAdminAccess(req.userId)
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admin can assign teacher role' })
      }
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
             status_emoji = coalesce($7, status_emoji),
             show_role = coalesce($8, show_role)
         where id = $9
         returning *`,
        [displayName, bio, role, username, themeColor, statusText, statusEmoji, showRole, req.userId]
      )
    } catch (err) {
      if (!(err && err.code === '42703')) {
        throw err
      }
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
      } catch (statusErr) {
        if (!(statusErr && statusErr.code === '42703')) {
          throw statusErr
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
    }

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    if (role) {
      await saveUserRoles(req.userId, [role])
    }
    await enforceReservedOwnerAccess(req.userId, username || result.rows[0].username)

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

app.get('/api/me/showcase', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `select user_id, headline, hero_theme, skills, badges, links, updated_at
       from user_profile_showcases
       where user_id = $1
       limit 1`,
      [req.userId]
    )
    const showcase = result.rowCount > 0 ? mapProfileShowcaseRow(result.rows[0]) : emptyProfileShowcase()
    res.json({ showcase })
  } catch (err) {
    if (isProfileShowcaseSchemaError(err)) {
      return res.status(503).json({ error: 'Profile showcase feature is unavailable: database migration required' })
    }
    console.error('Get my showcase error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.put('/api/me/showcase', auth, ensureNotBanned, async (req, res) => {
  try {
    const payload = normalizeProfileShowcasePayload(
      req.body && typeof req.body === 'object' && req.body.showcase && typeof req.body.showcase === 'object'
        ? req.body.showcase
        : req.body
    )
    const result = await pool.query(
      `insert into user_profile_showcases (
         user_id,
         headline,
         hero_theme,
         skills,
         badges,
         links,
         updated_at
       )
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, now())
       on conflict (user_id) do update
         set headline = excluded.headline,
             hero_theme = excluded.hero_theme,
             skills = excluded.skills,
             badges = excluded.badges,
             links = excluded.links,
             updated_at = now()
       returning user_id, headline, hero_theme, skills, badges, links, updated_at`,
      [
        req.userId,
        payload.headline,
        payload.heroTheme,
        JSON.stringify(payload.skills),
        JSON.stringify(payload.badges),
        JSON.stringify(payload.links)
      ]
    )
    res.json({ showcase: mapProfileShowcaseRow(result.rows[0]) })
  } catch (err) {
    if (isProfileShowcaseSchemaError(err)) {
      return res.status(503).json({ error: 'Profile showcase feature is unavailable: database migration required' })
    }
    console.error('Save showcase error', err)
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

app.post('/api/notifications/test', auth, ensureNotBanned, async (req, res) => {
  try {
    if (!webPushEnabled) {
      return res.status(503).json({ error: 'Web push is not configured on the server' })
    }
    const delivery = await sendPushToUsers([req.userId], createPushPayload({
      title: 'KTK Messenger test notification',
      body: `Push self-test at ${new Date().toISOString()}`,
      url: '/?settings=notifications',
      settingsSection: 'notifications',
      tag: `push-test-${req.userId}`,
      skipWhenVisible: false
    }))
    res.json({
      ok: true,
      results: delivery.results.map((item) => ({
        endpoint: item.endpoint,
        status: item.status,
        errorCode: item.errorCode || '',
        errorMessage: item.errorMessage || ''
      }))
    })
  } catch (err) {
    console.error('Push self-test error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/me/avatar', uploadLimiter, auth, ensureNotBanned, imageUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Р¤Р°Р№Р» РЅРµ Р·Р°РіСЂСѓР¶РµРЅ' })
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
      return res.status(400).json({ error: 'Р¤Р°Р№Р» РЅРµ Р·Р°РіСЂСѓР¶РµРЅ' })
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

app.get('/api/me/privacy-controls', auth, ensureNotBanned, async (req, res) => {
  try {
    const result = await pool.query(
      `select pc.owner_id,
              pc.target_user_id,
              pc.is_muted,
              pc.is_blocked,
              pc.hide_profile_content,
              pc.deny_dm,
              pc.updated_at,
              u.username as target_username,
              u.display_name as target_display_name,
              u.avatar_url as target_avatar_url
       from user_privacy_controls pc
       join users u on u.id = pc.target_user_id
       where pc.owner_id = $1
       order by pc.updated_at desc
       limit 200`,
      [req.userId]
    )
    const controls = result.rows.map((row) => ({
      targetUserId: row.target_user_id,
      targetUsername: row.target_username,
      targetDisplayName: row.target_display_name || '',
      targetAvatarUrl: row.target_avatar_url || '',
      updatedAt: row.updated_at || null,
      ...mapPrivacyControlRow(row)
    }))
    res.json({ controls })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Get my privacy controls error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/privacy', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const targetResult = await pool.query('select id from users where username = $1 limit 1', [username])
    if (targetResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const targetId = targetResult.rows[0].id
    if (targetId === req.userId) {
      return res.json({
        privacy: {
          isMuted: false,
          isBlocked: false,
          hideProfileContent: false,
          denyDm: false,
          blockedByTarget: false,
          dmBlocked: false,
          profileHidden: false
        }
      })
    }
    const relation = await getPrivacyRelationship(req.userId, targetId)
    res.json({
      privacy: {
        ...relation.viewerControl,
        blockedByTarget: relation.blockedByTarget,
        dmBlocked: relation.dmBlocked,
        profileHidden: relation.profileHidden
      }
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Get user privacy relation error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/users/:username/privacy', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const targetResult = await pool.query('select id from users where username = $1 limit 1', [username])
    if (targetResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const targetId = targetResult.rows[0].id
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot set privacy controls for yourself' })
    }

    const updates = {
      isMuted: normalizeBooleanFlag(req.body.isMuted, null),
      isBlocked: normalizeBooleanFlag(req.body.isBlocked, null),
      hideProfileContent: normalizeBooleanFlag(req.body.hideProfileContent, null),
      denyDm: normalizeBooleanFlag(req.body.denyDm, null)
    }
    if (
      updates.isMuted === null &&
      updates.isBlocked === null &&
      updates.hideProfileContent === null &&
      updates.denyDm === null
    ) {
      return res.status(400).json({ error: 'At least one privacy flag is required' })
    }

    const saved = await upsertPrivacyControl(req.userId, targetId, updates)
    const relation = await getPrivacyRelationship(req.userId, targetId)
    res.json({
      ok: true,
      privacy: {
        ...saved,
        blockedByTarget: relation.blockedByTarget,
        dmBlocked: relation.dmBlocked,
        profileHidden: relation.profileHidden
      }
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Set user privacy relation error', err)
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
      `select id, username, display_name, role, show_role
       from users
       where username ilike $1
         and id <> $2
         and not exists (
           select 1
           from user_privacy_controls pc
           where pc.owner_id = $2
             and pc.target_user_id = users.id
             and (pc.is_blocked = true or pc.hide_profile_content = true)
         )
         and not exists (
           select 1
           from user_privacy_controls pc
           where pc.owner_id = users.id
             and pc.target_user_id = $2
             and pc.is_blocked = true
         )
       order by username
       limit 10`,
      [`${username}%`, req.userId]
    )
    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      showRole: row.show_role !== false,
      online: onlineUsers.has(row.id)
    }))
    res.json({ users })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Search error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const user = await getUserByUsernameWithStats(username, req.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.id !== req.userId) {
      const relation = await getPrivacyRelationship(req.userId, user.id)
      if (relation.profileHidden) {
        return res.status(403).json({ error: 'Profile content is hidden by privacy settings' })
      }
      user.viewerPrivacy = {
        ...relation.viewerControl,
        blockedByTarget: relation.blockedByTarget,
        dmBlocked: relation.dmBlocked,
        profileHidden: relation.profileHidden
      }
    }
    res.json({
      user
    })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Profile error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/showcase', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const userResult = await pool.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const profileId = userResult.rows[0].id
    if (profileId !== req.userId) {
      const hidden = await isProfileHiddenForViewer(req.userId, profileId)
      if (hidden) {
        return res.status(403).json({ error: 'Profile content is hidden by privacy settings' })
      }
    }

    const showcaseResult = await pool.query(
      `select user_id, headline, hero_theme, skills, badges, links, updated_at
       from user_profile_showcases
       where user_id = $1
       limit 1`,
      [profileId]
    )
    const showcase = showcaseResult.rowCount > 0 ? mapProfileShowcaseRow(showcaseResult.rows[0]) : emptyProfileShowcase()
    res.json({ showcase })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    if (isProfileShowcaseSchemaError(err)) {
      return res.status(503).json({ error: 'Profile showcase feature is unavailable: database migration required' })
    }
    console.error('Profile showcase error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/posts', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const userResult = await pool.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const profileId = userResult.rows[0].id
    if (profileId !== req.userId) {
      const hidden = await isProfileHiddenForViewer(req.userId, profileId)
      if (hidden) {
        return res.status(403).json({ error: 'Profile content is hidden by privacy settings' })
      }
    }
    const result = await pool.query(
      `select p.id, p.body, p.image_url, p.repost_of, p.created_at,
              u.id as author_id, u.username as author_username,
              u.display_name as author_display_name, u.show_role as author_show_role, u.avatar_url as author_avatar_url,
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
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
    console.error('Profile posts error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/users/:username/tracks', auth, ensureNotBanned, async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username)
    const userResult = await pool.query('select id from users where username = $1', [username])
    if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const profileId = userResult.rows[0].id
    if (profileId !== req.userId) {
      const hidden = await isProfileHiddenForViewer(req.userId, profileId)
      if (hidden) {
        return res.status(403).json({ error: 'Profile content is hidden by privacy settings' })
      }
    }

    const tracksResult = await pool.query(
      `select id, user_id, title, artist, audio_url, created_at
       from profile_tracks
       where user_id = $1
       order by created_at desc
       limit 100`,
      [profileId]
    )
    res.json({ tracks: tracksResult.rows.map(mapProfileTrack) })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
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
    const targetResult = await pool.query(
      `select id, username, display_name
       from users
       where username = $1
       limit 1`,
      [username]
    )
    if (targetResult.rowCount === 0) return res.status(404).json({ error: 'User not found' })

    const targetId = targetResult.rows[0].id
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot subscribe to yourself' })
    }
    if (await isProfileHiddenForViewer(req.userId, targetId)) {
      return res.status(403).json({ error: 'Profile content is hidden by privacy settings' })
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

    if (subscribed) {
      const actor = await getUserIdentityById(req.userId)
      if (actor && actor.id !== targetId) {
        const actorName = actor.display_name || actor.username || 'New follower'
        const pushPayload = createPushPayload({
          title: 'Новый подписчик',
          body: `${actorName} подписался на ваш профиль.`,
          url: `/?profile=${encodeURIComponent(actor.username)}`,
          tag: `profile-follow-${actor.id}`,
          username: actor.username,
          skipWhenVisible: false
        })
        void sendPushToUsers([targetId], pushPayload).catch((pushErr) => {
          console.error('Push send error', pushErr)
        })
      }
    }

    const user = await getUserByIdWithStats(targetId, req.userId)
    res.json({ subscribed, user })
  } catch (err) {
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
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
    if (await isDirectMessagingBlocked(req.userId, otherId, client)) {
      return res.status(403).json({ error: 'Direct messages are blocked by privacy settings' })
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
                u.show_role as other_show_role,
                u.avatar_url as other_avatar_url,
                u.is_verified as other_is_verified,
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
                u.show_role as other_show_role,
                u.avatar_url as other_avatar_url,
                null::boolean as other_is_verified,
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
    if (isSecuritySchemaError(err)) {
      return res.status(503).json({ error: 'Privacy controls feature is unavailable: database migration required' })
    }
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
    const withPolls = await attachPollDataToMessages(mappedMessages, req.userId)
    const messages = await attachForwardDataToMessages(withPolls)

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

app.get('/api/conversations/:id/bookmarks', auth, ensureNotBanned, async (req, res) => {
  const conversationId = req.params.id
  try {
    const membership = await pool.query(
      'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
      [conversationId, req.userId]
    )
    if (membership.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const queryWithPolls = `select mb.message_id,
              mb.created_at as saved_at,
              m.body,
              m.attachment_url,
              m.attachment_kind,
              m.created_at as message_created_at,
              m.sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              mp.question as poll_question
       from message_bookmarks mb
       join messages m on m.id = mb.message_id
       left join users u on u.id = m.sender_id
       left join message_polls mp on mp.message_id = m.id
       where mb.user_id = $1
         and mb.conversation_id = $2
         and m.deleted_at is null
       order by mb.created_at desc
       limit 200`

    const queryWithoutPolls = `select mb.message_id,
              mb.created_at as saved_at,
              m.body,
              m.attachment_url,
              m.attachment_kind,
              m.created_at as message_created_at,
              m.sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name,
              null::text as poll_question
       from message_bookmarks mb
       join messages m on m.id = mb.message_id
       left join users u on u.id = m.sender_id
       where mb.user_id = $1
         and mb.conversation_id = $2
         and m.deleted_at is null
       order by mb.created_at desc
       limit 200`

    let result
    try {
      result = await pool.query(queryWithPolls, [req.userId, conversationId])
    } catch (err) {
      if (!isMessagePollSchemaError(err)) throw err
      result = await pool.query(queryWithoutPolls, [req.userId, conversationId])
    }

    const bookmarks = result.rows.map((row) => ({
      messageId: row.message_id,
      savedAt: row.saved_at,
      messageCreatedAt: row.message_created_at,
      senderId: row.sender_id || null,
      senderUsername: row.sender_username || null,
      senderDisplayName: row.sender_display_name || null,
      preview: row.poll_question
        ? `рџ“Љ ${normalizePollQuestion(row.poll_question)}`
        : getMessagePreviewText(row.body, row.attachment_url, row.attachment_kind)
    }))

    res.json({ bookmarks })
  } catch (err) {
    if (isMessageBookmarksSchemaError(err)) {
      return res.status(503).json({ error: 'Bookmarks feature is unavailable: database migration required' })
    }
    console.error('Conversation bookmarks error', err)
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
    if (conversationResult.rows[0].is_group !== true) {
      const peerMember = membersResult.rows.find((member) => member.user_id !== req.userId)
      if (peerMember && await isDirectMessagingBlocked(req.userId, peerMember.user_id, client)) {
        return res.status(403).json({ error: 'Direct messages are blocked by privacy settings' })
      }
    }

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
        body: `рџ“Љ ${question}`,
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
    if (conversationResult.rows[0].is_group !== true) {
      const peerMember = membersResult.rows.find((member) => member.user_id !== req.userId)
      if (peerMember && await isDirectMessagingBlocked(req.userId, peerMember.user_id)) {
        return res.status(403).json({ error: 'Direct messages are blocked by privacy settings' })
      }
    }

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
    if (conversationResult.rows[0].is_group !== true) {
      const peerMember = membersResult.rows.find((member) => member.user_id !== req.userId)
      if (peerMember && await isDirectMessagingBlocked(req.userId, peerMember.user_id)) {
        return res.status(403).json({ error: 'Direct messages are blocked by privacy settings' })
      }
    }

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
    if (conversationResult.rows[0].is_group !== true) {
      const peerMember = membersResult.rows.find((member) => member.user_id !== req.userId)
      if (peerMember && await isDirectMessagingBlocked(req.userId, peerMember.user_id)) {
        return res.status(403).json({ error: 'Direct messages are blocked by privacy settings' })
      }
    }

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
              u.display_name as author_display_name, u.show_role as author_show_role, u.avatar_url as author_avatar_url,
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
      return res.status(400).json({ error: 'РџСѓСЃС‚РѕР№ РїРѕСЃС‚' })
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
    const mentionedUserIds = await getUserIdsByUsernames(
      extractMentionedUsernames(body),
      [req.userId]
    )
    if (mentionedUserIds.length > 0) {
      const actor = await getUserIdentityById(req.userId)
      if (actor) {
        const actorName = actor.display_name || actor.username || 'New mention'
        const pushPayload = createPushPayload({
          title: 'Упоминание в посте',
          body: `${actorName} упомянул вас в посте.`,
          url: `/?post=${encodeURIComponent(result.rows[0].id)}`,
          tag: `post-mention-${result.rows[0].id}`,
          postId: result.rows[0].id,
          skipWhenVisible: false
        })
        void sendPushToUsers(mentionedUserIds, pushPayload).catch((pushErr) => {
          console.error('Push send error', pushErr)
        })
      }
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
    const postResult = await pool.query(
      `select p.author_id
       from posts p
       where p.id = $1
         and p.deleted_at is null
       limit 1`,
      [postId]
    )
    if (postResult.rowCount === 0) return res.status(404).json({ error: 'Post not found' })
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
    if (existing.rowCount === 0) {
      const postAuthorId = postResult.rows[0].author_id
      const actor = await getUserIdentityById(req.userId)
      if (actor && postAuthorId !== req.userId) {
        const actorName = actor.display_name || actor.username || 'New like'
        const pushPayload = createPushPayload({
          title: 'Новый лайк',
          body: `${actorName} оценил ваш пост.`,
          url: `/?post=${encodeURIComponent(postId)}`,
          tag: `post-like-${postId}`,
          postId,
          skipWhenVisible: false
        })
        void sendPushToUsers([postAuthorId], pushPayload).catch((pushErr) => {
          console.error('Push send error', pushErr)
        })
      }
    }
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
      return res.status(400).json({ error: 'РќРµР»СЊР·СЏ СЂРµРїРѕСЃС‚РёС‚СЊ СЃРІРѕР№ СЂРµРїРѕСЃС‚' })
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
    if (existing.rowCount === 0) {
      const actor = await getUserIdentityById(req.userId)
      const postAuthorId = original.rows[0].author_id
      if (actor && postAuthorId !== req.userId) {
        const actorName = actor.display_name || actor.username || 'New repost'
        const pushPayload = createPushPayload({
          title: 'Ваш пост репостнули',
          body: `${actorName} добавил ваш пост к себе.`,
          url: `/?post=${encodeURIComponent(postId)}`,
          tag: `post-repost-${postId}`,
          postId,
          skipWhenVisible: false
        })
        void sendPushToUsers([postAuthorId], pushPayload).catch((pushErr) => {
          console.error('Push send error', pushErr)
        })
      }
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
              u.id as user_id, u.username, u.display_name, u.show_role, u.avatar_url
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
        showRole: row.show_role !== false,
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
    const postResult = await pool.query(
      `select p.author_id
       from posts p
       where p.id = $1
         and p.deleted_at is null
       limit 1`,
      [postId]
    )
    if (postResult.rowCount === 0) return res.status(404).json({ error: 'Post not found' })
    if (!body) return res.status(400).json({ error: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РїСѓСЃС‚' })
    const result = await pool.query(
      `insert into post_comments (post_id, user_id, body)
       values ($1, $2, $3)
       returning id, body, created_at`,
      [postId, req.userId, body]
    )
    const userRow = await pool.query(
      'select id, username, display_name, show_role, avatar_url from users where id = $1',
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
          showRole: userRow.rows[0].show_role !== false,
          avatarUrl: userRow.rows[0].avatar_url
        }
      }
    })
    const actor = userRow.rowCount > 0 ? userRow.rows[0] : await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'New comment') : 'New comment'
    const postAuthorId = postResult.rows[0].author_id
    if (postAuthorId && postAuthorId !== req.userId) {
      const pushPayload = createPushPayload({
        title: 'Новый комментарий',
        body: `${actorName} оставил комментарий к вашему посту.`,
        url: `/?post=${encodeURIComponent(postId)}&comments=1`,
        tag: `post-comment-${postId}`,
        postId,
        openComments: true,
        skipWhenVisible: false
      })
      void sendPushToUsers([postAuthorId], pushPayload).catch((pushErr) => {
        console.error('Push send error', pushErr)
      })
    }
    const mentionedUserIds = await getUserIdsByUsernames(
      extractMentionedUsernames(body),
      [req.userId, postAuthorId]
    )
    if (mentionedUserIds.length > 0) {
      const mentionPayload = createPushPayload({
        title: 'Упоминание в комментарии',
        body: `${actorName} упомянул вас в комментариях.`,
        url: `/?post=${encodeURIComponent(postId)}&comments=1`,
        tag: `comment-mention-${postId}`,
        postId,
        openComments: true,
        skipWhenVisible: false
      })
      void sendPushToUsers(mentionedUserIds, mentionPayload).catch((pushErr) => {
        console.error('Push send error', pushErr)
      })
    }
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

    const isAdmin = await hasAdminAccess(req.userId)
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

    const isAdmin = await hasAdminAccess(req.userId)
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

app.post('/api/messages/:id/bookmark', auth, ensureNotBanned, async (req, res) => {
  const messageId = req.params.id
  try {
    const messageResult = await pool.query(
      `select m.id,
              m.conversation_id,
              m.body,
              m.attachment_url,
              m.attachment_kind,
              m.created_at,
              m.deleted_at,
              m.sender_id,
              u.username as sender_username,
              u.display_name as sender_display_name
       from messages m
       left join users u on u.id = m.sender_id
       join conversation_members cm
         on cm.conversation_id = m.conversation_id
        and cm.user_id = $2
       where m.id = $1
       limit 1`,
      [messageId, req.userId]
    )
    if (messageResult.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const messageRow = messageResult.rows[0]
    if (messageRow.deleted_at) {
      return res.status(400).json({ error: 'Message is deleted' })
    }

    const inserted = await pool.query(
      `insert into message_bookmarks (user_id, message_id, conversation_id)
       values ($1, $2, $3)
       on conflict do nothing
       returning message_id, created_at`,
      [req.userId, messageId, messageRow.conversation_id]
    )

    const active = inserted.rowCount > 0
    let savedAt = null
    if (active) {
      savedAt = inserted.rows[0].created_at
    } else {
      const deleted = await pool.query(
        `delete from message_bookmarks
         where user_id = $1 and message_id = $2
         returning created_at`,
        [req.userId, messageId]
      )
      savedAt = deleted.rowCount > 0 ? deleted.rows[0].created_at : null
    }

    let pollQuestion = ''
    try {
      const pollResult = await pool.query(
        `select question from message_polls where message_id = $1 limit 1`,
        [messageId]
      )
      if (pollResult.rowCount > 0) {
        pollQuestion = normalizePollQuestion(pollResult.rows[0].question)
      }
    } catch (err) {
      if (!isMessagePollSchemaError(err)) throw err
    }

    const bookmark = {
      messageId,
      savedAt: savedAt || new Date().toISOString(),
      messageCreatedAt: messageRow.created_at,
      senderId: messageRow.sender_id || null,
      senderUsername: messageRow.sender_username || null,
      senderDisplayName: messageRow.sender_display_name || null,
      preview: pollQuestion
        ? `рџ“Љ ${pollQuestion}`
        : getMessagePreviewText(messageRow.body, messageRow.attachment_url, messageRow.attachment_kind)
    }

    res.json({
      ok: true,
      active,
      conversationId: messageRow.conversation_id,
      bookmark
    })
  } catch (err) {
    if (isMessageBookmarksSchemaError(err)) {
      return res.status(503).json({ error: 'Bookmarks feature is unavailable: database migration required' })
    }
    console.error('Message bookmark error', err)
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

app.post('/api/messages/:id/forward', messageLimiter, auth, ensureNotBanned, async (req, res) => {
  const sourceMessageId = req.params.id
  const targetConversationId = typeof req.body.targetConversationId === 'string'
    ? req.body.targetConversationId.trim()
    : ''
  const comment = String(req.body.comment || '').trim()

  if (!targetConversationId || !isValidUuid(targetConversationId)) {
    return res.status(400).json({ error: 'Target conversation id is invalid' })
  }
  if (comment && !isValidMessage(comment)) {
    return res.status(400).json({ error: 'Comment is invalid' })
  }

  const client = await pool.connect()
  try {
    const sourceResult = await client.query(
      `select m.id,
              m.conversation_id,
              m.body,
              m.attachment_url,
              m.attachment_mime,
              m.attachment_kind,
              m.deleted_at,
              m.sender_id as source_sender_id,
              u.username as source_sender_username,
              u.display_name as source_sender_display_name
       from messages m
       left join users u on u.id = m.sender_id
       join conversation_members cm
         on cm.conversation_id = m.conversation_id
        and cm.user_id = $2
       where m.id = $1
       limit 1`,
      [sourceMessageId, req.userId]
    )
    if (sourceResult.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    const source = sourceResult.rows[0]
    if (source.deleted_at) {
      return res.status(400).json({ error: 'Message is deleted' })
    }

    const targetConversationResult = await client.query(
      `select c.id, c.is_group, c.title
       from conversations c
       join conversation_members cm
         on cm.conversation_id = c.id
        and cm.user_id = $2
       where c.id = $1
       limit 1`,
      [targetConversationId, req.userId]
    )
    if (targetConversationResult.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const membersResult = await client.query(
      `select cm.user_id
       from conversation_members cm
       where cm.conversation_id = $1`,
      [targetConversationId]
    )

    const senderResult = await client.query(
      'select username, display_name, avatar_url from users where id = $1',
      [req.userId]
    )
    const sender = senderResult.rows[0] || {}

    let commentRow = null
    let forwardedRow = null
    let forwardedPoll = null
    await client.query('begin')
    try {
      if (comment) {
        const insertedComment = await client.query(
          `insert into messages (conversation_id, sender_id, body)
           values ($1, $2, $3)
           returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
          [targetConversationId, req.userId, comment]
        )
        commentRow = insertedComment.rows[0]
      }

      const insertedForwarded = await client.query(
        `insert into messages (conversation_id, sender_id, body, attachment_url, attachment_mime, attachment_kind)
         values ($1, $2, $3, $4, $5, $6)
         returning id, body, attachment_url, attachment_mime, attachment_kind, created_at`,
        [
          targetConversationId,
          req.userId,
          source.body || '',
          source.attachment_url || null,
          source.attachment_mime || null,
          source.attachment_kind || null
        ]
      )
      forwardedRow = insertedForwarded.rows[0]

      await client.query(
        `insert into message_forwards (
           message_id,
           source_message_id,
           source_sender_id,
           source_sender_username,
           source_sender_display_name,
           source_conversation_id
         )
         values ($1, $2, $3, $4, $5, $6)`,
        [
          forwardedRow.id,
          source.id,
          source.source_sender_id || null,
          source.source_sender_username || null,
          source.source_sender_display_name || null,
          source.conversation_id
        ]
      )

      try {
        const sourcePollResult = await client.query(
          `select question, options, allows_multiple
           from message_polls
           where message_id = $1
           limit 1`,
          [source.id]
        )
        if (sourcePollResult.rowCount > 0) {
          const sourcePoll = sourcePollResult.rows[0]
          await client.query(
            `insert into message_polls (message_id, question, options, allows_multiple, created_by)
             values ($1, $2, $3::jsonb, $4, $5)`,
            [
              forwardedRow.id,
              normalizePollQuestion(sourcePoll.question),
              JSON.stringify(normalizePollOptionsValue(sourcePoll.options)),
              sourcePoll.allows_multiple === true,
              req.userId
            ]
          )
          forwardedPoll = buildPollPayload({
            question: sourcePoll.question,
            allowsMultiple: sourcePoll.allows_multiple === true,
            options: sourcePoll.options
          })
        }
      } catch (pollErr) {
        if (!isMessagePollSchemaError(pollErr)) {
          throw pollErr
        }
      }

      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    }

    const forwardedFrom = {
      sourceMessageId: source.id,
      sourceSenderId: source.source_sender_id || null,
      sourceSenderUsername: source.source_sender_username || null,
      sourceSenderDisplayName: source.source_sender_display_name || null,
      sourceConversationId: source.conversation_id
    }

    const commentMessage = commentRow ? {
      id: commentRow.id,
      body: commentRow.body,
      attachmentUrl: commentRow.attachment_url,
      attachmentMime: commentRow.attachment_mime,
      attachmentKind: commentRow.attachment_kind,
      editedAt: null,
      createdAt: commentRow.created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo: null,
      reactions: [],
      forwardedFrom: null
    } : null

    const message = {
      id: forwardedRow.id,
      body: forwardedRow.body,
      attachmentUrl: forwardedRow.attachment_url,
      attachmentMime: forwardedRow.attachment_mime,
      attachmentKind: forwardedRow.attachment_kind,
      editedAt: null,
      createdAt: forwardedRow.created_at,
      senderId: req.userId,
      senderUsername: sender.username || null,
      senderDisplayName: sender.display_name || null,
      senderAvatarUrl: sender.avatar_url || null,
      readByOther: false,
      replyTo: null,
      reactions: [],
      forwardedFrom,
      ...(forwardedPoll ? { poll: forwardedPoll } : {})
    }

    membersResult.rows.forEach((member) => {
      if (commentMessage) {
        emitToUser(member.user_id, 'message', { conversationId: targetConversationId, message: commentMessage })
      }
      emitToUser(member.user_id, 'message', { conversationId: targetConversationId, message })
    })

    const recipients = membersResult.rows
      .map((member) => member.user_id)
      .filter((memberId) => memberId !== req.userId)

    if (recipients.length > 0) {
      const targetConversation = targetConversationResult.rows[0]
      const isGroup = targetConversation.is_group === true
      const senderName = sender.display_name || sender.username || 'New message'
      const pushTitle = isGroup
        ? (targetConversation.title || 'New message in group')
        : senderName
      const pushPayload = {
        title: pushTitle,
        body: getMessagePreviewText(message.body, message.attachmentUrl, message.attachmentKind),
        conversationId: targetConversationId,
        url: `/?conversation=${targetConversationId}`,
        tag: `conversation-${targetConversationId}`,
        senderId: req.userId,
        messageId: message.id,
        createdAt: message.createdAt,
        skipWhenVisible: true
      }
      void sendPushToUsers(recipients, pushPayload).catch((err) => {
        console.error('Push send error', err)
      })
    }

    res.json({ ok: true, message, commentMessage })
  } catch (err) {
    if (isMessageForwardSchemaError(err)) {
      return res.status(503).json({ error: 'Forward feature is unavailable: database migration required' })
    }
    console.error('Forward message error', err)
    res.status(500).json({ error: 'Unexpected error' })
  } finally {
    client.release()
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

    const isAdmin = await hasAdminAccess(req.userId)
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

    const isAdmin = await hasAdminAccess(req.userId)
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
    try {
      const result = await pool.query(
        `select u.id,
                u.username,
                u.display_name,
                u.role,
                coalesce(
                  (select array_agg(ur.role_value order by ur.role_value asc)
                   from user_roles ur
                   where ur.user_id = u.id),
                  array[u.role]
                ) as roles,
                u.is_banned,
                u.warnings_count,
                u.is_verified,
                u.is_admin,
                u.is_moderator,
                (u.role = $3 or exists(
                  select 1
                  from user_roles owner_roles
                  where owner_roles.user_id = u.id
                    and owner_roles.role_value = $3
                )) as is_owner
         from users u
         where ($1 = '' or u.username ilike $2)
         order by u.username
         limit 50`,
        [q, `${q}%`, ownerRoleValue]
      )
      return res.json({ users: result.rows })
    } catch (err) {
      if (!(err && (err.code === '42P01' || err.code === '42703'))) {
        throw err
      }
      const fallback = await pool.query(
        `select u.id,
                u.username,
                u.display_name,
                u.role,
                array[u.role] as roles,
                u.is_banned,
                u.warnings_count,
                false as is_verified,
                u.is_admin,
                u.is_moderator,
                (u.role = $3) as is_owner
         from users u
         where ($1 = '' or u.username ilike $2)
         order by u.username
         limit 50`,
        [q, `${q}%`, ownerRoleValue]
      )
      return res.json({ users: fallback.rows })
    }
  } catch (err) {
    console.error('Admin users error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/roles', auth, adminOnly, async (req, res) => {
  try {
    const value = normalizeRoleValue(req.body.value)
    const label = normalizeRoleLabel(req.body.label)

    if (!isValidRoleValue(value)) {
      return res.status(400).json({ error: 'Role value must be "*" or 3-32 chars: a-z, 0-9, _ and start with a letter' })
    }
    if (!isValidRoleLabel(label)) {
      return res.status(400).json({ error: 'Role label must be 2-48 characters' })
    }
    if (!allowedRoleValues.has(value)) {
      return res.status(400).json({ error: 'Role is outside the allowed catalog' })
    }

    const result = await pool.query(
      `insert into roles (value, label)
       values ($1, $2)
       returning value, label`,
      [value, label]
    )

    res.json({ ok: true, role: result.rows[0] })
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Role already exists' })
    }
    if (err && err.code === '42P01') {
      return res.status(503).json({ error: 'Roles table missing: schema migration required' })
    }
    console.error('Admin create role error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/set-role', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    const requestedRoles = normalizeRoleValues(
      Array.isArray(req.body.roles) && req.body.roles.length > 0
        ? req.body.roles
        : req.body.role
    )
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    if (requestedRoles.length === 0) {
      return res.status(400).json({ error: 'At least one role is required' })
    }
    const allowedRoles = await getAllowedRoleValues(requestedRoles)
    if (allowedRoles.length !== requestedRoles.length) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const actorAccess = await getUserAccessFlags(req.userId)
    const targetAccess = await getUserAccessFlags(userId)
    if (!targetAccess.exists) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (targetAccess.isOwner && !actorAccess.isOwner) {
      return res.status(403).json({ error: 'Only owner can manage owner account' })
    }
    if (allowedRoles.includes(ownerRoleValue) && !actorAccess.isOwner) {
      return res.status(403).json({ error: 'Only owner can assign owner role' })
    }

    const existing = await pool.query(
      `select id, username
       from users
       where id = $1
       limit 1`,
      [userId]
    )

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const savedRoles = await saveUserRoles(userId, allowedRoles)
    res.json({
      ok: true,
      user: {
        id: existing.rows[0].id,
        username: existing.rows[0].username,
        role: savedRoles[0],
        roles: savedRoles
      }
    })
  } catch (err) {
    console.error('Admin set role error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/set-admin', auth, ownerOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    const makeAdmin = req.body.makeAdmin === true
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }

    const userResult = await pool.query(
      `select id, username
       from users
       where id = $1
       limit 1`,
      [userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const targetIsOwner = await isOwnerAccount(userId)
    if (targetIsOwner && !makeAdmin) {
      return res.status(400).json({ error: 'Owner access cannot be revoked' })
    }

    const updated = await pool.query(
      `update users
       set is_admin = $2
       where id = $1
       returning id, username, is_admin`,
      [userId, makeAdmin]
    )

    res.json({
      ok: true,
      user: {
        id: updated.rows[0].id,
        username: updated.rows[0].username,
        isAdmin: updated.rows[0].is_admin === true
      }
    })
  } catch (err) {
    console.error('Admin set admin error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/verify', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.body.userId
    const verified = req.body.verified === true
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }

    const result = await pool.query(
      `update users
       set is_verified = $2
       where id = $1
       returning id, username, is_verified`,
      [userId, verified]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (verified) {
      try {
        await pool.query(
          `update verification_requests vr
           set status = 'approved',
               admin_note = coalesce(vr.admin_note, ''),
               reviewed_by = $2,
               reviewed_at = now(),
               updated_at = now()
           where vr.id = (
             select id
             from verification_requests
             where user_id = $1
               and status = 'pending'
             order by created_at desc
             limit 1
           )`,
          [userId, req.userId]
        )
      } catch (verificationErr) {
        if (!isVerificationSchemaError(verificationErr)) {
          throw verificationErr
        }
      }
    }

    res.json({
      ok: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isVerified: result.rows[0].is_verified === true
      }
    })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    const verificationPayload = verified
      ? {
        title: 'Профиль подтверждён',
        body: `${actorName} подтвердил ваш профиль.`,
        tag: `account-verified-${userId}`
      }
      : {
        title: 'Подтверждение профиля снято',
        body: `${actorName} отменил верификацию вашего профиля.`,
        tag: `account-unverified-${userId}`
      }
    void notifyUserAboutAdminAction(userId, verificationPayload).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    if (err && err.code === '42703') {
      return res.status(503).json({ error: 'Verification column missing: schema migration required' })
    }
    console.error('Admin verify error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/admin/verification-requests', auth, adminOnly, async (req, res) => {
  try {
    const rawStatus = String(req.query.status || 'pending').trim().toLowerCase()
    const statusFilter = rawStatus === 'all' ? 'all' : normalizeVerificationRequestStatus(rawStatus)
    const query = String(req.query.q || '').trim()
    const queryLike = `%${query}%`

    let result
    try {
      result = await pool.query(
        `select vr.id,
                vr.user_id,
                vr.full_name,
                vr.reason,
                vr.evidence,
                vr.status,
                vr.admin_note,
                vr.reviewed_by,
                reviewer.username as reviewed_by_username,
                vr.reviewed_at,
                vr.created_at,
                vr.updated_at,
                u.username,
                u.display_name,
                u.avatar_url,
                u.role,
                coalesce(
                  (select array_agg(ur.role_value order by ur.role_value asc)
                   from user_roles ur
                   where ur.user_id = u.id),
                  array[u.role]
                ) as roles,
                u.is_verified
         from verification_requests vr
         join users u on u.id = vr.user_id
         left join users reviewer on reviewer.id = vr.reviewed_by
         where ($1 = 'all' or vr.status = $1)
           and ($2 = '' or u.username ilike $3 or coalesce(u.display_name, '') ilike $3)
         order by
           case when vr.status = 'pending' then 0 else 1 end,
           vr.created_at desc
         limit 200`,
        [statusFilter, query, queryLike]
      )
    } catch (err) {
      if (!(err && err.code === '42P01' && String(err.message || '').toLowerCase().includes('user_roles'))) {
        throw err
      }
      result = await pool.query(
        `select vr.id,
                vr.user_id,
                vr.full_name,
                vr.reason,
                vr.evidence,
                vr.status,
                vr.admin_note,
                vr.reviewed_by,
                reviewer.username as reviewed_by_username,
                vr.reviewed_at,
                vr.created_at,
                vr.updated_at,
                u.username,
                u.display_name,
                u.avatar_url,
                u.role,
                array[u.role] as roles,
                u.is_verified
         from verification_requests vr
         join users u on u.id = vr.user_id
         left join users reviewer on reviewer.id = vr.reviewed_by
         where ($1 = 'all' or vr.status = $1)
           and ($2 = '' or u.username ilike $3 or coalesce(u.display_name, '') ilike $3)
         order by
           case when vr.status = 'pending' then 0 else 1 end,
           vr.created_at desc
         limit 200`,
        [statusFilter, query, queryLike]
      )
    }

    const requests = result.rows.map((row) => ({
      ...mapVerificationRequest(row),
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name || '',
        avatarUrl: row.avatar_url || '',
        role: row.role || '',
        roles: normalizeUserRolesFromRow(row),
        isVerified: row.is_verified === true
      }
    }))

    res.json({ requests })
  } catch (err) {
    if (isVerificationSchemaError(err)) {
      return res.status(503).json({ error: 'Verification requests feature is unavailable: database migration required' })
    }
    console.error('Admin verification requests error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/verification-requests/:id/review', auth, adminOnly, async (req, res) => {
  const requestId = req.params.id
  const decision = normalizeVerificationRequestStatus(req.body.decision, '')
  const adminNote = normalizeVerificationRequestAdminNote(req.body.adminNote)

  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ error: 'Decision must be approved or rejected' })
  }

  const client = await pool.connect()
  try {
    await client.query('begin')
    const current = await client.query(
      `select id,
              user_id,
              status
       from verification_requests
       where id = $1
       limit 1
       for update`,
      [requestId]
    )
    if (current.rowCount === 0) {
      await client.query('rollback')
      return res.status(404).json({ error: 'Verification request not found' })
    }

    const currentStatus = normalizeVerificationRequestStatus(current.rows[0].status, '')
    if (currentStatus !== 'pending') {
      await client.query('rollback')
      return res.status(409).json({ error: 'Verification request is already reviewed' })
    }

    const updated = await client.query(
      `update verification_requests
       set status = $2,
           admin_note = $3,
           reviewed_by = $4,
           reviewed_at = now(),
           updated_at = now()
       where id = $1
       returning id,
                 user_id,
                 full_name,
                 reason,
                 evidence,
                 status,
                 admin_note,
                 reviewed_by,
                 reviewed_at,
                 created_at,
                 updated_at`,
      [requestId, decision, adminNote || null, req.userId]
    )

    if (decision === 'approved') {
      await client.query(
        `update users
         set is_verified = true
         where id = $1`,
        [current.rows[0].user_id]
      )
    }

    await client.query('commit')

    const reviewer = await pool.query(
      `select username
       from users
       where id = $1
       limit 1`,
      [req.userId]
    )
    const request = {
      ...mapVerificationRequest(updated.rows[0]),
      reviewedByUsername: reviewer.rowCount > 0 ? reviewer.rows[0].username : ''
    }

    const userResult = await pool.query(
      `select id, username, is_verified
       from users
       where id = $1
       limit 1`,
      [current.rows[0].user_id]
    )

    res.json({
      ok: true,
      request,
      user: userResult.rowCount > 0
        ? {
          id: userResult.rows[0].id,
          username: userResult.rows[0].username,
          isVerified: userResult.rows[0].is_verified === true
        }
        : null
    })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    const reviewPayload = decision === 'approved'
      ? {
        title: 'Верификация одобрена',
        body: `${actorName} одобрил вашу заявку на верификацию.`,
        tag: `verification-approved-${current.rows[0].user_id}`
      }
      : {
        title: 'Верификация отклонена',
        body: adminNote
          ? `${actorName} отклонил заявку: ${adminNote}`
          : `${actorName} отклонил вашу заявку на верификацию.`,
        tag: `verification-rejected-${current.rows[0].user_id}`
      }
    void notifyUserAboutAdminAction(current.rows[0].user_id, reviewPayload).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    try {
      await client.query('rollback')
    } catch (_rollbackErr) {
      // ignore rollback errors
    }
    if (isVerificationSchemaError(err)) {
      return res.status(503).json({ error: 'Verification requests feature is unavailable: database migration required' })
    }
    console.error('Admin review verification request error', err)
    res.status(500).json({ error: 'Unexpected error' })
  } finally {
    client.release()
  }
})

app.post('/api/admin/ban', auth, adminOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }
    const userResult = await pool.query(
      'update users set is_banned = true where id = $1 returning id, username',
      [userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ ok: true })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    void notifyUserAboutAdminAction(userId, {
      title: 'Аккаунт временно заблокирован',
      body: `${actorName} ограничил доступ к вашему аккаунту.`,
      tag: `account-banned-${userId}`
    }).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    console.error('Ban error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/unban', auth, adminOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }
    const userResult = await pool.query(
      'update users set is_banned = false where id = $1 returning id, username',
      [userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ ok: true })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    void notifyUserAboutAdminAction(userId, {
      title: 'Доступ восстановлен',
      body: `${actorName} снял блокировку с вашего аккаунта.`,
      tag: `account-unbanned-${userId}`
    }).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    console.error('Unban error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/warn', auth, adminOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    const reason = String(req.body.reason || '').trim()
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }
    await pool.query(
      'insert into warnings (user_id, admin_id, reason) values ($1, $2, $3)',
      [userId, req.userId, reason]
    )
    await pool.query('update users set warnings_count = warnings_count + 1 where id = $1', [userId])
    res.json({ ok: true })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    void notifyUserAboutAdminAction(userId, {
      title: 'Предупреждение от администрации',
      body: reason
        ? `${actorName} оставил предупреждение: ${reason}`
        : `${actorName} оставил предупреждение для вашего аккаунта.`,
      tag: `account-warning-${userId}-${Date.now()}`
    }).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    console.error('Warn error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/clear-warnings', auth, adminOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }
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
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    const makeModerator = Boolean(req.body.makeModerator)
    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }
    await pool.query('update users set is_moderator = $2 where id = $1', [userId, makeModerator])
    res.json({ ok: true })
  } catch (err) {
    console.error('Moderator role error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.post('/api/admin/reset-password', auth, adminOnly, async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : ''
    const revokeSessions = req.body.revokeSessions !== false

    if (!isValidUuid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' })
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    const guard = await ensureActorCanManageTarget(req.userId, userId)
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error })
    }

    const userResult = await pool.query(
      'select id, username from users where id = $1 limit 1',
      [userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query('update users set password_hash = $2 where id = $1', [userId, passwordHash])

    let revokedCount = 0
    if (revokeSessions) {
      try {
        const revokeResult = await pool.query(
          `update user_sessions
           set revoked_at = now(),
               revoke_reason = 'admin_password_reset'
           where user_id = $1
             and revoked_at is null`,
          [userId]
        )
        revokedCount = Number(revokeResult.rowCount || 0)
      } catch (sessionErr) {
        if (!isSecuritySchemaError(sessionErr)) {
          throw sessionErr
        }
      }
    }

    res.json({
      ok: true,
      userId,
      username: userResult.rows[0].username,
      revokedCount
    })

    const actor = await getUserIdentityById(req.userId)
    const actorName = actor ? (actor.display_name || actor.username || 'Administrator') : 'Administrator'
    const revokeSuffix = revokeSessions && revokedCount > 0
      ? ` Активные сессии завершены: ${revokedCount}.`
      : ''
    void notifyUserAboutAdminAction(userId, {
      title: 'Пароль изменён администратором',
      body: `${actorName} обновил пароль вашего аккаунта.${revokeSuffix}`.trim(),
      tag: `password-reset-${userId}`
    }).catch((pushErr) => {
      console.error('Push send error', pushErr)
    })
  } catch (err) {
    console.error('Admin reset password error', err)
    res.status(500).json({ error: 'Unexpected error' })
  }
})

app.get('/api/presence', auth, async (req, res) => {
  res.json({ online: Array.from(onlineUsers.keys()) })
})

app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Only images')) {
    return res.status(400).json({ error: 'Р Р°Р·СЂРµС€РµРЅС‹ С‚РѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ (jpg, png, webp, gif)' })
  }
  if (err && err.message && err.message.includes('Only GIF files')) {
    return res.status(400).json({ error: 'Only GIF files are allowed' })
  }
  if (err && err.message && err.message.includes('Only image or video attachments')) {
    return res.status(400).json({ error: 'Р Р°Р·СЂРµС€РµРЅС‹ С‚РѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ Рё РІРёРґРµРѕ С„Р°Р№Р»С‹.' })
  }
  if (err && err.message && err.message.includes('Only audio files')) {
    return res.status(400).json({ error: 'Р Р°Р·СЂРµС€РµРЅС‹ С‚РѕР»СЊРєРѕ Р°СѓРґРёРѕ С„Р°Р№Р»С‹ (mp3, wav, ogg, webm, m4a, aac)' })
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
    await repairLegacyPersonalFavoritesConversations()
    console.log('Web push configuration', {
      enabled: webPushEnabled,
      hasPublicKey: Boolean(webPushPublicKey),
      hasPrivateKey: Boolean(webPushPrivateKey),
      hasCustomSubject: Boolean(webPushSubject && webPushSubject !== 'mailto:admin@example.com')
    })
    server.listen(port, () => {
      console.log('Server listening on http://localhost:' + port)
    })
  } catch (err) {
    console.error('Startup failed:', err)
    process.exit(1)
  }
}

startServer()

