import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { io } from 'socket.io-client'
import {
  createConversation,
  createGroupConversation,
  getConversations,
  getHealth,
  getMe,
  getMessages,
  markConversationRead,
  setConversationFavorite,
  getProfile,
  getProfilePosts,
  getProfileTracks,
  getPosts,
  getPresence,
  getPushPublicKey,
  getRoles,
  getTokenValue,
  getComments,
  login,
  likePost,
  createPost,
  register,
  repostPost,
  searchUsers,
  sendMessage,
  setToken,
  uploadAvatar,
  uploadBanner,
  uploadProfileTrack,
  updateMe,
  addComment,
  editMessage,
  deleteMessage,
  toggleMessageReaction,
  editPost,
  deletePost,
  adminListUsers,
  adminBanUser,
  adminUnbanUser,
  adminWarnUser,
  adminSetModerator,
  adminClearWarnings,
  toggleSubscription,
  deleteProfileTrack,
  savePushSubscription,
  deletePushSubscription,
  getMyStickers,
  uploadSticker,
  deleteSticker,
  sendSticker,
  getMyGifs,
  uploadGif,
  deleteGif,
  sendGif,
  createPoll,
  votePoll
} from './api.js'

const icons = {
  feed: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14a2 2 0 0 1 2 2v2H3V6a2 2 0 0 1 2-2Zm-2 8h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Zm4 2h6v2H7v-2Z" />
    </svg>
  ),
  chats: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 6a3 3 0 1 1-3 3 3 3 0 0 1 3-3Zm0 11.2a7.7 7.7 0 0 1-4.5-4 4.9 4.9 0 0 1 9 0 7.7 7.7 0 0 1-4.5 4Z" />
    </svg>
  )
}

const fallbackRoles = [
  { value: 'programmist', label: 'Программист' },
  { value: 'tehnik', label: 'Техник' },
  { value: 'polimer', label: 'Полимер' },
  { value: 'pirotehnik', label: 'Пиротехник' },
  { value: 'tehmash', label: 'Техмаш' },
  { value: 'holodilchik', label: 'Холодильчик' }
]

const initialRegister = {
  login: '',
  username: '',
  password: '',
  role: 'programmist'
}

const initialLogin = {
  login: '',
  password: ''
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function extractHashtags(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) || []
  return matches
    .map((tag) => tag.toLowerCase())
    .filter(Boolean)
}

function getProfileMoodLabel(profile) {
  if (!profile || typeof profile !== 'object') return ''
  const emoji = String(profile.statusEmoji || '').trim()
  const text = String(profile.statusText || '').trim()
  if (emoji && text) return `${emoji} ${text}`
  if (emoji) return emoji
  if (text) return text
  return ''
}

function normalizeChatAlias(value) {
  return String(value || '').trim().slice(0, 36)
}

function getConversationDisplayName(conversation, aliasByConversation = {}) {
  if (!conversation || typeof conversation !== 'object') return 'Пользователь'
  if (conversation.isGroup) return conversation.title || 'Групповой чат'
  const alias = normalizeChatAlias(aliasByConversation[conversation.id])
  if (alias) return alias
  return conversation.other?.displayName || conversation.other?.username || 'Пользователь'
}

const rawApiBase = import.meta.env.VITE_API_BASE || ''
const apiBase = rawApiBase.replace(/\/$/, '')
const apiOrigin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : ''
const mediaBase = (import.meta.env.VITE_MEDIA_BASE || import.meta.env.VITE_SOCKET_URL || apiOrigin || '').replace(/\/$/, '')
const webPushFeatureEnabled = String(import.meta.env.VITE_ENABLE_WEB_PUSH || '').toLowerCase() === 'true'
const AVATAR_ZOOM_MIN = 1
const AVATAR_ZOOM_MAX = 2.5
const PUSH_OPEN_STORAGE_KEY = 'ktk_push_open_conversation'
const DRAFT_STORAGE_KEY = 'ktk_message_drafts'
const FEED_BOOKMARKS_STORAGE_KEY = 'ktk_feed_bookmarks'
const CHAT_WALLPAPER_STORAGE_KEY = 'ktk_chat_wallpapers'
const CHAT_ALIAS_STORAGE_KEY = 'ktk_chat_aliases'
const RECENT_STICKERS_STORAGE_KEY = 'ktk_recent_stickers'
const RECENT_GIFS_STORAGE_KEY = 'ktk_recent_gifs'
const RECENT_EMOJIS_STORAGE_KEY = 'ktk_recent_emojis'
const MEDIA_PANEL_TABS = {
  emoji: 'emoji',
  stickers: 'stickers',
  gifs: 'gifs'
}
const EMOJI_PICKER_ITEMS = [
  { value: '😀', tags: 'улыбка smile happy радость', group: 'smileys' },
  { value: '😁', tags: 'улыбка teeth радость', group: 'smileys' },
  { value: '😂', tags: 'смех tears laugh', group: 'smileys' },
  { value: '🤣', tags: 'смех laugh rolling', group: 'smileys' },
  { value: '😊', tags: 'милый nice smile', group: 'smileys' },
  { value: '😍', tags: 'любовь глаза heart eyes', group: 'smileys' },
  { value: '🥰', tags: 'любовь hearts face', group: 'smileys' },
  { value: '😘', tags: 'поцелуй kiss', group: 'smileys' },
  { value: '😎', tags: 'круто cool', group: 'smileys' },
  { value: '🤩', tags: 'звезды wow star eyes', group: 'smileys' },
  { value: '🤔', tags: 'думать think hmm', group: 'smileys' },
  { value: '😴', tags: 'сон sleep', group: 'smileys' },
  { value: '🤯', tags: 'mind blown шок', group: 'smileys' },
  { value: '😱', tags: 'крик scream shock', group: 'smileys' },
  { value: '🥶', tags: 'холод cold', group: 'smileys' },
  { value: '🥵', tags: 'жара hot', group: 'smileys' },
  { value: '🙌', tags: 'ура raise hands', group: 'gestures' },
  { value: '👏', tags: 'аплодисменты clap', group: 'gestures' },
  { value: '👍', tags: 'лайк ok good', group: 'gestures' },
  { value: '👎', tags: 'дизлайк bad', group: 'gestures' },
  { value: '🤝', tags: 'сделка handshake', group: 'gestures' },
  { value: '🙏', tags: 'спасибо please pray', group: 'gestures' },
  { value: '💪', tags: 'сила strong', group: 'gestures' },
  { value: '🫶', tags: 'heart hands любовь', group: 'gestures' },
  { value: '👀', tags: 'глаза look', group: 'gestures' },
  { value: '❤️', tags: 'heart любовь', group: 'hearts' },
  { value: '💔', tags: 'broken heart', group: 'hearts' },
  { value: '💖', tags: 'sparkle heart', group: 'hearts' },
  { value: '💙', tags: 'blue heart', group: 'hearts' },
  { value: '💚', tags: 'green heart', group: 'hearts' },
  { value: '🖤', tags: 'black heart', group: 'hearts' },
  { value: '💜', tags: 'purple heart', group: 'hearts' },
  { value: '🤍', tags: 'white heart', group: 'hearts' },
  { value: '🔥', tags: 'fire hot lit', group: 'symbols' },
  { value: '✨', tags: 'sparkles magic', group: 'symbols' },
  { value: '⚡', tags: 'lightning fast', group: 'symbols' },
  { value: '💥', tags: 'boom blast', group: 'symbols' },
  { value: '🎉', tags: 'праздник party', group: 'activity' },
  { value: '🎊', tags: 'confetti праздник', group: 'activity' },
  { value: '🎯', tags: 'target цель', group: 'activity' },
  { value: '🏆', tags: 'кубок trophy win', group: 'activity' },
  { value: '💯', tags: 'hundred top', group: 'symbols' },
  { value: '🎮', tags: 'game гейминг', group: 'activity' },
  { value: '🎧', tags: 'music наушники', group: 'activity' },
  { value: '📚', tags: 'books учеба study', group: 'activity' },
  { value: '✏️', tags: 'pen писать note', group: 'activity' },
  { value: '💡', tags: 'idea лампа', group: 'symbols' },
  { value: '🚀', tags: 'rocket launch', group: 'symbols' },
  { value: '🌙', tags: 'moon night', group: 'symbols' },
  { value: '☀️', tags: 'sun day', group: 'symbols' },
  { value: '🌈', tags: 'rainbow', group: 'symbols' },
  { value: '🌧️', tags: 'rain дождь', group: 'symbols' },
  { value: '⭐', tags: 'star звезда', group: 'symbols' },
  { value: '🧠', tags: 'brain умно', group: 'symbols' },
  { value: '🐱', tags: 'cat кот', group: 'animals' },
  { value: '🐶', tags: 'dog собака', group: 'animals' },
  { value: '🦊', tags: 'fox лиса', group: 'animals' },
  { value: '🐼', tags: 'panda', group: 'animals' },
  { value: '🐸', tags: 'frog лягушка', group: 'animals' },
  { value: '🐵', tags: 'monkey', group: 'animals' },
  { value: '🐺', tags: 'wolf волк', group: 'animals' },
  { value: '🐯', tags: 'tiger тигр', group: 'animals' },
  { value: '🐨', tags: 'koala', group: 'animals' },
  { value: '🦄', tags: 'unicorn единорог', group: 'animals' },
  { value: '🍓', tags: 'strawberry клубника', group: 'food' },
  { value: '🍉', tags: 'watermelon арбуз', group: 'food' },
  { value: '🍕', tags: 'pizza пицца', group: 'food' },
  { value: '🍔', tags: 'burger', group: 'food' },
  { value: '🌮', tags: 'taco', group: 'food' },
  { value: '🌭', tags: 'hotdog', group: 'food' },
  { value: '🍩', tags: 'donut пончик', group: 'food' },
  { value: '☕', tags: 'coffee кофе', group: 'food' }
]
const EMOJI_GROUP_LABELS = {
  smileys: 'Смайлы',
  gestures: 'Жесты',
  hearts: 'Сердца',
  symbols: 'Символы',
  activity: 'Активности',
  animals: 'Животные',
  food: 'Еда'
}
const NUDGE_MARKER = '[[NUDGE]]'
const EIGHT_BALL_RESPONSES = [
  'Да, 100%',
  'Скорее да',
  'Есть шанс',
  'Лучше подожди',
  'Спроси позже',
  'Сомнительно',
  'Скорее нет',
  'Нет'
]
const FUN_COMMANDS = [
  { command: '/shrug', template: '/shrug', description: '¯\\_(ツ)_/¯' },
  { command: '/flip', template: '/flip', description: 'Перевернуть стол' },
  { command: '/unflip', template: '/unflip', description: 'Поставить стол обратно' },
  { command: '/dice', template: '/dice', description: 'Случайное число 1-6' },
  { command: '/8ball', template: '/8ball ', description: 'Предсказание шара' },
  { command: '/spoiler', template: '/spoiler ', description: 'Скрытый текст' },
  { command: '/nudge', template: '/nudge', description: 'Пнуть собеседника' }
]
const POLL_OPTION_MIN_COUNT = 2
const POLL_OPTION_MAX_COUNT = 10
const INITIAL_POLL_DRAFT = {
  question: '',
  options: ['', ''],
  allowsMultiple: false
}
const CHAT_LIST_FILTERS = {
  all: 'all',
  unread: 'unread',
  favorites: 'favorites'
}
const FEED_FILTERS = {
  all: 'all',
  popular: 'popular',
  mine: 'mine',
  bookmarks: 'bookmarks'
}
const CHAT_WALLPAPERS = [
  { value: 'default', label: 'Классика' },
  { value: 'aurora', label: 'Аврора' },
  { value: 'sunset', label: 'Закат' },
  { value: 'midnight', label: 'Ночь' },
  { value: 'grid', label: 'Сетка' }
]
const STATUS_EMOJI_PRESETS = ['🔥', '😎', '✨', '🌙', '🎯', '🚀', '💡', '🎧', '🤝', '🎮']
const VIDEO_NOTE_KIND = 'video-note'
const VIDEO_NOTE_MAX_SECONDS = 60
const MENU_VIEWPORT_PADDING = 12
const MENU_ANCHOR_GAP = 8
const INITIAL_MESSAGE_MENU_STATE = {
  open: false,
  x: 0,
  y: 0,
  anchorX: null,
  anchorY: null,
  message: null,
  showAllReactions: false
}
const INITIAL_POST_MENU_STATE = {
  open: false,
  x: 0,
  y: 0,
  anchorX: null,
  anchorY: null,
  post: null
}
const INITIAL_CHAT_MENU_STATE = {
  open: false,
  x: 0,
  y: 0,
  anchorX: null,
  anchorY: null
}
const QUICK_MESSAGE_REACTIONS = ['❤️', '👍', '😭', '👎', '🤩', '🐳', '❤️‍🔥']
const ALL_MESSAGE_REACTIONS = Array.from(new Set([
  ...QUICK_MESSAGE_REACTIONS,
  '👌', '🔥', '🥰', '👏', '😃', '🤔', '🤯', '😱', '🎉', '🤬',
  '😢', '🙏', '🤝', '🫡', '💯', '🤣', '😇', '🥳', '😴', '😋',
  '😡', '💔', '💩', '😀', '👀', '🎃', '🙀', '🙉', '🙊', '🫶',
  '🤗', '🤤', '🤮', '🍾', '🍓', '🌭', '⚡', '🏆', '💋', '🤡',
  '💘', '🎯', '🫠', '😐', '😶', '🙃', '🫢', '🤌', '✌️', '👋'
]))
const MESSAGE_REACTION_SORT = (a, b) => {
  if (b.count !== a.count) return b.count - a.count
  return a.emoji.localeCompare(b.emoji)
}
const DEFAULT_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:global.stun.twilio.com:3478' }
]

function normalizeIceServer(value) {
  if (!value || typeof value !== 'object') return null
  if (!value.urls || (typeof value.urls !== 'string' && !Array.isArray(value.urls))) return null
  const normalized = { urls: value.urls }
  if (typeof value.username === 'string') normalized.username = value.username
  if (typeof value.credential === 'string') normalized.credential = value.credential
  return normalized
}

function parseIceServers(value) {
  const raw = String(value || '').trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list.map(normalizeIceServer).filter(Boolean)
  } catch (err) {
    return []
  }
}

const configuredIceServers = parseIceServers(import.meta.env.VITE_ICE_SERVERS)
const rtcIceServers = configuredIceServers.length > 0 ? configuredIceServers : DEFAULT_ICE_SERVERS

function urlBase64ToUint8Array(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
  const rawData = window.atob(padded)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getPushErrorFeedback(err) {
  const rawMessage = err && typeof err.message === 'string' ? err.message.trim() : ''
  const lower = rawMessage.toLowerCase()
  const hasCertificateError = (
    lower.includes('ssl') ||
    lower.includes('certificate') ||
    lower.includes('net::err_cert') ||
    lower.includes('cert_authority_invalid') ||
    lower.includes('securityerror')
  )
  if (hasCertificateError) {
    return {
      supported: false,
      message: 'System notifications are unavailable: invalid HTTPS certificate on this domain.'
    }
  }
  if (lower.includes('failed to register a serviceworker') || lower.includes('serviceworker')) {
    return {
      supported: false,
      message: 'System notifications are unavailable: failed to register service worker.'
    }
  }
  return {
    supported: true,
    message: rawMessage || 'Failed to configure notifications.'
  }
}

function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (url.startsWith('/')) {
    return mediaBase ? `${mediaBase}${url}` : url
  }
  return url
}

function clampAvatarZoom(value) {
  return Math.min(AVATAR_ZOOM_MAX, Math.max(AVATAR_ZOOM_MIN, value))
}

function getSupportedVideoNoteMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ]
  const supported = candidates.find((mimeType) => {
    try {
      return window.MediaRecorder.isTypeSupported(mimeType)
    } catch (err) {
      return false
    }
  })
  return supported || ''
}

function normalizeVideoNoteMimeType(mimeType) {
  const raw = String(mimeType || '').trim().toLowerCase()
  const normalized = raw.split(';')[0]
  if (!normalized) return 'video/webm'
  if (normalized.startsWith('video/')) return normalized
  if (normalized === 'application/mp4') return 'video/mp4'
  if (normalized === 'application/octet-stream' || normalized === 'binary/octet-stream') {
    return 'video/webm'
  }
  return 'video/webm'
}

function getVideoExtensionFromMime(mimeType) {
  const normalized = normalizeVideoNoteMimeType(mimeType)
  if (normalized.includes('mp4')) return 'mp4'
  if (normalized.includes('quicktime')) return 'mov'
  if (normalized.includes('matroska')) return 'mkv'
  if (normalized.includes('3gpp2')) return '3g2'
  if (normalized.includes('3gpp')) return '3gp'
  if (normalized.includes('m4v')) return 'm4v'
  if (normalized.includes('ogg')) return 'ogv'
  return 'webm'
}

function hasVideoFileExtension(name) {
  return /\.(mp4|webm|ogv|ogg|mov|m4v|mkv|3gp|3g2)$/i.test(String(name || ''))
}

function isVideoFileLike(file) {
  if (!file) return false
  const mime = String(file.type || '').trim().toLowerCase()
  if (mime.startsWith('video/')) return true
  if (mime === 'application/mp4') return true
  return hasVideoFileExtension(file.name || '')
}

function isVideoMessageAttachment(message) {
  if (!message || !message.attachmentUrl) return false
  if (message.attachmentKind === 'video' || message.attachmentKind === VIDEO_NOTE_KIND) return true
  const mime = String(message.attachmentMime || '').toLowerCase()
  if (mime.startsWith('video/')) return true
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(message.attachmentUrl)
}

function extractSpoilerText(value) {
  const raw = String(value || '').trim()
  if (!raw.startsWith('||') || !raw.endsWith('||') || raw.length <= 4) return ''
  const content = raw.slice(2, -2).trim()
  return content || ''
}

function isNudgeMessage(value) {
  return String(value || '').trim() === NUDGE_MARKER
}

function normalizePollData(poll) {
  if (!poll || typeof poll !== 'object') return null
  const question = String(poll.question || '').trim()
  const options = (Array.isArray(poll.options) ? poll.options : [])
    .map((item, index) => {
      const rawId = Number(item && item.id)
      const id = Number.isInteger(rawId) && rawId >= 0 ? rawId : index
      const text = String((item && item.text) || '').trim() || `Вариант ${id + 1}`
      const votes = Math.max(0, Number(item && item.votes) || 0)
      const selected = item && item.selected === true
      return { id, text, votes, selected }
    })
    .sort((a, b) => a.id - b.id)
  const fallbackTotalVotes = options.reduce((sum, option) => sum + option.votes, 0)
  const totalVotes = Math.max(0, Number(poll.totalVotes) || fallbackTotalVotes)
  const participantsCount = Math.max(0, Number(poll.participantsCount) || 0)
  return {
    question,
    allowsMultiple: poll.allowsMultiple === true,
    options,
    totalVotes,
    participantsCount
  }
}

function getMessagePreviewLabel(message, emptyText = 'Сообщение') {
  if (message && message.poll) {
    const pollQuestion = String(message.poll.question || '').trim()
    const preview = pollQuestion ? `📊 ${pollQuestion}` : '📊 Опрос'
    return preview.length > 120 ? `${preview.slice(0, 117)}...` : preview
  }
  if (message && typeof message.body === 'string' && message.body.trim()) {
    const text = message.body.trim()
    if (isNudgeMessage(text)) return 'Пинок'
    if (extractSpoilerText(text)) return 'Скрытый текст'
    return text.length > 120 ? `${text.slice(0, 117)}...` : text
  }
  if (message && message.attachmentUrl) {
    if (message.attachmentKind === 'gif') return 'GIF'
    if (message.attachmentKind === 'sticker') return 'Стикер'
    if (message.attachmentKind === VIDEO_NOTE_KIND) return 'Видеосообщение'
    if (isVideoMessageAttachment(message)) return 'Видео'
    return 'Фото'
  }
  return emptyText
}

function normalizeMessageReactions(reactions) {
  if (!Array.isArray(reactions)) return []
  const map = new Map()
  reactions.forEach((item) => {
    const emoji = typeof item.emoji === 'string' ? item.emoji : ''
    const count = Number(item.count || 0)
    if (!emoji || !Number.isFinite(count) || count <= 0) return
    const existing = map.get(emoji)
    if (!existing) {
      map.set(emoji, { emoji, count, reacted: item.reacted === true })
      return
    }
    map.set(emoji, {
      emoji,
      count: existing.count + count,
      reacted: existing.reacted || item.reacted === true
    })
  })
  return Array.from(map.values()).sort(MESSAGE_REACTION_SORT)
}

function normalizeReplyMessage(replyTo) {
  if (!replyTo || typeof replyTo !== 'object') return null
  return {
    id: typeof replyTo.id === 'string' ? replyTo.id : '',
    body: typeof replyTo.body === 'string' ? replyTo.body : '',
    attachmentUrl: replyTo.attachmentUrl || null,
    attachmentMime: replyTo.attachmentMime || null,
    attachmentKind: replyTo.attachmentKind || null,
    deletedAt: replyTo.deletedAt || null,
    senderId: replyTo.senderId || null,
    senderUsername: replyTo.senderUsername || null,
    senderDisplayName: replyTo.senderDisplayName || null,
    senderAvatarUrl: replyTo.senderAvatarUrl || null
  }
}

function normalizeChatMessage(message) {
  if (!message || typeof message !== 'object') return message
  return {
    ...message,
    replyTo: normalizeReplyMessage(message.replyTo),
    reactions: normalizeMessageReactions(message.reactions),
    poll: normalizePollData(message.poll)
  }
}

function hasEmojiReaction(message, emoji) {
  if (!message || !Array.isArray(message.reactions)) return false
  return message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reacted)
}

function applyReactionDeltaToMessage(message, payload, currentUserId) {
  if (!message || !payload || message.id !== payload.messageId) return message
  const emoji = typeof payload.emoji === 'string' ? payload.emoji : ''
  if (!emoji) return message
  const active = payload.active === true
  const actorUserId = typeof payload.userId === 'string' ? payload.userId : ''
  const reactions = [...normalizeMessageReactions(message.reactions)]
  const index = reactions.findIndex((item) => item.emoji === emoji)

  if (index === -1) {
    if (!active) return message
    reactions.push({ emoji, count: 1, reacted: actorUserId === currentUserId })
    reactions.sort(MESSAGE_REACTION_SORT)
    return { ...message, reactions }
  }

  const current = reactions[index]
  const nextCount = Math.max(0, current.count + (active ? 1 : -1))
  if (nextCount === 0) {
    reactions.splice(index, 1)
  } else {
    reactions[index] = {
      ...current,
      count: nextCount,
      reacted: actorUserId === currentUserId ? active : current.reacted
    }
  }

  reactions.sort(MESSAGE_REACTION_SORT)
  return { ...message, reactions }
}

function applyPollUpdateToMessage(message, payload) {
  if (!message || !payload || message.id !== payload.messageId) return message
  const poll = normalizePollData(payload.poll)
  if (!poll) return message
  return { ...message, poll }
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [roles, setRoles] = useState([])
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [profileForm, setProfileForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    statusText: '',
    statusEmoji: '',
    role: '',
    themeColor: '#7a1f1d'
  })
  const [status, setStatus] = useState({ type: 'info', message: '' })
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    try {
      const stored = localStorage.getItem('ktk_theme')
      if (stored === 'light' || stored === 'dark') return stored
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light'
      }
    } catch (err) {
      // ignore storage errors
    }
    return 'dark'
  })
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [replyMessage, setReplyMessage] = useState(null)
  const [pollComposerOpen, setPollComposerOpen] = useState(false)
  const [pollDraft, setPollDraft] = useState(INITIAL_POLL_DRAFT)
  const [pollVoteLoadingByMessage, setPollVoteLoadingByMessage] = useState({})
  const [messageFile, setMessageFile] = useState(null)
  const [messagePreview, setMessagePreview] = useState('')
  const [messagePreviewType, setMessagePreviewType] = useState('')
  const [messageAttachmentKind, setMessageAttachmentKind] = useState('')
  const [videoNoteRecording, setVideoNoteRecording] = useState(false)
  const [videoNoteDuration, setVideoNoteDuration] = useState(0)
  const [myStickers, setMyStickers] = useState([])
  const [myGifs, setMyGifs] = useState([])
  const [stickersLoading, setStickersLoading] = useState(false)
  const [gifsLoading, setGifsLoading] = useState(false)
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false)
  const [mediaPanelTab, setMediaPanelTab] = useState(MEDIA_PANEL_TABS.emoji)
  const [mediaPanelQuery, setMediaPanelQuery] = useState('')
  const [chatShaking, setChatShaking] = useState(false)
  const [revealedSpoilers, setRevealedSpoilers] = useState(() => new Set())
  const [recentStickerIds, setRecentStickerIds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_STICKERS_STORAGE_KEY) || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed.map((item) => String(item || '')).filter(Boolean).slice(0, 40)
    } catch (err) {
      return []
    }
  })
  const [recentGifIds, setRecentGifIds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_GIFS_STORAGE_KEY) || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed.map((item) => String(item || '')).filter(Boolean).slice(0, 40)
    } catch (err) {
      return []
    }
  })
  const [recentEmojiItems, setRecentEmojiItems] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_EMOJIS_STORAGE_KEY) || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed.map((item) => String(item || '')).filter(Boolean).slice(0, 30)
    } catch (err) {
      return []
    }
  })
  const [draftsByConversation, setDraftsByConversation] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}')
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (err) {
      return {}
    }
  })
  const [chatListFilter, setChatListFilter] = useState(CHAT_LIST_FILTERS.all)
  const [typingByConversation, setTypingByConversation] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [socketConnection, setSocketConnection] = useState('offline')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [groupOpen, setGroupOpen] = useState(false)
  const [posts, setPosts] = useState([])
  const [feedFilter, setFeedFilter] = useState(FEED_FILTERS.all)
  const [feedQuery, setFeedQuery] = useState('')
  const [activeFeedTag, setActiveFeedTag] = useState('')
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FEED_BOOKMARKS_STORAGE_KEY) || '[]')
      if (!Array.isArray(raw)) return new Set()
      return new Set(raw.map((item) => String(item || '')).filter(Boolean))
    } catch (err) {
      return new Set()
    }
  })
  const [postText, setPostText] = useState('')
  const [postFile, setPostFile] = useState(null)
  const [postPreview, setPostPreview] = useState('')
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [avatarSource, setAvatarSource] = useState('')
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState(null)
  const [profileView, setProfileView] = useState(null)
  const [profileBackView, setProfileBackView] = useState('feed')
  const [profilePosts, setProfilePosts] = useState([])
  const [profileTracks, setProfileTracks] = useState([])
  const [myTracks, setMyTracks] = useState([])
  const [trackTitle, setTrackTitle] = useState('')
  const [trackArtist, setTrackArtist] = useState('')
  const [trackFile, setTrackFile] = useState(null)
  const [activeTrackId, setActiveTrackId] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [musicUploadLoading, setMusicUploadLoading] = useState(false)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDraft, setCommentDraft] = useState({})
  const [openComments, setOpenComments] = useState(null)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingMessageText, setEditingMessageText] = useState('')
  const [contextMenu, setContextMenu] = useState(INITIAL_MESSAGE_MENU_STATE)
  const [postMenu, setPostMenu] = useState(INITIAL_POST_MENU_STATE)
  const [chatMenu, setChatMenu] = useState(INITIAL_CHAT_MENU_STATE)
  const [chatWallpaperByConversation, setChatWallpaperByConversation] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAT_WALLPAPER_STORAGE_KEY) || '{}')
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (err) {
      return {}
    }
  })
  const [chatAliasByConversation, setChatAliasByConversation] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAT_ALIAS_STORAGE_KEY) || '{}')
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (err) {
      return {}
    }
  })
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [pinnedByConversation, setPinnedByConversation] = useState({})
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ktk_blocked_users') || '[]')
    } catch (err) {
      return []
    }
  })
  const [callState, setCallState] = useState({ status: 'idle', withUserId: null, direction: null, startedAt: null })
  const [callDuration, setCallDuration] = useState(0)
  const [remoteStream, setRemoteStream] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingPostText, setEditingPostText] = useState('')
  const [adminQuery, setAdminQuery] = useState('')
  const [adminUsers, setAdminUsers] = useState([])
  const [adminWarnReason, setAdminWarnReason] = useState({})
  const [lightboxImage, setLightboxImage] = useState('')
  const [pushState, setPushState] = useState({
    supported: false,
    permission: 'default',
    enabled: false,
    loading: false,
    error: ''
  })
  const [pendingPushConversationId, setPendingPushConversationId] = useState(null)

  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const incomingOfferRef = useRef(null)
  const pendingIceCandidatesRef = useRef([])
  const callDisconnectTimerRef = useRef(null)
  const videoRecorderRef = useRef(null)
  const videoStreamRef = useRef(null)
  const videoChunksRef = useRef([])
  const videoNoteTimerRef = useRef(null)
  const videoNoteDiscardRef = useRef(false)
  const videoNotePreviewRef = useRef(null)
  const messagePreviewUrlRef = useRef('')
  const callStateRef = useRef(callState)
  const blockedUsersRef = useRef(blockedUsers)
  const conversationsRef = useRef(conversations)
  const activeConversationRef = useRef(activeConversation)
  const viewRef = useRef(view)
  const profileViewRef = useRef(profileView)
  const toastIdRef = useRef(0)
  const toastTimersRef = useRef(new Map())
  const audioContextRef = useRef(null)
  const audioUnlockedRef = useRef(false)
  const lastMessageSoundRef = useRef(0)
  const lastNotificationSoundRef = useRef(0)
  const serviceWorkerRegistrationRef = useRef(null)
  const pushPublicKeyRef = useRef('')
  const lastPresenceStateRef = useRef({ focused: null, activeConversationId: null })
  const typingStateRef = useRef({ conversationId: null, isTyping: false, timer: null })
  const draftsRef = useRef(draftsByConversation)
  const socketConnectionRef = useRef(socketConnection)
  const chatSearchInputRef = useRef(null)
  const composerInputRef = useRef(null)
  const contextMenuRef = useRef(null)
  const postMenuRef = useRef(null)
  const chatMenuRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const previousMessageMetaRef = useRef({ conversationId: null, count: 0, lastMessageId: null })
  const previousViewRef = useRef(view)

  const roleOptions = useMemo(() => (roles.length ? roles : fallbackRoles), [roles])
  const pinnedMessage = useMemo(() => {
    if (!activeConversation) return null
    return pinnedByConversation[activeConversation.id] || null
  }, [activeConversation, pinnedByConversation])
  const isChatBlocked = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup) return false
    return blockedUsers.includes(activeConversation.other.id)
  }, [activeConversation, blockedUsers])
  const filteredMessages = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase()
    if (!query) return messages
    return messages.filter((msg) => (msg.body || '').toLowerCase().includes(query))
  }, [messages, chatSearchQuery])
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null
  const favoriteConversationSet = useMemo(() => (
    new Set(conversations.filter((conv) => conv.isFavorite).map((conv) => conv.id))
  ), [conversations])
  const unreadConversationCount = useMemo(() => (
    conversations.reduce((acc, conv) => acc + (Number(conv.unreadCount || 0) > 0 ? 1 : 0), 0)
  ), [conversations])
  const unreadMessagesCount = useMemo(() => (
    conversations.reduce((acc, conv) => acc + Math.max(0, Number(conv.unreadCount || 0)), 0)
  ), [conversations])
  const favoriteConversationCount = useMemo(() => (
    conversations.reduce((acc, conv) => acc + (favoriteConversationSet.has(conv.id) ? 1 : 0), 0)
  ), [conversations, favoriteConversationSet])
  const visibleConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const aFavorite = favoriteConversationSet.has(a.id)
      const bFavorite = favoriteConversationSet.has(b.id)
      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1
      const aTime = Date.parse(a.lastAt || '') || 0
      const bTime = Date.parse(b.lastAt || '') || 0
      return bTime - aTime
    })
    if (chatListFilter === CHAT_LIST_FILTERS.unread) {
      return sorted.filter((conv) => Number(conv.unreadCount || 0) > 0)
    }
    if (chatListFilter === CHAT_LIST_FILTERS.favorites) {
      return sorted.filter((conv) => favoriteConversationSet.has(conv.id))
    }
    return sorted
  }, [conversations, favoriteConversationSet, chatListFilter])
  const userMoodLabel = useMemo(() => getProfileMoodLabel(user), [user])
  const profileViewMoodLabel = useMemo(() => getProfileMoodLabel(profileView), [profileView])
  const activeChatMoodLabel = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup || !activeConversation.other) return ''
    return getProfileMoodLabel(activeConversation.other)
  }, [activeConversation])
  const activeConversationAlias = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup) return ''
    return normalizeChatAlias(chatAliasByConversation[activeConversation.id])
  }, [activeConversation, chatAliasByConversation])
  const activeChatTitle = useMemo(() => (
    getConversationDisplayName(activeConversation, chatAliasByConversation)
  ), [activeConversation, chatAliasByConversation])
  const activeChatHandle = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup || !activeConversation.other?.username) return ''
    return `@${activeConversation.other.username}`
  }, [activeConversation])
  const activeChatWallpaper = useMemo(() => {
    if (!activeConversation) return CHAT_WALLPAPERS[0]
    const storedValue = chatWallpaperByConversation[activeConversation.id]
    const found = CHAT_WALLPAPERS.find((item) => item.value === storedValue)
    return found || CHAT_WALLPAPERS[0]
  }, [activeConversation, chatWallpaperByConversation])
  const stickerById = useMemo(() => (
    new Map(myStickers.map((sticker) => [sticker.id, sticker]))
  ), [myStickers])
  const recentStickers = useMemo(() => (
    recentStickerIds
      .map((stickerId) => stickerById.get(stickerId))
      .filter(Boolean)
      .slice(0, 16)
  ), [recentStickerIds, stickerById])
  const gifById = useMemo(() => (
    new Map(myGifs.map((gif) => [gif.id, gif]))
  ), [myGifs])
  const recentGifs = useMemo(() => (
    recentGifIds
      .map((gifId) => gifById.get(gifId))
      .filter(Boolean)
      .slice(0, 16)
  ), [recentGifIds, gifById])
  const mediaQueryNormalized = mediaPanelQuery.trim().toLowerCase()
  const emojiByValue = useMemo(() => (
    new Map(EMOJI_PICKER_ITEMS.map((item) => [item.value, item]))
  ), [])
  const recentEmojis = useMemo(() => (
    recentEmojiItems
      .map((emoji) => emojiByValue.get(emoji))
      .filter(Boolean)
      .slice(0, 20)
  ), [recentEmojiItems, emojiByValue])
  const visibleEmojis = useMemo(() => {
    if (!mediaQueryNormalized) return EMOJI_PICKER_ITEMS
    return EMOJI_PICKER_ITEMS.filter((item) => (
      item.value.includes(mediaQueryNormalized) ||
      item.tags.includes(mediaQueryNormalized)
    ))
  }, [mediaQueryNormalized])
  const visibleStickers = useMemo(() => {
    if (!mediaQueryNormalized) return myStickers
    return myStickers.filter((sticker) => (
      String(sticker.title || '').toLowerCase().includes(mediaQueryNormalized)
    ))
  }, [myStickers, mediaQueryNormalized])
  const visibleRecentStickers = useMemo(() => {
    if (!mediaQueryNormalized) return recentStickers
    return recentStickers.filter((sticker) => (
      String(sticker.title || '').toLowerCase().includes(mediaQueryNormalized)
    ))
  }, [recentStickers, mediaQueryNormalized])
  const visibleGifs = useMemo(() => {
    if (!mediaQueryNormalized) return myGifs
    return myGifs.filter((gif) => (
      String(gif.title || '').toLowerCase().includes(mediaQueryNormalized)
    ))
  }, [myGifs, mediaQueryNormalized])
  const visibleRecentGifs = useMemo(() => {
    if (!mediaQueryNormalized) return recentGifs
    return recentGifs.filter((gif) => (
      String(gif.title || '').toLowerCase().includes(mediaQueryNormalized)
    ))
  }, [recentGifs, mediaQueryNormalized])
  const groupedVisibleEmojis = useMemo(() => {
    const groups = new Map()
    visibleEmojis.forEach((item) => {
      const key = item.group || 'symbols'
      const current = groups.get(key) || []
      current.push(item)
      groups.set(key, current)
    })
    return Array.from(groups.entries())
  }, [visibleEmojis])
  const commandSuggestions = useMemo(() => {
    if (!activeConversation || isChatBlocked || messageFile) return []
    const raw = String(messageText || '').trimStart()
    if (!raw.startsWith('/')) return []
    const query = raw.slice(1).toLowerCase()
    return FUN_COMMANDS
      .filter((item) => item.command.slice(1).includes(query))
      .slice(0, 6)
  }, [activeConversation, isChatBlocked, messageFile, messageText])
  const feedQueryNormalized = feedQuery.trim().toLowerCase()
  const trendingTags = useMemo(() => {
    const tagCounts = new Map()
    posts.forEach((post) => {
      extractHashtags(post.body).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0])
      })
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }))
  }, [posts])
  const feedMetrics = useMemo(() => {
    const total = posts.length
    const mine = posts.reduce((acc, post) => acc + (post.author && user && post.author.id === user.id ? 1 : 0), 0)
    const engagement = posts.reduce((acc, post) => (
      acc + Number(post.likesCount || 0) + Number(post.commentsCount || 0) + Number(post.repostsCount || 0)
    ), 0)
    return {
      total,
      mine,
      bookmarked: bookmarkedPostIds.size,
      engagement
    }
  }, [posts, user, bookmarkedPostIds])
  const visibleFeedPosts = useMemo(() => {
    const tagFilter = activeFeedTag ? activeFeedTag.toLowerCase() : ''
    let list = [...posts]

    if (feedFilter === FEED_FILTERS.mine && user) {
      list = list.filter((post) => post.author && post.author.id === user.id)
    }
    if (feedFilter === FEED_FILTERS.bookmarks) {
      list = list.filter((post) => bookmarkedPostIds.has(post.id))
    }
    if (tagFilter) {
      list = list.filter((post) => extractHashtags(post.body).includes(tagFilter))
    }
    if (feedQueryNormalized) {
      list = list.filter((post) => {
        const body = String(post.body || '').toLowerCase()
        const authorName = String(post.author?.displayName || post.author?.username || '').toLowerCase()
        return body.includes(feedQueryNormalized) || authorName.includes(feedQueryNormalized)
      })
    }
    if (feedFilter === FEED_FILTERS.popular) {
      list.sort((a, b) => {
        const scoreA = (Number(a.likesCount || 0) * 3) + Number(a.commentsCount || 0) + (Number(a.repostsCount || 0) * 4)
        const scoreB = (Number(b.likesCount || 0) * 3) + Number(b.commentsCount || 0) + (Number(b.repostsCount || 0) * 4)
        if (scoreB !== scoreA) return scoreB - scoreA
        return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)
      })
    }
    return list
  }, [posts, feedFilter, user, bookmarkedPostIds, activeFeedTag, feedQueryNormalized])
  const isActiveConversationFavorite = useMemo(() => {
    if (!activeConversation) return false
    return favoriteConversationSet.has(activeConversation.id)
  }, [activeConversation, favoriteConversationSet])
  const activeProfileTrack = useMemo(() => {
    if (!activeTrackId) return null
    return profileTracks.find((track) => track.id === activeTrackId) || null
  }, [profileTracks, activeTrackId])
  const typingLabel = useMemo(() => {
    if (!activeConversation || !user) return ''
    const rawUserIds = typingByConversation[activeConversation.id] || []
    const userIds = rawUserIds.filter((userId) => userId && userId !== user.id)
    if (userIds.length === 0) return ''
    if (!activeConversation.isGroup && activeConversation.other) {
      return `${activeChatTitle} печатает...`
    }
    if (userIds.length === 1) return 'Someone is typing...'
    return `${userIds.length} people are typing...`
  }, [typingByConversation, activeConversation, activeChatTitle, user])
  const callUser = useMemo(() => {
    if (!callState.withUserId) return null
    if (activeConversation && !activeConversation.isGroup && activeConversation.other.id === callState.withUserId) {
      return activeConversation.other
    }
    const conv = conversations.find((item) => !item.isGroup && item.other && item.other.id === callState.withUserId)
    return conv ? conv.other : { id: callState.withUserId, username: 'user', displayName: '' }
  }, [callState.withUserId, activeConversation, conversations])
  const callConversation = useMemo(() => {
    if (!callState.withUserId) return null
    if (activeConversation && !activeConversation.isGroup && activeConversation.other.id === callState.withUserId) {
      return activeConversation
    }
    return conversations.find((item) => !item.isGroup && item.other && item.other.id === callState.withUserId) || null
  }, [callState.withUserId, activeConversation, conversations])
  const callTitle = callConversation
    ? getConversationDisplayName(callConversation, chatAliasByConversation)
    : (callUser ? (callUser.displayName || callUser.username) : 'Пользователь')
  const callSubtitle = callConversation?.other?.username
    ? `@${callConversation.other.username}`
    : (callUser && callUser.username ? `@${callUser.username}` : '')
  const callStatusText = callState.status === 'calling'
    ? 'Вызов...'
    : callState.status === 'connecting'
      ? 'Соединение...'
      : callState.status === 'in-call'
        ? `Звонок ${formatDuration(callDuration)}`
        : ''
  const scrollChatToBottom = (behavior = 'auto') => {
    const container = chatMessagesRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
  }

  const clearCallDisconnectTimer = () => {
    if (!callDisconnectTimerRef.current) return
    clearTimeout(callDisconnectTimerRef.current)
    callDisconnectTimerRef.current = null
  }

  const clearVideoNoteTimer = () => {
    if (!videoNoteTimerRef.current) return
    clearInterval(videoNoteTimerRef.current)
    videoNoteTimerRef.current = null
  }

  const stopVideoNoteStream = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop())
      videoStreamRef.current = null
    }
    if (videoNotePreviewRef.current) {
      videoNotePreviewRef.current.srcObject = null
    }
  }

  const revokeComposerPreviewUrl = () => {
    const previous = messagePreviewUrlRef.current
    if (previous && previous.startsWith('blob:')) {
      URL.revokeObjectURL(previous)
    }
    messagePreviewUrlRef.current = ''
  }

  const setComposerPreviewUrl = (url) => {
    revokeComposerPreviewUrl()
    if (url && url.startsWith('blob:')) {
      messagePreviewUrlRef.current = url
    }
    setMessagePreview(url || '')
  }

  const stopVideoNoteRecording = (discard = false) => {
    videoNoteDiscardRef.current = discard
    const recorder = videoRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch (err) {
        // ignore recorder stop errors
      }
      return
    }
    clearVideoNoteTimer()
    stopVideoNoteStream()
    videoRecorderRef.current = null
    videoChunksRef.current = []
    setVideoNoteRecording(false)
    setVideoNoteDuration(0)
  }

  const clearMessageAttachment = (stopRecorder = true) => {
    if (stopRecorder) {
      stopVideoNoteRecording(true)
    }
    revokeComposerPreviewUrl()
    setMessageFile(null)
    setMessagePreview('')
    setMessagePreviewType('')
    setMessageAttachmentKind('')
  }

  const startVideoNoteRecording = async () => {
    if (!activeConversation || isChatBlocked) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setStatus({ type: 'error', message: 'Запись кружков не поддерживается на этом устройстве.' })
      return
    }
    const preferredMimeType = getSupportedVideoNoteMimeType()
    clearMessageAttachment(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 }
        }
      })
      const recorder = preferredMimeType
        ? new window.MediaRecorder(stream, { mimeType: preferredMimeType })
        : new window.MediaRecorder(stream)
      videoNoteDiscardRef.current = false
      videoStreamRef.current = stream
      videoRecorderRef.current = recorder
      videoChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data)
        }
      }
      recorder.onerror = () => {
        setStatus({ type: 'error', message: 'Не удалось записать кружок.' })
        stopVideoNoteRecording(true)
      }
      recorder.onstop = () => {
        const shouldDiscard = videoNoteDiscardRef.current
        const firstChunk = videoChunksRef.current[0]
        const mimeType = normalizeVideoNoteMimeType((firstChunk && firstChunk.type) || recorder.mimeType || preferredMimeType)
        const blob = new Blob(videoChunksRef.current, { type: mimeType })
        clearVideoNoteTimer()
        stopVideoNoteStream()
        videoRecorderRef.current = null
        videoChunksRef.current = []
        setVideoNoteRecording(false)
        setVideoNoteDuration(0)
        if (shouldDiscard) return
        if (blob.size === 0) {
          setStatus({ type: 'error', message: 'Кружок пустой. Запишите снова.' })
          return
        }
        const extension = getVideoExtensionFromMime(mimeType)
        const file = new File([blob], `video-note-${Date.now()}.${extension}`, { type: mimeType })
        const previewUrl = URL.createObjectURL(blob)
        setMessageFile(file)
        setMessageAttachmentKind(VIDEO_NOTE_KIND)
        setMessagePreviewType('video')
        setComposerPreviewUrl(previewUrl)
      }

      if (videoNotePreviewRef.current) {
        videoNotePreviewRef.current.srcObject = stream
        videoNotePreviewRef.current.muted = true
        void videoNotePreviewRef.current.play().catch(() => {})
      }

      recorder.start(250)
      setVideoNoteDuration(0)
      setVideoNoteRecording(true)
      clearVideoNoteTimer()
      videoNoteTimerRef.current = setInterval(() => {
        setVideoNoteDuration((prev) => {
          const next = prev + 1
          if (next >= VIDEO_NOTE_MAX_SECONDS) {
            stopVideoNoteRecording(false)
          }
          return next
        })
      }, 1000)
    } catch (err) {
      stopVideoNoteRecording(true)
      setStatus({ type: 'error', message: 'Нет доступа к камере или микрофону.' })
    }
  }

  const toggleVideoNoteRecording = async () => {
    if (videoNoteRecording) {
      stopVideoNoteRecording(false)
      return
    }
    await startVideoNoteRecording()
  }

  const flushPendingIceCandidates = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return
    const pending = pendingIceCandidatesRef.current
    if (!pending.length) return
    pendingIceCandidatesRef.current = []
    for (const candidate of pending) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        // ignore ICE errors
      }
    }
  }

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer))
      toastTimersRef.current.clear()
      clearVideoNoteTimer()
      stopVideoNoteStream()
      clearCallDisconnectTimer()
      revokeComposerPreviewUrl()
      if (audioContextRef.current && audioContextRef.current.close) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('ktk_theme', theme)
    } catch (err) {
      // ignore storage errors
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      audioContextRef.current.resume().then(() => {
        audioUnlockedRef.current = true
      }).catch(() => {})
    }
    const handler = () => {
      unlockAudio()
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('pointerdown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  const dismissToast = (id) => {
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const pushToast = ({ title, message, type = 'info', duration = 4200 }) => {
    if (!title && !message) return
    const id = toastIdRef.current + 1
    toastIdRef.current = id
    setToasts((prev) => [...prev, { id, title, message, type }])
    const timer = setTimeout(() => {
      dismissToast(id)
    }, duration)
    toastTimersRef.current.set(id, timer)
  }

  const playTone = (frequency, duration, volume, offset = 0) => {
    if (!audioUnlockedRef.current || !audioContextRef.current) return
    const ctx = audioContextRef.current
    const startTime = ctx.currentTime + offset
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.02)
  }

  const playMessageSound = () => {
    const now = Date.now()
    if (now - lastMessageSoundRef.current < 140) return
    lastMessageSoundRef.current = now
    playTone(520, 0.09, 0.05)
  }

  const playNotificationSound = () => {
    const now = Date.now()
    if (now - lastNotificationSoundRef.current < 180) return
    lastNotificationSoundRef.current = now
    playTone(440, 0.08, 0.05)
    playTone(660, 0.1, 0.045, 0.1)
  }

  const bumpConversationUnread = (conversationId) => {
    if (!conversationId) return
    setConversations((prev) => {
      const index = prev.findIndex((item) => item.id === conversationId)
      if (index === -1) return prev
      const current = prev[index]
      const nextUnread = Number(current.unreadCount || 0) + 1
      const updated = { ...current, unreadCount: nextUnread }
      const next = [...prev]
      next[index] = updated
      return next
    })
  }

  const clearConversationUnread = async (conversationId) => {
    if (!conversationId) return
    setConversations((prev) => prev.map((item) =>
      item.id === conversationId ? { ...item, unreadCount: 0 } : item
    ))
    try {
      await markConversationRead(conversationId)
    } catch (err) {
      // ignore read errors
    }
  }

  const patchMessageById = (messageId, updater) => {
    if (!messageId || typeof updater !== 'function') return

    setMessages((prev) => {
      let changed = false
      const next = prev.map((message) => {
        if (message.id !== messageId) return message
        const updated = updater(message)
        if (!updated || updated === message) return message
        changed = true
        return normalizeChatMessage(updated)
      })
      return changed ? next : prev
    })

    setContextMenu((prev) => {
      if (!prev.open || !prev.message || prev.message.id !== messageId) return prev
      const updated = updater(prev.message)
      if (!updated || updated === prev.message) return prev
      return { ...prev, message: normalizeChatMessage(updated) }
    })
  }

  const setMessageReactions = (messageId, reactions) => {
    const normalized = normalizeMessageReactions(reactions)
    patchMessageById(messageId, (message) => ({ ...message, reactions: normalized }))
  }

  const setMessagePoll = (messageId, poll) => {
    const normalized = normalizePollData(poll)
    if (!normalized) return
    patchMessageById(messageId, (message) => ({ ...message, poll: normalized }))
  }

  const applyIncomingReactionDelta = (payload) => {
    if (!payload || !payload.messageId) return
    patchMessageById(payload.messageId, (message) =>
      applyReactionDeltaToMessage(message, payload, user ? user.id : '')
    )
  }

  const applyIncomingPollUpdate = (payload) => {
    if (!payload || !payload.messageId) return
    patchMessageById(payload.messageId, (message) => applyPollUpdateToMessage(message, payload))
  }

  const removeTypingUser = (conversationId, userId) => {
    if (!conversationId || !userId) return
    setTypingByConversation((prev) => {
      const current = prev[conversationId]
      if (!current || !current.includes(userId)) return prev
      const nextList = current.filter((id) => id !== userId)
      if (nextList.length === 0) {
        const next = { ...prev }
        delete next[conversationId]
        return next
      }
      return { ...prev, [conversationId]: nextList }
    })
  }

  const stopTyping = (conversationId = null) => {
    const state = typingStateRef.current
    const targetConversationId = conversationId || state.conversationId
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }
    if (!state.isTyping || !state.conversationId) {
      state.conversationId = null
      state.isTyping = false
      return
    }
    if (targetConversationId && state.conversationId !== targetConversationId) return
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('typing:stop', { conversationId: state.conversationId })
    }
    state.conversationId = null
    state.isTyping = false
  }

  const syncTypingStateByValue = (value) => {
    if (!activeConversation || isChatBlocked) {
      if (!value.trim()) stopTyping()
      return
    }
    const socket = socketRef.current
    if (!socket || !socket.connected) return

    const conversationId = activeConversation.id
    const state = typingStateRef.current
    const hasText = value.trim().length > 0

    if (!hasText) {
      stopTyping(conversationId)
      return
    }

    if (!state.isTyping || state.conversationId !== conversationId) {
      if (state.isTyping && state.conversationId && state.conversationId !== conversationId) {
        socket.emit('typing:stop', { conversationId: state.conversationId })
      }
      socket.emit('typing:start', { conversationId })
      state.isTyping = true
      state.conversationId = conversationId
    }

    if (state.timer) clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      const nextSocket = socketRef.current
      if (nextSocket && nextSocket.connected && state.isTyping && state.conversationId === conversationId) {
        nextSocket.emit('typing:stop', { conversationId })
      }
      if (state.conversationId === conversationId) {
        state.isTyping = false
        state.conversationId = null
      }
      state.timer = null
    }, 1600)
  }

  const handleMessageInputChange = (event) => {
    const value = event.target.value
    setMessageText(value)
    syncTypingStateByValue(value)
  }

  const rememberRecentEmoji = (emoji) => {
    if (!emoji) return
    setRecentEmojiItems((prev) => {
      const next = [emoji, ...prev.filter((item) => item !== emoji)]
      return next.slice(0, 30)
    })
  }

  const appendEmojiToMessage = (emoji) => {
    if (!emoji || !activeConversation || isChatBlocked) return
    const input = composerInputRef.current
    const currentValue = messageText
    const hasSelection = input && typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number'
    const selectionStart = hasSelection ? input.selectionStart : currentValue.length
    const selectionEnd = hasSelection ? input.selectionEnd : currentValue.length
    const nextValue = `${currentValue.slice(0, selectionStart)}${emoji}${currentValue.slice(selectionEnd)}`
    const nextCaret = selectionStart + emoji.length
    setMessageText(nextValue)
    syncTypingStateByValue(nextValue)
    rememberRecentEmoji(emoji)
    window.requestAnimationFrame(() => {
      if (!input) return
      input.focus()
      try {
        input.setSelectionRange(nextCaret, nextCaret)
      } catch (err) {
        // ignore cursor update errors
      }
    })
  }

  const applyCommandSuggestion = (template) => {
    if (!activeConversation || isChatBlocked || !template) return
    setMessageText(template)
    syncTypingStateByValue(template)
    window.requestAnimationFrame(() => {
      if (!composerInputRef.current) return
      composerInputRef.current.focus()
      const caret = template.length
      try {
        composerInputRef.current.setSelectionRange(caret, caret)
      } catch (err) {
        // ignore cursor update errors
      }
    })
  }

  const resolveFunCommand = (rawText) => {
    const trimmed = String(rawText || '').trim()
    if (!trimmed.startsWith('/')) {
      return { ok: true, text: trimmed }
    }
    const firstSpace = trimmed.indexOf(' ')
    const command = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toLowerCase()
    const tail = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim()

    if (command === '/shrug') return { ok: true, text: '¯\\_(ツ)_/¯' }
    if (command === '/flip') return { ok: true, text: '(╯°□°)╯︵ ┻━┻' }
    if (command === '/unflip') return { ok: true, text: '┬─┬ ノ( ゜-゜ノ)' }
    if (command === '/dice') return { ok: true, text: `🎲 Выпало: ${Math.floor(Math.random() * 6) + 1}` }
    if (command === '/8ball') {
      if (!tail) return { ok: false, error: 'Напишите вопрос после /8ball' }
      const answer = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)]
      return { ok: true, text: `🎱 ${answer}` }
    }
    if (command === '/spoiler') {
      if (!tail) return { ok: false, error: 'Напишите текст после /spoiler' }
      return { ok: true, text: `||${tail}||` }
    }
    if (command === '/nudge') return { ok: true, text: NUDGE_MARKER }
    return { ok: false, error: `Неизвестная команда: ${command}` }
  }

  const triggerChatShake = () => {
    setChatShaking(false)
    window.requestAnimationFrame(() => {
      setChatShaking(true)
    })
  }

  const revealSpoiler = (messageId) => {
    if (!messageId) return
    setRevealedSpoilers((prev) => {
      if (prev.has(messageId)) return prev
      const next = new Set(prev)
      next.add(messageId)
      return next
    })
  }

  const renderMessageBody = (msg) => {
    if (!msg) return null
    if (msg.poll) return null
    if (!msg || !msg.body) return null
    if (isNudgeMessage(msg.body)) {
      return (
        <button type="button" className="message-nudge" onClick={triggerChatShake}>
          <span>👋</span>
          <span>{msg.senderId === user.id ? 'Пинок отправлен' : 'Тебя пнули'}</span>
        </button>
      )
    }

    const spoilerText = extractSpoilerText(msg.body)
    if (spoilerText) {
      const revealed = revealedSpoilers.has(msg.id)
      return (
        <button
          type="button"
          className={`message-spoiler ${revealed ? 'revealed' : ''}`.trim()}
          onClick={() => {
            if (!revealed) revealSpoiler(msg.id)
          }}
        >
          {revealed ? spoilerText : 'Скрытый текст. Нажми, чтобы открыть'}
        </button>
      )
    }

    return <p className="message-text">{msg.body}</p>
  }

  const renderPollCard = (msg) => {
    const poll = normalizePollData(msg && msg.poll)
    if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) return null

    const totalVotes = Math.max(0, Number(poll.totalVotes) || 0)
    const participantsCount = Math.max(0, Number(poll.participantsCount) || 0)
    const isVoting = pollVoteLoadingByMessage[msg.id] === true

    return (
      <div className="poll-card">
        <div className="poll-head">
          <strong>{poll.question || 'Опрос'}</strong>
          <span>{poll.allowsMultiple ? 'Можно выбрать несколько' : 'Один вариант'}</span>
        </div>
        <div className="poll-options">
          {poll.options.map((option) => {
            const safeVotes = Math.max(0, Number(option.votes) || 0)
            const percent = totalVotes > 0 ? Math.round((safeVotes / totalVotes) * 100) : 0
            return (
              <button
                key={`${msg.id}-poll-option-${option.id}`}
                type="button"
                className={`poll-option ${option.selected ? 'selected' : ''}`.trim()}
                disabled={isVoting}
                onClick={() => handlePollVote(msg.id, option.id)}
              >
                <span className="poll-option-fill" style={{ width: `${percent}%` }}></span>
                <span className="poll-option-text">{option.text}</span>
                <span className="poll-option-meta">{safeVotes} • {percent}%</span>
              </button>
            )
          })}
        </div>
        <div className="poll-foot">
          <span>{totalVotes} голосов</span>
          <span>{participantsCount} участников</span>
          {isVoting && <span>Сохраняем...</span>}
        </div>
      </div>
    )
  }

  const isPushSupported = () => (
    webPushFeatureEnabled &&
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )

  const ensureServiceWorkerRegistration = async () => {
    if (!isPushSupported()) {
      throw new Error('Push notifications are not supported in this browser.')
    }
    if (serviceWorkerRegistrationRef.current) {
      return serviceWorkerRegistrationRef.current
    }
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    const readyRegistration = await navigator.serviceWorker.ready
    serviceWorkerRegistrationRef.current = readyRegistration || registration
    return serviceWorkerRegistrationRef.current
  }

  const fetchPushPublicKey = async () => {
    if (pushPublicKeyRef.current) return pushPublicKeyRef.current
    const data = await getPushPublicKey()
    if (!data || !data.publicKey) {
      throw new Error('Web push is not configured on the server.')
    }
    pushPublicKeyRef.current = data.publicKey
    return pushPublicKeyRef.current
  }

  const attachPushSubscriptionToUser = async () => {
    const registration = await ensureServiceWorkerRegistration()
    const publicKey = await fetchPushPublicKey()
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })
    }
    await savePushSubscription(subscription.toJSON())
    setPushState({
      supported: true,
      permission: Notification.permission,
      enabled: true,
      loading: false,
      error: ''
    })
    return subscription
  }

  const syncPushState = async ({ keepError = false } = {}) => {
    const supported = isPushSupported()
    if (!supported) {
      setPushState({
        supported: false,
        permission: 'unsupported',
        enabled: false,
        loading: false,
        error: ''
      })
      return
    }

    const permission = Notification.permission
    if (!user || permission !== 'granted') {
      setPushState((prev) => ({
        supported: true,
        permission,
        enabled: false,
        loading: false,
        error: keepError ? prev.error : ''
      }))
      return
    }

    try {
      const registration = await ensureServiceWorkerRegistration()
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await savePushSubscription(subscription.toJSON())
      }
      setPushState((prev) => ({
        supported: true,
        permission,
        enabled: Boolean(subscription),
        loading: false,
        error: keepError ? prev.error : ''
      }))
    } catch (err) {
      const feedback = getPushErrorFeedback(err)
      setPushState((prev) => ({
        supported: feedback.supported,
        permission,
        enabled: false,
        loading: false,
        error: keepError ? (feedback.message || prev.error || 'Push setup failed') : ''
      }))
    }
  }

  const detachPushSubscriptionFromCurrentUser = async () => {
    if (!isPushSupported()) return
    try {
      const registration = serviceWorkerRegistrationRef.current || await navigator.serviceWorker.getRegistration('/sw.js')
      if (!registration) return
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription || !subscription.endpoint) return
      await deletePushSubscription(subscription.endpoint)
    } catch (err) {
      // ignore cleanup errors
    }
  }

  const enablePushNotifications = async () => {
    if (!user) {
      setStatus({ type: 'info', message: 'Sign in first to enable notifications.' })
      return
    }
    setPushState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      if (!isPushSupported()) {
        throw new Error('Push notifications are not supported in this browser.')
      }
      await ensureServiceWorkerRegistration()
      let permission = Notification.permission
      if (permission !== 'granted') {
        permission = await Notification.requestPermission()
      }
      if (permission !== 'granted') {
        setPushState({
          supported: true,
          permission,
          enabled: false,
          loading: false,
          error: permission === 'denied'
            ? 'Notification permission is blocked in browser settings.'
            : ''
        })
        return
      }
      await attachPushSubscriptionToUser()
      pushToast({
        title: 'Notifications enabled',
        message: 'You will receive messages on this device.',
        type: 'info'
      })
    } catch (err) {
      const feedback = getPushErrorFeedback(err)
      setPushState((prev) => ({
        ...prev,
        supported: feedback.supported,
        loading: false,
        enabled: false,
        error: feedback.message || 'Failed to enable notifications'
      }))
    }
  }

  const disablePushNotifications = async ({ silent = false } = {}) => {
    setPushState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      if (!isPushSupported()) {
        setPushState({
          supported: false,
          permission: 'unsupported',
          enabled: false,
          loading: false,
          error: ''
        })
        return
      }
      const registration = serviceWorkerRegistrationRef.current ||
        await navigator.serviceWorker.getRegistration('/sw.js') ||
        await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setPushState({
          supported: true,
          permission: Notification.permission,
          enabled: false,
          loading: false,
          error: ''
        })
        return
      }
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        if (subscription.endpoint) {
          await deletePushSubscription(subscription.endpoint).catch(() => {})
        }
        await subscription.unsubscribe().catch(() => {})
      }
      setPushState({
        supported: true,
        permission: Notification.permission,
        enabled: false,
        loading: false,
        error: ''
      })
      if (!silent) {
        pushToast({
          title: 'Notifications disabled',
          message: 'System notifications are off for this browser.',
          type: 'info'
        })
      }
    } catch (err) {
      const feedback = getPushErrorFeedback(err)
      setPushState((prev) => ({
        ...prev,
        supported: feedback.supported,
        loading: false,
        error: feedback.message || 'Failed to disable notifications'
      }))
      if (!silent && feedback.supported) {
        setStatus({ type: 'error', message: feedback.message || 'Failed to disable notifications.' })
      }
    }
  }

  const handlePushToggle = () => {
    if (!webPushFeatureEnabled) {
      setStatus({ type: 'info', message: 'Push-уведомления отключены для этого окружения.' })
      return
    }
    if (!pushState.supported) {
      setStatus({ type: 'info', message: 'Для системных уведомлений нужен HTTPS с валидным SSL-сертификатом.' })
      return
    }
    if (pushState.enabled) {
      disablePushNotifications()
      return
    }
    if (pushState.permission === 'denied') {
      setStatus({ type: 'info', message: 'Allow notifications for this site in browser settings, then refresh the page.' })
      return
    }
    enablePushNotifications()
  }

  const handlePushConversationIntent = (conversationId) => {
    if (!conversationId || typeof conversationId !== 'string') return
    setPendingPushConversationId(conversationId)
    try {
      localStorage.setItem(PUSH_OPEN_STORAGE_KEY, conversationId)
    } catch (err) {
      // ignore storage errors
    }
  }

  const emitPresenceState = () => {
    const socket = socketRef.current
    if (!socket || !socket.connected || typeof document === 'undefined') return
    const focused = document.visibilityState === 'visible' && document.hasFocus()
    const activeConversationId = focused && viewRef.current === 'chats' && activeConversationRef.current
      ? activeConversationRef.current.id
      : null
    const previous = lastPresenceStateRef.current
    if (previous.focused === focused && previous.activeConversationId === activeConversationId) return
    lastPresenceStateRef.current = { focused, activeConversationId }
    socket.emit('presence:state', { focused, activeConversationId })
  }

  const readStoredView = (isAdmin) => {
    try {
      const stored = localStorage.getItem('ktk_view')
      const allowed = ['feed', 'chats', 'profile']
      if (isAdmin) allowed.push('admin')
      return stored && allowed.includes(stored) ? stored : 'feed'
    } catch (err) {
      return 'feed'
    }
  }

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ ok: false }))
    getRoles().then((data) => {
      setRoles(data.roles || [])
    }).catch(() => setRoles([]))
  }, [])

  useEffect(() => {
    const loadMe = async () => {
      try {
        const data = await getMe()
        setUser(data.user)
        setProfileForm({
          username: data.user.username || '',
          displayName: data.user.displayName || '',
          bio: data.user.bio || '',
          statusText: data.user.statusText || '',
          statusEmoji: data.user.statusEmoji || '',
          role: data.user.role || '',
          themeColor: data.user.themeColor || '#7a1f1d'
        })
        setView(readStoredView(Boolean(data.user && data.user.isAdmin)))
      } catch (err) {
        setUser(null)
      }
    }
    loadMe()
  }, [])

  useEffect(() => {
    if (!user || !user.username) {
      setMyTracks([])
      return
    }
    let cancelled = false
    const loadMyTracks = async () => {
      try {
        const data = await getProfileTracks(user.username)
        if (!cancelled) {
          setMyTracks(data.tracks || [])
        }
      } catch (err) {
        if (!cancelled) {
          setMyTracks([])
        }
      }
    }
    loadMyTracks()
    return () => {
      cancelled = true
    }
  }, [user ? user.username : null])

  useEffect(() => {
    if (!user) return
    const allowed = ['feed', 'chats', 'profile']
    if (user.isAdmin) allowed.push('admin')
    if (allowed.includes(view)) {
      try {
        localStorage.setItem('ktk_view', view)
      } catch (err) {
        // ignore storage errors
      }
    }
  }, [view, user])

  useEffect(() => {
    viewRef.current = view
    emitPresenceState()
  }, [view])

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState({
        supported: false,
        permission: 'unsupported',
        enabled: false,
        loading: false,
        error: ''
      })
      return
    }

    setPushState((prev) => ({
      ...prev,
      supported: true,
      permission: Notification.permission
    }))

    try {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = params.get('conversation')
      if (fromUrl) {
        handlePushConversationIntent(fromUrl)
        params.delete('conversation')
        const query = params.toString()
        const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash || ''}`
        window.history.replaceState({}, '', nextUrl)
      } else {
        const stored = localStorage.getItem(PUSH_OPEN_STORAGE_KEY)
        if (stored) {
          handlePushConversationIntent(stored)
        }
      }
    } catch (err) {
      // ignore url/storage errors
    }

    const handleServiceWorkerMessage = (event) => {
      const payload = event && event.data ? event.data : null
      if (!payload || payload.type !== 'push-open') return
      if (payload.conversationId) {
        handlePushConversationIntent(payload.conversationId)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [])

  useEffect(() => {
    syncPushState().catch(() => {})
  }, [user])

  useEffect(() => {
    if (!pendingPushConversationId || conversations.length === 0) return
    const targetConversation = conversations.find((item) => item.id === pendingPushConversationId)
    if (!targetConversation) return
    setActiveConversation(targetConversation)
    setView('chats')
    setPendingPushConversationId(null)
    try {
      localStorage.removeItem(PUSH_OPEN_STORAGE_KEY)
    } catch (err) {
      // ignore storage errors
    }
  }, [pendingPushConversationId, conversations])

  useEffect(() => {
    if (!user) return
    const loadPosts = async () => {
      try {
        const data = await getPosts()
        setPosts(data.posts || [])
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      }
    }
    loadPosts()

    const loadConversations = async () => {
      try {
        const data = await getConversations()
        const list = data.conversations || []
        setConversations(list)
        if (list.length === 0) {
          setActiveConversation(null)
          return
        }
        let nextActive = null
        if (activeConversation) {
          nextActive = list.find((item) => item.id === activeConversation.id) || null
        }
        if (!nextActive) {
          let storedId = null
          try {
            storedId = localStorage.getItem('ktk_active_conversation')
          } catch (err) {
            storedId = null
          }
          if (storedId) {
            nextActive = list.find((item) => item.id === storedId) || null
          }
        }
        if (!nextActive) {
          nextActive = list[0]
        }
        setActiveConversation(nextActive)
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      }
    }
    loadConversations()
  }, [user])

  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      setPollVoteLoadingByMessage({})
      return
    }
    setPollVoteLoadingByMessage({})
    setPollComposerOpen(false)
    setPollDraft(INITIAL_POLL_DRAFT)
    const loadMessages = async () => {
      try {
        const data = await getMessages(activeConversation.id)
        setMessages((data.messages || []).map(normalizeChatMessage))
        await clearConversationUnread(activeConversation.id)
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      }
    }
    loadMessages()
  }, [activeConversation])

  useEffect(() => {
    const previousView = previousViewRef.current
    const enteredChatView = previousView !== 'chats' && view === 'chats'
    previousViewRef.current = view

    if (!activeConversation) {
      previousMessageMetaRef.current = { conversationId: null, count: 0, lastMessageId: null }
      return
    }

    const conversationId = activeConversation.id
    const previous = previousMessageMetaRef.current
    const conversationChanged = previous.conversationId !== conversationId
    const listChanged = previous.count !== messages.length || previous.lastMessageId !== lastMessageId
    const hasNewMessage = !conversationChanged && messages.length > previous.count

    previousMessageMetaRef.current = { conversationId, count: messages.length, lastMessageId }

    if (view !== 'chats') return
    if (!enteredChatView && !conversationChanged && !listChanged) return

    const behavior = hasNewMessage ? 'smooth' : 'auto'
    const frame = window.requestAnimationFrame(() => {
      scrollChatToBottom(behavior)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeConversation ? activeConversation.id : null, lastMessageId, messages.length, view])

  useEffect(() => {
    draftsRef.current = draftsByConversation
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftsByConversation))
    } catch (err) {
      // ignore storage errors
    }
  }, [draftsByConversation])

  useEffect(() => {
    try {
      localStorage.setItem(FEED_BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarkedPostIds)))
    } catch (err) {
      // ignore storage errors
    }
  }, [bookmarkedPostIds])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_WALLPAPER_STORAGE_KEY, JSON.stringify(chatWallpaperByConversation))
    } catch (err) {
      // ignore storage errors
    }
  }, [chatWallpaperByConversation])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_ALIAS_STORAGE_KEY, JSON.stringify(chatAliasByConversation))
    } catch (err) {
      // ignore storage errors
    }
  }, [chatAliasByConversation])

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STICKERS_STORAGE_KEY, JSON.stringify(recentStickerIds.slice(0, 40)))
    } catch (err) {
      // ignore storage errors
    }
  }, [recentStickerIds])

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_GIFS_STORAGE_KEY, JSON.stringify(recentGifIds.slice(0, 40)))
    } catch (err) {
      // ignore storage errors
    }
  }, [recentGifIds])

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_EMOJIS_STORAGE_KEY, JSON.stringify(recentEmojiItems.slice(0, 30)))
    } catch (err) {
      // ignore storage errors
    }
  }, [recentEmojiItems])

  useEffect(() => {
    if (!user) {
      setMyStickers([])
      setMyGifs([])
      setRecentStickerIds([])
      setRecentGifIds([])
      setMediaPanelOpen(false)
      setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
      setMediaPanelQuery('')
      return
    }
    const loadMediaLibrary = async () => {
      try {
        const [stickerData, gifData] = await Promise.all([
          getMyStickers(),
          getMyGifs()
        ])
        setMyStickers(stickerData.stickers || [])
        setMyGifs(gifData.gifs || [])
      } catch (err) {
        setMyStickers([])
        setMyGifs([])
      }
    }
    loadMediaLibrary()
  }, [user ? user.id : null])

  useEffect(() => {
    const availableStickerIds = new Set(myStickers.map((sticker) => sticker.id))
    setRecentStickerIds((prev) => prev.filter((stickerId) => availableStickerIds.has(stickerId)))
  }, [myStickers])

  useEffect(() => {
    const availableGifIds = new Set(myGifs.map((gif) => gif.id))
    setRecentGifIds((prev) => prev.filter((gifId) => availableGifIds.has(gifId)))
  }, [myGifs])

  useEffect(() => {
    const allowed = new Set(EMOJI_PICKER_ITEMS.map((item) => item.value))
    setRecentEmojiItems((prev) => prev.filter((emoji) => allowed.has(emoji)))
  }, [])

  useEffect(() => {
    const handleHotkey = (event) => {
      if (!user || event.defaultPrevented) return
      const key = String(event.key || '').toLowerCase()
      const target = event.target
      const tagName = target && target.tagName ? target.tagName.toLowerCase() : ''
      const isTextInput = tagName === 'input' || tagName === 'textarea' || (target && target.isContentEditable)

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        if (isTextInput) return
        event.preventDefault()
        setView('chats')
        window.requestAnimationFrame(() => {
          if (chatSearchInputRef.current) {
            chatSearchInputRef.current.focus()
            chatSearchInputRef.current.select()
          }
        })
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === 'e') {
        if (view !== 'chats' || !activeConversation) return
        event.preventDefault()
        setMediaPanelOpen((prev) => !prev)
        if (!mediaPanelOpen) {
          setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
          setMediaPanelQuery('')
          window.requestAnimationFrame(() => {
            if (composerInputRef.current) composerInputRef.current.focus()
          })
        }
        return
      }

      if (key === 'escape' && mediaPanelOpen) {
        event.preventDefault()
        setMediaPanelOpen(false)
      }
    }
    window.addEventListener('keydown', handleHotkey)
    return () => window.removeEventListener('keydown', handleHotkey)
  }, [user, view, activeConversation, mediaPanelOpen])

  useEffect(() => {
    socketConnectionRef.current = socketConnection
  }, [socketConnection])

  useEffect(() => {
    if (user) return
    stopTyping()
    setSocketConnection('offline')
    setTypingByConversation({})
  }, [user])

  useEffect(() => {
    stopTyping()
    setMediaPanelOpen(false)
    setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
    setMediaPanelQuery('')
    setRevealedSpoilers(new Set())
    if (!activeConversation) {
      setMessageText('')
      setReplyMessage(null)
      clearMessageAttachment()
      return
    }
    const draft = draftsRef.current[activeConversation.id]
    setMessageText(typeof draft === 'string' ? draft : '')
    setReplyMessage(null)
    clearMessageAttachment()
  }, [activeConversation ? activeConversation.id : null])

  useEffect(() => {
    if (!mediaPanelOpen && mediaPanelQuery) {
      setMediaPanelQuery('')
    }
  }, [mediaPanelOpen, mediaPanelQuery])

  useEffect(() => {
    if (!chatShaking) return undefined
    const timer = setTimeout(() => setChatShaking(false), 460)
    return () => clearTimeout(timer)
  }, [chatShaking])

  useEffect(() => {
    if (!activeConversation) return
    const conversationId = activeConversation.id
    setDraftsByConversation((prev) => {
      const current = prev[conversationId] || ''
      if (messageText.trim()) {
        if (current === messageText) return prev
        return { ...prev, [conversationId]: messageText }
      }
      if (!Object.prototype.hasOwnProperty.call(prev, conversationId)) return prev
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
  }, [messageText, activeConversation ? activeConversation.id : null])

  useEffect(() => {
    try {
      localStorage.setItem('ktk_blocked_users', JSON.stringify(blockedUsers))
    } catch (err) {
      // ignore storage errors
    }
  }, [blockedUsers])

  useEffect(() => {
    blockedUsersRef.current = blockedUsers
  }, [blockedUsers])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    activeConversationRef.current = activeConversation
    emitPresenceState()
  }, [activeConversation])

  useEffect(() => {
    profileViewRef.current = profileView
  }, [profileView])

  useEffect(() => {
    if (!activeTrackId) return
    if (!profileTracks.some((track) => track.id === activeTrackId)) {
      setActiveTrackId(null)
    }
  }, [activeTrackId, profileTracks])

  useEffect(() => {
    if (view !== 'profile-view' && activeTrackId) {
      setActiveTrackId(null)
    }
  }, [view, activeTrackId])

  useEffect(() => {
    if (!user) return
    if (activeConversation && activeConversation.id) {
      try {
        localStorage.setItem('ktk_active_conversation', activeConversation.id)
      } catch (err) {
        // ignore storage errors
      }
    }
  }, [activeConversation, user])

  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null
    }
  }, [remoteStream])

  useEffect(() => {
    if (callState.status !== 'in-call' || !callState.startedAt) {
      setCallDuration(0)
      return
    }
    const interval = setInterval(() => {
      setCallDuration(Date.now() - callState.startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [callState.status, callState.startedAt])

  useEffect(() => {
    setChatSearchOpen(false)
    setChatSearchQuery('')
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
    setPostMenu(INITIAL_POST_MENU_STATE)
    setChatMenu(INITIAL_CHAT_MENU_STATE)
  }, [activeConversation ? activeConversation.id : null])

  useEffect(() => {
    if (!chatSearchOpen) {
      setChatSearchQuery('')
    }
  }, [chatSearchOpen])

  useEffect(() => {
    if (!user) return
    const loadPresence = async () => {
      try {
        const data = await getPresence()
        setOnlineUsers(data.online || [])
      } catch (err) {
        setOnlineUsers([])
      }
    }
    loadPresence()

    const token = getTokenValue()
    if (!token) {
      setSocketConnection('offline')
      return
    }
    setSocketConnection('connecting')
    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', { auth: { token } })
    socketRef.current = socket

    lastPresenceStateRef.current = { focused: null, activeConversationId: null }
    const handleSocketConnect = () => {
      const previous = socketConnectionRef.current
      setSocketConnection('connected')
      lastPresenceStateRef.current = { focused: null, activeConversationId: null }
      emitPresenceState()
      if (previous === 'disconnected') {
        pushToast({
          title: 'Connection restored',
          message: 'Realtime sync is active again.',
          type: 'info',
          duration: 2600
        })
      }
    }
    const handleSocketDisconnect = () => {
      setSocketConnection('disconnected')
      lastPresenceStateRef.current = { focused: null, activeConversationId: null }
      setTypingByConversation({})
      stopTyping()
      cleanupCall()
    }
    socket.on('connect', handleSocketConnect)
    socket.on('disconnect', handleSocketDisconnect)
    if (socket.connected) {
      handleSocketConnect()
    }

    const handleWindowPresence = () => {
      emitPresenceState()
    }
    window.addEventListener('focus', handleWindowPresence)
    window.addEventListener('blur', handleWindowPresence)
    document.addEventListener('visibilitychange', handleWindowPresence)

    socket.on('presence', (payload) => {
      setOnlineUsers((prev) => {
        const set = new Set(prev)
        if (payload.online) {
          set.add(payload.userId)
        } else {
          set.delete(payload.userId)
        }
        return Array.from(set)
      })
    })

    const getConversationPreview = (message) => getMessagePreviewLabel(message, 'Сообщение')

    const updateConversationPreview = (conversationId, message) => {
      if (!conversationId || !message) return
      const exists = conversationsRef.current.some((item) => item.id === conversationId)
      if (!exists) {
        getConversations()
          .then((data) => setConversations(data.conversations || []))
          .catch(() => {})
        return
      }
      setConversations((prev) => {
        const index = prev.findIndex((item) => item.id === conversationId)
        if (index === -1) return prev
        const updated = {
          ...prev[index],
          lastMessage: getMessagePreviewLabel(message, 'Сообщение'),
          lastAt: message.createdAt
        }
        const next = [...prev]
        next.splice(index, 1)
        return [updated, ...next]
      })
    }

    const handleIncomingMessage = (payload) => {
      if (!payload || !payload.message) return
      const message = normalizeChatMessage(payload.message)
      const isNudge = isNudgeMessage(message.body)
      const conversationId = payload.conversationId
      updateConversationPreview(conversationId, message)
      if (message.senderId) {
        removeTypingUser(conversationId, message.senderId)
      }
      const currentActive = activeConversationRef.current
      const isMine = message.senderId && user && message.senderId === user.id
      const isConversationOpen = viewRef.current === 'chats' && currentActive && conversationId === currentActive.id
      if (isConversationOpen) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === message.id)) return prev
          return [...prev, message]
        })
        if (!isMine) {
          clearConversationUnread(conversationId)
          playMessageSound()
          if (isNudge) {
            triggerChatShake()
          }
        }
        return
      }
      if (!isMine) {
        bumpConversationUnread(conversationId)
        const known = conversationsRef.current.find((item) => item.id === conversationId)
        const title = known
          ? (known.isGroup ? known.title : (known.other && (known.other.displayName || known.other.username)))
          : (message.senderDisplayName || message.senderUsername || 'Новое сообщение')
        const isPageVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'
        if (isPageVisible) {
          playNotificationSound()
          pushToast({
            title: title || message.senderDisplayName || message.senderUsername || 'New message',
            message: isNudge ? '👋 Тебя пнули' : getConversationPreview(message),
            type: 'message'
          })
        }
      }
    }

    const handleIncomingReaction = (payload) => {
      if (!payload || !payload.conversationId || !payload.messageId) return
      const currentActive = activeConversationRef.current
      if (!currentActive || payload.conversationId !== currentActive.id) return
      applyIncomingReactionDelta(payload)
    }

    const handleIncomingPollUpdate = (payload) => {
      if (!payload || !payload.conversationId || !payload.messageId) return
      const currentActive = activeConversationRef.current
      if (!currentActive || payload.conversationId !== currentActive.id) return
      applyIncomingPollUpdate(payload)
    }

    const handlePostNew = (payload) => {
      if (!payload || !payload.post) return
      const { post } = payload
      setPosts((prev) => (prev.some((item) => item.id === post.id) ? prev : [post, ...prev]))
      setProfilePosts((prev) => {
        if (prev.some((item) => item.id === post.id)) return prev
        const currentProfile = profileViewRef.current
        if (currentProfile && post.author && post.author.id === currentProfile.id) {
          return [post, ...prev]
        }
        return prev
      })
    }

    const handlePostDelete = (payload) => {
      if (!payload || !payload.postId) return
      setPosts((prev) => prev.filter((item) => item.id !== payload.postId))
      setProfilePosts((prev) => prev.filter((item) => item.id !== payload.postId))
    }

    const handlePostUpdate = (payload) => {
      if (!payload || !payload.post || !payload.post.id) return
      const updatedPost = payload.post
      setPosts((prev) => prev.map((item) => (item.id === updatedPost.id ? updatedPost : item)))
      setProfilePosts((prev) => prev.map((item) => (item.id === updatedPost.id ? updatedPost : item)))
    }

    const handleConversationRead = (payload) => {
      if (!payload || !payload.conversationId) return
      const currentActive = activeConversationRef.current
      if (!currentActive || payload.conversationId !== currentActive.id) return
      const lastReadAt = payload.lastReadAt ? new Date(payload.lastReadAt) : null
      if (!lastReadAt || Number.isNaN(lastReadAt.getTime())) return
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.senderId !== user.id || msg.readByOther) return msg
          if (!msg.createdAt) return msg
          const msgTime = new Date(msg.createdAt)
          if (Number.isNaN(msgTime.getTime())) return msg
          return msgTime <= lastReadAt ? { ...msg, readByOther: true } : msg
        })
      )
    }

    const handleTypingStart = (payload) => {
      if (!payload || !payload.conversationId || !payload.userId) return
      if (user && payload.userId === user.id) return
      setTypingByConversation((prev) => {
        const current = prev[payload.conversationId] || []
        if (current.includes(payload.userId)) return prev
        return { ...prev, [payload.conversationId]: [...current, payload.userId] }
      })
    }

    const handleTypingStop = (payload) => {
      if (!payload || !payload.conversationId || !payload.userId) return
      removeTypingUser(payload.conversationId, payload.userId)
    }

    socket.on('message', handleIncomingMessage)
    socket.on('message:reaction', handleIncomingReaction)
    socket.on('poll:update', handleIncomingPollUpdate)
    socket.on('conversation:read', handleConversationRead)
    socket.on('post:new', handlePostNew)
    socket.on('post:delete', handlePostDelete)
    socket.on('post:update', handlePostUpdate)
    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop', handleTypingStop)

    const handleCallOffer = ({ fromUserId, offer }) => {
      if (blockedUsersRef.current.includes(fromUserId)) {
        socket.emit('call:decline', { toUserId: fromUserId, reason: 'blocked' })
        return
      }
      if (callStateRef.current.status !== 'idle') {
        socket.emit('call:decline', { toUserId: fromUserId, reason: 'busy' })
        return
      }
      incomingOfferRef.current = offer
      pendingIceCandidatesRef.current = []
      setCallState({ status: 'incoming', withUserId: fromUserId, direction: 'incoming', startedAt: null })
    }

    const handleCallAnswer = async ({ fromUserId, answer }) => {
      if (callStateRef.current.withUserId !== fromUserId || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        await flushPendingIceCandidates()
        setCallState({ status: 'in-call', withUserId: fromUserId, direction: 'outgoing', startedAt: Date.now() })
      } catch (err) {
        setStatus({ type: 'error', message: 'Не удалось установить соединение.' })
        cleanupCall()
      }
    }

    const handleCallIce = async ({ fromUserId, candidate }) => {
      if (callStateRef.current.withUserId !== fromUserId || !candidate) return
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate)
        return
      }
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        // ignore ICE errors
      }
    }

    const handleCallDecline = ({ fromUserId, reason }) => {
      if (callStateRef.current.withUserId !== fromUserId) return
      cleanupCall()
      const message = reason === 'busy'
        ? 'Пользователь занят.'
        : reason === 'blocked'
          ? 'Пользователь недоступен.'
          : 'Звонок отклонен.'
      setStatus({ type: 'info', message })
    }

    const handleCallEnd = ({ fromUserId }) => {
      if (callStateRef.current.withUserId !== fromUserId) return
      cleanupCall()
      setStatus({ type: 'info', message: 'Звонок завершен.' })
    }

    const handleCallUnavailable = () => {
      if (callStateRef.current.status !== 'calling') return
      cleanupCall()
      setStatus({ type: 'info', message: 'Пользователь офлайн.' })
    }

    socket.on('call:offer', handleCallOffer)
    socket.on('call:answer', handleCallAnswer)
    socket.on('call:ice', handleCallIce)
    socket.on('call:decline', handleCallDecline)
    socket.on('call:end', handleCallEnd)
    socket.on('call:unavailable', handleCallUnavailable)

    return () => {
      window.removeEventListener('focus', handleWindowPresence)
      window.removeEventListener('blur', handleWindowPresence)
      document.removeEventListener('visibilitychange', handleWindowPresence)
      socket.off('connect', handleSocketConnect)
      socket.off('disconnect', handleSocketDisconnect)
      socket.off('message', handleIncomingMessage)
      socket.off('message:reaction', handleIncomingReaction)
      socket.off('poll:update', handleIncomingPollUpdate)
      socket.off('conversation:read', handleConversationRead)
      socket.off('post:new', handlePostNew)
      socket.off('post:delete', handlePostDelete)
      socket.off('post:update', handlePostUpdate)
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop', handleTypingStop)
      socket.off('call:offer', handleCallOffer)
      socket.off('call:answer', handleCallAnswer)
      socket.off('call:ice', handleCallIce)
      socket.off('call:decline', handleCallDecline)
      socket.off('call:end', handleCallEnd)
      socket.off('call:unavailable', handleCallUnavailable)
      socket.disconnect()
      if (socketRef.current === socket) {
        socketRef.current = null
      }
      setSocketConnection('offline')
    }
  }, [user])

  useEffect(() => {
    if (!contextMenu.open && !postMenu.open && !chatMenu.open) return
    const handleClose = () => {
      setContextMenu(INITIAL_MESSAGE_MENU_STATE)
      setPostMenu(INITIAL_POST_MENU_STATE)
      setChatMenu(INITIAL_CHAT_MENU_STATE)
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [contextMenu.open, postMenu.open, chatMenu.open])

  useLayoutEffect(() => {
    if (!contextMenu.open) return
    const menuNode = contextMenuRef.current
    if (!menuNode) return
    const menuWidth = menuNode.offsetWidth || 340
    const menuHeight = menuNode.offsetHeight || 240
    const anchorX = Number.isFinite(contextMenu.anchorX) ? contextMenu.anchorX : contextMenu.x
    const anchorY = Number.isFinite(contextMenu.anchorY) ? contextMenu.anchorY : contextMenu.y
    const nextPos = getMenuPosition(anchorX, anchorY, menuWidth, menuHeight)
    if (nextPos.x === contextMenu.x && nextPos.y === contextMenu.y) return
    setContextMenu((prev) => {
      if (!prev.open) return prev
      if (prev.x === nextPos.x && prev.y === nextPos.y) return prev
      return { ...prev, x: nextPos.x, y: nextPos.y }
    })
  }, [
    contextMenu.open,
    contextMenu.x,
    contextMenu.y,
    contextMenu.anchorX,
    contextMenu.anchorY,
    contextMenu.showAllReactions,
    contextMenu.message ? contextMenu.message.id : null
  ])

  useLayoutEffect(() => {
    if (!postMenu.open) return
    const menuNode = postMenuRef.current
    if (!menuNode) return
    const menuWidth = menuNode.offsetWidth || 260
    const menuHeight = menuNode.offsetHeight || 180
    const anchorX = Number.isFinite(postMenu.anchorX) ? postMenu.anchorX : postMenu.x
    const anchorY = Number.isFinite(postMenu.anchorY) ? postMenu.anchorY : postMenu.y
    const nextPos = getMenuPosition(anchorX, anchorY, menuWidth, menuHeight)
    if (nextPos.x === postMenu.x && nextPos.y === postMenu.y) return
    setPostMenu((prev) => {
      if (!prev.open) return prev
      if (prev.x === nextPos.x && prev.y === nextPos.y) return prev
      return { ...prev, x: nextPos.x, y: nextPos.y }
    })
  }, [
    postMenu.open,
    postMenu.x,
    postMenu.y,
    postMenu.anchorX,
    postMenu.anchorY,
    postMenu.post ? postMenu.post.id : null
  ])

  useLayoutEffect(() => {
    if (!chatMenu.open) return
    const menuNode = chatMenuRef.current
    if (!menuNode) return
    const menuWidth = menuNode.offsetWidth || 260
    const menuHeight = menuNode.offsetHeight || 220
    const anchorX = Number.isFinite(chatMenu.anchorX) ? chatMenu.anchorX : chatMenu.x
    const anchorY = Number.isFinite(chatMenu.anchorY) ? chatMenu.anchorY : chatMenu.y
    const nextPos = getMenuPosition(anchorX, anchorY, menuWidth, menuHeight)
    if (nextPos.x === chatMenu.x && nextPos.y === chatMenu.y) return
    setChatMenu((prev) => {
      if (!prev.open) return prev
      if (prev.x === nextPos.x && prev.y === nextPos.y) return prev
      return { ...prev, x: nextPos.x, y: nextPos.y }
    })
  }, [
    chatMenu.open,
    chatMenu.x,
    chatMenu.y,
    chatMenu.anchorX,
    chatMenu.anchorY,
    activeConversation ? activeConversation.id : null,
    isActiveConversationFavorite,
    isChatBlocked
  ])

  const handleRegister = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus({ type: 'info', message: '' })
    try {
      const data = await register(registerForm)
      setToken(data.token)
      setUser(data.user)
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || registerForm.role,
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      setView('feed')
      setStatus({ type: 'success', message: 'Регистрация завершена.' })
      setRegisterForm(initialRegister)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus({ type: 'info', message: '' })
    try {
      const data = await login(loginForm)
      setToken(data.token)
      setUser(data.user)
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || '',
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      setView('feed')
      setStatus({ type: 'success', message: 'С возвращением.' })
      setLoginForm(initialLogin)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSave = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus({ type: 'info', message: '' })
    try {
      const data = await updateMe(profileForm)
      setUser(data.user)
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || '',
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      setStatus({ type: 'success', message: 'Профиль обновлен.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const fileName = String(file.name || '').toLowerCase()
    const isGif = String(file.type || '').toLowerCase() === 'image/gif' || fileName.endsWith('.gif')
    if (isGif) {
      setLoading(true)
      try {
        const data = await uploadAvatar(file)
        setUser(data.user)
        setStatus({ type: 'success', message: 'GIF-аватар обновлен.' })
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
      event.target.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setAvatarSource(url)
    setAvatarZoom(AVATAR_ZOOM_MIN)
    setAvatarOffset({ x: 0, y: 0 })
    setDragStart(null)
    setAvatarModalOpen(true)
    event.target.value = ''
  }

  const handleAvatarSave = async () => {
    if (!avatarSource) return
    setLoading(true)
    try {
      const image = new Image()
      image.src = avatarSource
      await new Promise((resolve) => {
        image.onload = resolve
      })
      const size = 400
      const previewSize = 200
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / image.width, size / image.height) * clampAvatarZoom(avatarZoom)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const offsetX = (avatarOffset.x * size) / previewSize
      const offsetY = (avatarOffset.y * size) / previewSize
      const dx = (size - drawWidth) / 2 + offsetX
      const dy = (size - drawHeight) / 2 + offsetY
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      const data = await uploadAvatar(file)
      setUser(data.user)
      setStatus({ type: 'success', message: 'Аватар обновлен.' })
      setAvatarModalOpen(false)
      setAvatarSource('')
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarDragStart = (event) => {
    if (!avatarSource) return
    event.preventDefault()
    if (event.currentTarget && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragStart({
      x: event.clientX,
      y: event.clientY,
      offsetX: avatarOffset.x,
      offsetY: avatarOffset.y
    })
  }

  const handleAvatarDragMove = (event) => {
    if (!dragStart) return
    const nextX = dragStart.offsetX + (event.clientX - dragStart.x)
    const nextY = dragStart.offsetY + (event.clientY - dragStart.y)
    setAvatarOffset({ x: nextX, y: nextY })
  }

  const handleAvatarDragEnd = () => {
    if (dragStart) setDragStart(null)
  }

  const handleBannerChange = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const data = await uploadBanner(file)
      setUser(data.user)
      const fileName = String(file.name || '').toLowerCase()
      const isGif = String(file.type || '').toLowerCase() === 'image/gif' || fileName.endsWith('.gif')
      setStatus({ type: 'success', message: isGif ? 'GIF-обложка обновлена.' : 'Обложка обновлена.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
    event.target.value = ''
  }

  const openProfile = async (username) => {
    if (!username) return
    const previousView = viewRef.current
    if (previousView && previousView !== 'profile-view') {
      setProfileBackView(previousView)
    }
    setProfileView(null)
    setProfilePosts([])
    setProfileTracks([])
    setActiveTrackId(null)
    setView('profile-view')
    setProfileLoading(true)
    try {
      const [data, postsData, tracksData] = await Promise.all([
        getProfile(username),
        getProfilePosts(username),
        getProfileTracks(username)
      ])
      setProfileView(data.user)
      setProfilePosts(postsData.posts || [])
      setProfileTracks(tracksData.tracks || [])
      setActiveTrackId(null)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleToggleSubscription = async () => {
    if (!user || !profileView || profileView.id === user.id) return
    setLoading(true)
    try {
      const data = await toggleSubscription(profileView.username)
      if (data.user) {
        setProfileView(data.user)
      }
      setUser((prev) => {
        if (!prev) return prev
        const delta = data.subscribed ? 1 : -1
        return {
          ...prev,
          subscriptionsCount: Math.max(0, Number(prev.subscriptionsCount || 0) + delta)
        }
      })
      setStatus({
        type: 'success',
        message: data.subscribed ? 'Подписка оформлена.' : 'Подписка отменена.'
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleTrackSelect = (trackId) => {
    setActiveTrackId((prev) => (prev === trackId ? null : trackId))
  }

  const handleProfileTrackUpload = async (event) => {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    if (!trackFile) {
      setStatus({ type: 'error', message: 'Выберите аудио файл.' })
      return
    }
    setMusicUploadLoading(true)
    try {
      const data = await uploadProfileTrack(trackFile, {
        title: trackTitle.trim(),
        artist: trackArtist.trim()
      })
      if (data.track) {
        setMyTracks((prev) => [data.track, ...prev])
        setUser((prev) => (prev ? { ...prev, tracksCount: Number(prev.tracksCount || 0) + 1 } : prev))
        if (profileView && user && profileView.id === user.id) {
          setProfileTracks((prev) => [data.track, ...prev])
          setProfileView((prev) => (prev ? { ...prev, tracksCount: Number(prev.tracksCount || 0) + 1 } : prev))
        }
      }
      setTrackTitle('')
      setTrackArtist('')
      setTrackFile(null)
      setStatus({ type: 'success', message: 'Музыка добавлена в профиль.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setMusicUploadLoading(false)
    }
  }

  const handleDeleteTrack = async (trackId) => {
    if (!trackId) return
    try {
      await deleteProfileTrack(trackId)
      setMyTracks((prev) => prev.filter((track) => track.id !== trackId))
      setUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tracksCount: Math.max(0, Number(prev.tracksCount || 0) - 1)
        }
      })
      setProfileTracks((prev) => prev.filter((track) => track.id !== trackId))
      setProfileView((prev) => {
        if (!prev) return prev
        if (!user || prev.id !== user.id) return prev
        return {
          ...prev,
          tracksCount: Math.max(0, Number(prev.tracksCount || 0) - 1)
        }
      })
      if (activeTrackId === trackId) {
        setActiveTrackId(null)
      }
      setStatus({ type: 'success', message: 'Трек удален.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleLikePost = async (postId) => {
    try {
      const data = await likePost(postId)
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, liked: data.liked, likesCount: data.likesCount }
            : post
        )
      )
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, liked: data.liked, likesCount: data.likesCount }
            : post
        )
      )
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleRepostPost = async (postId) => {
    try {
      const data = await repostPost(postId)
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, reposted: data.reposted, repostsCount: data.repostsCount }
            : post
        )
      )
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, reposted: data.reposted, repostsCount: data.repostsCount }
            : post
        )
      )
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleToggleComments = async (postId) => {
    if (openComments === postId) {
      setOpenComments(null)
      return
    }
    try {
      const data = await getComments(postId)
      setCommentsByPost((prev) => ({ ...prev, [postId]: data.comments || [] }))
      setOpenComments(postId)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleAddComment = async (postId) => {
    const text = (commentDraft[postId] || '').trim()
    if (!text) return
    try {
      const data = await addComment(postId, text)
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment]
      }))
      setCommentDraft((prev) => ({ ...prev, [postId]: '' }))
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post
        )
      )
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post
        )
      )
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const loadAdminUsers = async (query) => {
    try {
      const data = await adminListUsers(query || '')
      setAdminUsers(data.users || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleLogout = async () => {
    stopTyping()
    clearMessageAttachment()
    endCall(false)
    await detachPushSubscriptionFromCurrentUser()
    try {
      localStorage.removeItem('ktk_view')
      localStorage.removeItem('ktk_active_conversation')
    } catch (err) {
      // ignore storage errors
    }
    setToken(null)
    setUser(null)
    setView('login')
    setActiveConversation(null)
    setMessages([])
    setMyStickers([])
    setMyGifs([])
    setRecentStickerIds([])
    setRecentGifIds([])
    setMediaPanelOpen(false)
    setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
    setMediaPanelQuery('')
    setPollComposerOpen(false)
    setPollDraft(INITIAL_POLL_DRAFT)
    setPollVoteLoadingByMessage({})
    setConversations([])
    setProfileView(null)
    setProfilePosts([])
    setProfileTracks([])
    setMyTracks([])
    setActiveTrackId(null)
    setProfileBackView('feed')
    setTrackTitle('')
    setTrackArtist('')
    setTrackFile(null)
    setPushState((prev) => ({
      ...prev,
      enabled: false,
      loading: false,
      error: ''
    }))
    setStatus({ type: 'info', message: 'Signed out.' })
  }

  const handleSearch = async (value) => {
    setSearchTerm(value)
    if (!value || value.trim().length < 3) {
      setSearchResults([])
      return
    }
    try {
      const data = await searchUsers(value.trim())
      setSearchResults(data.users || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleStartConversation = async (username) => {
    try {
      const data = await createConversation(username)
      const list = await getConversations()
      setConversations(list.conversations || [])
      if (data.conversation) {
        setActiveConversation(data.conversation)
        setView('chats')
      }
      setSearchTerm('')
      setSearchResults([])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleCreateGroup = async () => {
    const members = groupMembers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    if (groupTitle.trim().length < 3 || members.length < 2) {
      setStatus({ type: 'error', message: 'Название 3+ символа и минимум 2 участника.' })
      return
    }
    try {
      const data = await createGroupConversation(groupTitle.trim(), members)
      const list = await getConversations()
      setConversations(list.conversations || [])
      if (data.conversation) {
        setActiveConversation(data.conversation)
        setView('chats')
      }
      setGroupTitle('')
      setGroupMembers('')
      setStatus({ type: 'success', message: 'Групповой чат создан.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const rememberRecentSticker = (stickerId) => {
    if (!stickerId) return
    setRecentStickerIds((prev) => {
      const next = [stickerId, ...prev.filter((id) => id !== stickerId)]
      return next.slice(0, 40)
    })
  }

  const rememberRecentGif = (gifId) => {
    if (!gifId) return
    setRecentGifIds((prev) => {
      const next = [gifId, ...prev.filter((id) => id !== gifId)]
      return next.slice(0, 40)
    })
  }

  const handleStickerUpload = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const rawTitle = String(file.name || '').replace(/\.[^.]+$/, '').trim()
    const title = rawTitle.slice(0, 48)
    setStickersLoading(true)
    try {
      const data = await uploadSticker(file, title)
      if (data.sticker) {
        setMyStickers((prev) => [data.sticker, ...prev.filter((item) => item.id !== data.sticker.id)])
      }
      setStatus({ type: 'success', message: 'Стикер добавлен.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setStickersLoading(false)
      event.target.value = ''
    }
  }

  const handleStickerDelete = async (stickerId) => {
    if (!stickerId) return
    try {
      await deleteSticker(stickerId)
      setMyStickers((prev) => prev.filter((sticker) => sticker.id !== stickerId))
      setRecentStickerIds((prev) => prev.filter((id) => id !== stickerId))
      setStatus({ type: 'info', message: 'Стикер удален.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleSendSticker = async (sticker) => {
    if (!activeConversation || !sticker || !sticker.id) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    stopTyping(activeConversation.id)
    setLoading(true)
    try {
      const data = await sendSticker(activeConversation.id, sticker.id, {
        replyToMessageId: replyMessage && replyMessage.id ? replyMessage.id : ''
      })
      const createdMessage = normalizeChatMessage(data.message)
      setMessages((prev) => {
        if (createdMessage && prev.some((msg) => msg.id === createdMessage.id)) return prev
        return createdMessage ? [...prev, createdMessage] : prev
      })
      setReplyMessage(null)
      clearMessageAttachment()
      rememberRecentSticker(sticker.id)
      const list = await getConversations()
      setConversations(list.conversations || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleGifUpload = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const fileName = String(file.name || '').toLowerCase()
    const isGif = String(file.type || '').toLowerCase() === 'image/gif' || fileName.endsWith('.gif')
    if (!isGif) {
      setStatus({ type: 'error', message: 'Разрешены только GIF файлы.' })
      event.target.value = ''
      return
    }
    const rawTitle = String(file.name || '').replace(/\.[^.]+$/, '').trim()
    const title = rawTitle.slice(0, 48)
    setGifsLoading(true)
    try {
      const data = await uploadGif(file, title)
      if (data.gif) {
        setMyGifs((prev) => [data.gif, ...prev.filter((item) => item.id !== data.gif.id)])
      }
      setStatus({ type: 'success', message: 'GIF добавлен.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setGifsLoading(false)
      event.target.value = ''
    }
  }

  const handleGifDelete = async (gifId) => {
    if (!gifId) return
    try {
      await deleteGif(gifId)
      setMyGifs((prev) => prev.filter((gif) => gif.id !== gifId))
      setRecentGifIds((prev) => prev.filter((id) => id !== gifId))
      setStatus({ type: 'info', message: 'GIF удален.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleSendGif = async (gif) => {
    if (!activeConversation || !gif || !gif.id) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    stopTyping(activeConversation.id)
    setLoading(true)
    try {
      const data = await sendGif(activeConversation.id, gif.id, {
        replyToMessageId: replyMessage && replyMessage.id ? replyMessage.id : ''
      })
      const createdMessage = normalizeChatMessage(data.message)
      setMessages((prev) => {
        if (createdMessage && prev.some((msg) => msg.id === createdMessage.id)) return prev
        return createdMessage ? [...prev, createdMessage] : prev
      })
      setReplyMessage(null)
      clearMessageAttachment()
      rememberRecentGif(gif.id)
      const list = await getConversations()
      setConversations(list.conversations || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const updatePollOption = (index, value) => {
    setPollDraft((prev) => {
      if (!Array.isArray(prev.options) || index < 0 || index >= prev.options.length) return prev
      const nextOptions = [...prev.options]
      nextOptions[index] = value
      return { ...prev, options: nextOptions }
    })
  }

  const addPollOption = () => {
    setPollDraft((prev) => {
      if (!Array.isArray(prev.options) || prev.options.length >= POLL_OPTION_MAX_COUNT) return prev
      return { ...prev, options: [...prev.options, ''] }
    })
  }

  const removePollOption = (index) => {
    setPollDraft((prev) => {
      if (!Array.isArray(prev.options) || prev.options.length <= POLL_OPTION_MIN_COUNT) return prev
      if (index < 0 || index >= prev.options.length) return prev
      const nextOptions = prev.options.filter((_, optionIndex) => optionIndex !== index)
      return { ...prev, options: nextOptions }
    })
  }

  const closePollComposer = () => {
    setPollComposerOpen(false)
    setPollDraft(INITIAL_POLL_DRAFT)
  }

  const handleCreatePoll = async () => {
    if (!activeConversation) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    if (messageFile) {
      setStatus({ type: 'error', message: 'Уберите вложение перед отправкой опроса.' })
      return
    }
    if (replyMessage) {
      setStatus({ type: 'error', message: 'Опрос в ответ пока не поддерживается.' })
      return
    }

    const question = String(pollDraft.question || '').trim()
    const options = (Array.isArray(pollDraft.options) ? pollDraft.options : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    if (!question) {
      setStatus({ type: 'error', message: 'Введите вопрос опроса.' })
      return
    }
    if (options.length < POLL_OPTION_MIN_COUNT) {
      setStatus({ type: 'error', message: 'Добавьте минимум 2 варианта.' })
      return
    }
    if (options.length > POLL_OPTION_MAX_COUNT) {
      setStatus({ type: 'error', message: `Максимум ${POLL_OPTION_MAX_COUNT} вариантов.` })
      return
    }
    if (new Set(options.map((option) => option.toLowerCase())).size < POLL_OPTION_MIN_COUNT) {
      setStatus({ type: 'error', message: 'Варианты должны отличаться.' })
      return
    }

    stopTyping(activeConversation.id)
    setLoading(true)
    try {
      const data = await createPoll(activeConversation.id, {
        question,
        options,
        allowsMultiple: pollDraft.allowsMultiple === true
      })
      const createdMessage = normalizeChatMessage(data.message)
      setMessages((prev) => {
        if (createdMessage && prev.some((msg) => msg.id === createdMessage.id)) return prev
        return createdMessage ? [...prev, createdMessage] : prev
      })
      closePollComposer()
      const list = await getConversations()
      setConversations(list.conversations || [])
      setStatus({ type: 'success', message: 'Опрос отправлен.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handlePollVote = async (messageId, optionId) => {
    if (!messageId || !Number.isInteger(optionId)) return
    if (pollVoteLoadingByMessage[messageId]) return
    setPollVoteLoadingByMessage((prev) => ({ ...prev, [messageId]: true }))
    try {
      const data = await votePoll(messageId, optionId)
      if (data && data.poll) {
        setMessagePoll(messageId, data.poll)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setPollVoteLoadingByMessage((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, messageId)) return prev
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()
    if (!activeConversation) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    const rawText = messageText.trim()
    if (!rawText && !messageFile) return
    let text = rawText
    if (!messageFile && rawText.startsWith('/')) {
      const commandResult = resolveFunCommand(rawText)
      if (!commandResult.ok) {
        setStatus({ type: 'error', message: commandResult.error || 'Не удалось выполнить команду.' })
        return
      }
      text = commandResult.text
      if (!text) {
        setStatus({ type: 'error', message: 'Команда вернула пустой текст.' })
        return
      }
    }
    stopTyping(activeConversation.id)
    setLoading(true)
    try {
      const data = await sendMessage(activeConversation.id, text, messageFile, {
        attachmentKind: messageAttachmentKind,
        replyToMessageId: replyMessage && replyMessage.id ? replyMessage.id : ''
      })
      const createdMessage = normalizeChatMessage(data.message)
      setMessages((prev) => {
        if (createdMessage && prev.some((msg) => msg.id === createdMessage.id)) return prev
        return createdMessage ? [...prev, createdMessage] : prev
      })
      if (createdMessage && isNudgeMessage(createdMessage.body)) {
        triggerChatShake()
      }
      setMessageText('')
      setReplyMessage(null)
      clearMessageAttachment()
      setDraftsByConversation((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, activeConversation.id)) return prev
        const next = { ...prev }
        delete next[activeConversation.id]
        return next
      })
      const list = await getConversations()
      setConversations(list.conversations || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const clampValue = (value, min, max) => Math.min(Math.max(value, min), max)

  const getMenuPosition = (anchorX, anchorY, menuWidth, menuHeight, options = {}) => {
    const {
      padding = MENU_VIEWPORT_PADDING,
      gap = MENU_ANCHOR_GAP
    } = options
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight
    const minX = padding
    const minY = padding
    const maxX = Math.max(minX, viewportWidth - menuWidth - padding)
    const maxY = Math.max(minY, viewportHeight - menuHeight - padding)

    const safeAnchorX = clampValue(
      Number.isFinite(anchorX) ? anchorX : viewportWidth / 2,
      0,
      viewportWidth
    )
    const safeAnchorY = clampValue(
      Number.isFinite(anchorY) ? anchorY : viewportHeight / 2,
      0,
      viewportHeight
    )

    const rightSpace = viewportWidth - safeAnchorX - padding
    const leftSpace = safeAnchorX - padding
    const bottomSpace = viewportHeight - safeAnchorY - padding
    const topSpace = safeAnchorY - padding

    const openRight = rightSpace >= menuWidth + gap || (
      rightSpace < menuWidth + gap &&
      (leftSpace < menuWidth + gap ? rightSpace >= leftSpace : false)
    )
    const openDown = bottomSpace >= menuHeight + gap || (
      bottomSpace < menuHeight + gap &&
      (topSpace < menuHeight + gap ? bottomSpace >= topSpace : false)
    )

    const rawX = openRight ? safeAnchorX + gap : safeAnchorX - menuWidth - gap
    const rawY = openDown ? safeAnchorY + gap : safeAnchorY - menuHeight - gap

    return {
      x: Math.round(clampValue(rawX, minX, maxX)),
      y: Math.round(clampValue(rawY, minY, maxY))
    }
  }

  const togglePostBookmark = (postId) => {
    if (!postId) return
    setBookmarkedPostIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  const resetFeedFilters = () => {
    setFeedFilter(FEED_FILTERS.all)
    setFeedQuery('')
    setActiveFeedTag('')
  }

  const applyStatusEmojiPreset = (emoji) => {
    setProfileForm((prev) => ({ ...prev, statusEmoji: emoji }))
  }

  const applyRandomStatusEmoji = () => {
    const next = STATUS_EMOJI_PRESETS[Math.floor(Math.random() * STATUS_EMOJI_PRESETS.length)] || ''
    setProfileForm((prev) => ({ ...prev, statusEmoji: next }))
  }

  const setChatWallpaper = (wallpaperValue, { closeMenu = false } = {}) => {
    if (!activeConversation) return
    const normalized = CHAT_WALLPAPERS.some((item) => item.value === wallpaperValue) ? wallpaperValue : 'default'
    setChatWallpaperByConversation((prev) => {
      const next = { ...prev }
      if (normalized === 'default') {
        delete next[activeConversation.id]
      } else {
        next[activeConversation.id] = normalized
      }
      return next
    })
    if (closeMenu) {
      setChatMenu(INITIAL_CHAT_MENU_STATE)
    }
    const selected = CHAT_WALLPAPERS.find((item) => item.value === normalized) || CHAT_WALLPAPERS[0]
    setStatus({ type: 'info', message: `Тема чата: ${selected.label}` })
  }

  const cycleChatWallpaper = () => {
    if (!activeConversation) return
    const currentIndex = CHAT_WALLPAPERS.findIndex((item) => item.value === activeChatWallpaper.value)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % CHAT_WALLPAPERS.length : 0
    setChatWallpaper(CHAT_WALLPAPERS[nextIndex].value)
  }

  const setActiveChatAlias = () => {
    if (!activeConversation || activeConversation.isGroup) return
    const currentAlias = normalizeChatAlias(chatAliasByConversation[activeConversation.id])
    const baseName = activeConversation.other?.displayName || activeConversation.other?.username || ''
    const typed = window.prompt(
      'Локальный ник для этого чата (виден только вам). Оставьте пустым, чтобы сбросить.',
      currentAlias || baseName
    )
    if (typed === null) return
    const normalized = normalizeChatAlias(typed)
    setChatAliasByConversation((prev) => {
      const next = { ...prev }
      if (!normalized) {
        delete next[activeConversation.id]
      } else {
        next[activeConversation.id] = normalized
      }
      return next
    })
    setChatMenu(INITIAL_CHAT_MENU_STATE)
    if (normalized) {
      setStatus({ type: 'success', message: `Локальный ник: ${normalized}` })
    } else {
      setStatus({ type: 'info', message: 'Локальный ник удален.' })
    }
  }

  const getElementAnchor = (element, options = {}) => {
    if (!element || typeof element.getBoundingClientRect !== 'function') return null
    const { preferHorizontal = 'right' } = options
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight
    const rect = element.getBoundingClientRect()
    const edgeOffset = 8
    const rawX = preferHorizontal === 'left' ? rect.left + edgeOffset : rect.right - edgeOffset
    const rawY = rect.top + (rect.height / 2)
    return {
      anchorX: clampValue(rawX, 0, viewportWidth),
      anchorY: clampValue(rawY, 0, viewportHeight)
    }
  }

  const getMenuAnchorFromEvent = (event, options = {}) => {
    const {
      fallbackElement = null,
      preferHorizontal = 'right'
    } = options
    const pointX = Number(event && event.clientX)
    const pointY = Number(event && event.clientY)
    if (Number.isFinite(pointX) && Number.isFinite(pointY) && (pointX !== 0 || pointY !== 0)) {
      return { anchorX: pointX, anchorY: pointY }
    }
    const preferredAnchor = getElementAnchor(fallbackElement, { preferHorizontal })
    if (preferredAnchor) return preferredAnchor
    const target = event && event.target && typeof event.target.closest === 'function'
      ? event.target.closest('.message-bubble')
      : null
    const bubbleAnchor = getElementAnchor(target, { preferHorizontal })
    if (bubbleAnchor) return bubbleAnchor
    if (event && event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function') {
      const rect = event.currentTarget.getBoundingClientRect()
      return {
        anchorX: rect.left + (rect.width / 2),
        anchorY: rect.top + (rect.height / 2)
      }
    }
    return { anchorX: window.innerWidth / 2, anchorY: window.innerHeight / 2 }
  }

  const toggleContextMenuReactions = () => {
    setContextMenu((prev) => {
      if (!prev.open) return prev
      return { ...prev, showAllReactions: !prev.showAllReactions }
    })
  }

  const handleMessageReaction = async (msg, emoji, { closeMenu = false } = {}) => {
    if (!msg || !msg.id || !emoji) return
    try {
      const data = await toggleMessageReaction(msg.id, emoji)
      const socket = socketRef.current
      if (!socket || !socket.connected) {
        setMessageReactions(msg.id, data.reactions || [])
      }
      if (closeMenu) {
        setContextMenu(INITIAL_MESSAGE_MENU_STATE)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const openMessageMenu = (event, msg) => {
    if (!activeConversation) return
    if (editingMessageId === msg.id) return
    event.preventDefault()
    event.stopPropagation()
    setPostMenu(INITIAL_POST_MENU_STATE)
    setChatMenu(INITIAL_CHAT_MENU_STATE)
    const bubbleNode = event && event.target && typeof event.target.closest === 'function'
      ? event.target.closest('.message-bubble')
      : null
    const { anchorX, anchorY } = getMenuAnchorFromEvent(event, {
      fallbackElement: bubbleNode,
      preferHorizontal: msg.senderId === user.id ? 'right' : 'left'
    })
    const pos = getMenuPosition(anchorX, anchorY, 340, 240)
    setContextMenu({
      open: true,
      x: pos.x,
      y: pos.y,
      anchorX,
      anchorY,
      message: msg,
      showAllReactions: false
    })
  }

  const startEditMessage = (msg) => {
    if (!msg || msg.poll) return
    setEditingMessageId(msg.id)
    setEditingMessageText(msg.body || '')
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const handleDeleteMessage = (msg) => {
    deleteMessage(msg.id)
      .then(() => {
        setReplyMessage((prev) => (prev && prev.id === msg.id ? null : prev))
        setMessages((prev) => prev.filter((m) => m.id !== msg.id))
        if (pinnedMessage && pinnedMessage.id === msg.id && activeConversation) {
          setPinnedByConversation((prev) => {
            const next = { ...prev }
            delete next[activeConversation.id]
            return next
          })
        }
      })
      .catch((err) => setStatus({ type: 'error', message: err.message }))
      .finally(() => setContextMenu(INITIAL_MESSAGE_MENU_STATE))
  }

  const openPostMenu = (event, post) => {
    if (!post || editingPostId === post.id) return
    if (event.target && event.target.closest('input, textarea')) return
    event.preventDefault()
    event.stopPropagation()
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
    setChatMenu(INITIAL_CHAT_MENU_STATE)
    const cardNode = event && event.target && typeof event.target.closest === 'function'
      ? event.target.closest('.feed-card')
      : null
    const { anchorX, anchorY } = getMenuAnchorFromEvent(event, {
      fallbackElement: cardNode,
      preferHorizontal: 'right'
    })
    const pos = getMenuPosition(anchorX, anchorY, 260, 180)
    setPostMenu({
      open: true,
      x: pos.x,
      y: pos.y,
      anchorX,
      anchorY,
      post
    })
  }

  const startEditPost = (post) => {
    setEditingPostId(post.id)
    setEditingPostText(post.body || '')
    setPostMenu(INITIAL_POST_MENU_STATE)
  }

  const handleDeletePost = (post) => {
    deletePost(post.id)
      .then(() => {
        setPosts((prev) => prev.filter((p) => p.id !== post.id))
        setProfilePosts((prev) => prev.filter((p) => p.id !== post.id))
        if (editingPostId === post.id) {
          setEditingPostId(null)
        }
      })
      .catch((err) => setStatus({ type: 'error', message: err.message }))
      .finally(() => setPostMenu(INITIAL_POST_MENU_STATE))
  }

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: rtcIceServers
    })
    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return
      socketRef.current.emit('call:ice', { toUserId: targetUserId, candidate: event.candidate })
    }
    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) setRemoteStream(stream)
    }
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearCallDisconnectTimer()
        return
      }
      if (pc.iceConnectionState === 'disconnected') {
        clearCallDisconnectTimer()
        callDisconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current !== pc) return
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            cleanupCall()
          }
        }, 8000)
        return
      }
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        cleanupCall()
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        clearCallDisconnectTimer()
        return
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupCall()
      }
    }
    pcRef.current = pc
    return pc
  }

  const cleanupCall = () => {
    clearCallDisconnectTimer()
    if (pcRef.current) {
      pcRef.current.onicecandidate = null
      pcRef.current.ontrack = null
      pcRef.current.oniceconnectionstatechange = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    incomingOfferRef.current = null
    pendingIceCandidatesRef.current = []
    setRemoteStream(null)
    setCallState({ status: 'idle', withUserId: null, direction: null, startedAt: null })
  }

  const endCall = (notify = true) => {
    const targetId = callStateRef.current.withUserId
    if (notify && socketRef.current && targetId) {
      socketRef.current.emit('call:end', { toUserId: targetId })
    }
    cleanupCall()
  }

  const answerCall = async () => {
    const fromUserId = callStateRef.current.withUserId
    if (!fromUserId || !incomingOfferRef.current) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus({ type: 'error', message: 'Браузер не поддерживает звонки.' })
      declineCall('declined')
      return
    }
    if (!socketRef.current) {
      setStatus({ type: 'error', message: 'Нет соединения с сервером.' })
      declineCall('declined')
      return
    }
    try {
      setCallState({ status: 'connecting', withUserId: fromUserId, direction: 'incoming', startedAt: null })
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      const pc = createPeerConnection(fromUserId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current))
      await flushPendingIceCandidates()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef.current.emit('call:answer', { toUserId: fromUserId, answer })
      setCallState({ status: 'in-call', withUserId: fromUserId, direction: 'incoming', startedAt: Date.now() })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось принять звонок.' })
      endCall(true)
    }
  }

  const declineCall = (reason = 'declined') => {
    const fromUserId = callStateRef.current.withUserId
    if (socketRef.current && fromUserId) {
      socketRef.current.emit('call:decline', { toUserId: fromUserId, reason })
    }
    cleanupCall()
  }

  const handleCall = async () => {
    if (!activeConversation || activeConversation.isGroup) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus({ type: 'error', message: 'Браузер не поддерживает звонки.' })
      return
    }
    if (!socketRef.current) {
      setStatus({ type: 'error', message: 'Нет соединения с сервером.' })
      return
    }
    const targetId = activeConversation.other.id
    if (callStateRef.current.status !== 'idle') {
      if (callStateRef.current.withUserId === targetId) {
        endCall(true)
      } else {
        setStatus({ type: 'info', message: 'Сначала завершите текущий звонок.' })
      }
      return
    }
    try {
      setCallState({ status: 'calling', withUserId: targetId, direction: 'outgoing', startedAt: null })
      pendingIceCandidatesRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      const pc = createPeerConnection(targetId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current.emit('call:offer', { toUserId: targetId, offer })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось начать звонок.' })
      cleanupCall()
    }
  }

  const openChatMenu = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
    setPostMenu(INITIAL_POST_MENU_STATE)
    const { anchorX, anchorY } = getMenuAnchorFromEvent(event, { preferHorizontal: 'right' })
    const pos = getMenuPosition(anchorX, anchorY, 280, 420)
    setChatMenu({
      open: true,
      x: pos.x,
      y: pos.y,
      anchorX,
      anchorY
    })
  }

  const toggleChatBlock = () => {
    if (!activeConversation || activeConversation.isGroup) return
    const targetId = activeConversation.other.id
    setBlockedUsers((prev) => {
      const exists = prev.includes(targetId)
      const next = exists ? prev.filter((id) => id !== targetId) : [...prev, targetId]
      return next
    })
    setStatus({
      type: 'info',
      message: isChatBlocked ? 'Пользователь разблокирован.' : 'Пользователь заблокирован.'
    })
    setChatMenu(INITIAL_CHAT_MENU_STATE)
  }

  const toggleConversationFavorite = async (conversationId = null, { closeMenu = false } = {}) => {
    const targetConversationId = conversationId || (activeConversation ? activeConversation.id : null)
    if (!targetConversationId) return

    const targetConversation = conversationsRef.current.find((item) => item.id === targetConversationId)
    if (!targetConversation) return

    const nextFavorite = targetConversation.isFavorite !== true
    setConversations((prev) => prev.map((item) => (
      item.id === targetConversationId ? { ...item, isFavorite: nextFavorite } : item
    )))
    setActiveConversation((prev) => (
      prev && prev.id === targetConversationId ? { ...prev, isFavorite: nextFavorite } : prev
    ))

    if (closeMenu) {
      setChatMenu(INITIAL_CHAT_MENU_STATE)
    }

    try {
      const data = await setConversationFavorite(targetConversationId, nextFavorite)
      const serverFavorite = typeof data.isFavorite === 'boolean' ? data.isFavorite : nextFavorite
      setConversations((prev) => prev.map((item) => (
        item.id === targetConversationId ? { ...item, isFavorite: serverFavorite } : item
      )))
      setActiveConversation((prev) => (
        prev && prev.id === targetConversationId ? { ...prev, isFavorite: serverFavorite } : prev
      ))
      setStatus({
        type: 'info',
        message: serverFavorite ? 'Диалог добавлен в избранное.' : 'Диалог убран из избранного.'
      })
    } catch (err) {
      setConversations((prev) => prev.map((item) => (
        item.id === targetConversationId ? { ...item, isFavorite: targetConversation.isFavorite === true } : item
      )))
      setActiveConversation((prev) => (
        prev && prev.id === targetConversationId
          ? { ...prev, isFavorite: targetConversation.isFavorite === true }
          : prev
      ))
      setStatus({ type: 'error', message: err.message })
    }
  }

  const getMessagePreview = (msg) => getMessagePreviewLabel(msg, 'Сообщение')

  const getReplyAuthorLabel = (msg) => {
    if (!msg) return 'Пользователь'
    if (user && msg.senderId === user.id) return 'Вы'
    return msg.senderDisplayName || msg.senderUsername || 'Пользователь'
  }

  const startReplyMessage = (msg) => {
    if (!msg || !msg.id) return
    setReplyMessage({
      id: msg.id,
      body: msg.body || '',
      attachmentUrl: msg.attachmentUrl || null,
      attachmentMime: msg.attachmentMime || null,
      attachmentKind: msg.attachmentKind || null,
      senderId: msg.senderId || null,
      senderUsername: msg.senderUsername || null,
      senderDisplayName: msg.senderDisplayName || null,
      senderAvatarUrl: msg.senderAvatarUrl || null
    })
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const togglePinMessage = (msg) => {
    if (!activeConversation) return
    setPinnedByConversation((prev) => {
      const next = { ...prev }
      const current = next[activeConversation.id]
      if (current && current.id === msg.id) {
        delete next[activeConversation.id]
      } else {
        next[activeConversation.id] = msg
      }
      return next
    })
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const handleCopyMessage = async (msg) => {
    if (!msg.body) return
    try {
      await navigator.clipboard.writeText(msg.body)
      setStatus({ type: 'success', message: 'Текст скопирован.' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось скопировать текст.' })
    }
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const isOwnRepostPost = (post) => {
    if (!post || !post.repostOf) return false
    if (!user) return false
    return post.author && post.author.id === user.id
  }

  const handleRepostFromMenu = async (post) => {
    if (isOwnRepostPost(post)) {
      setStatus({ type: 'error', message: 'Нельзя репостить свой репост.' })
      setPostMenu(INITIAL_POST_MENU_STATE)
      return
    }
    await handleRepostPost(post.id)
    setPostMenu(INITIAL_POST_MENU_STATE)
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()
    if (!postText.trim() && !postFile) return
    setLoading(true)
    try {
      const data = await createPost(postText.trim(), postFile)
      if (data.post) {
        setPosts((prev) => (prev.some((item) => item.id === data.post.id) ? prev : [data.post, ...prev]))
      }
      setPostText('')
      setPostFile(null)
      setPostPreview('')
      setStatus({ type: 'success', message: 'Пост опубликован.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const isOnline = (userId) => onlineUsers.includes(userId)
  const socketStatusText = socketConnection === 'connecting'
    ? 'Connecting to chat server...'
    : socketConnection === 'disconnected'
      ? 'Connection lost. Reconnecting...'
      : socketConnection === 'offline'
        ? 'Realtime connection is offline.'
        : ''
  const socketStatusClass = socketConnection === 'connecting'
    ? 'chat-connection connecting'
    : socketConnection === 'disconnected'
      ? 'chat-connection disconnected'
      : 'chat-connection offline'
  const pushButtonLabel = !pushState.supported
    ? 'Push unsupported'
    : pushState.loading
      ? 'Updating...'
      : pushState.enabled
        ? 'Notifications on'
        : pushState.permission === 'denied'
          ? 'Notifications blocked'
          : 'Enable notifications'
  const pushButtonClass = `push-toggle ${pushState.enabled ? 'enabled' : ''}`.trim()
  const pushButtonDisabled = !user || !pushState.supported || pushState.loading
  const canSubscribeProfile = Boolean(user && profileView && user.id !== profileView.id)
  const profileFollowers = Number(profileView && profileView.subscribersCount ? profileView.subscribersCount : 0)
  const profileFollowing = Number(profileView && profileView.subscriptionsCount ? profileView.subscriptionsCount : 0)
  const profileTracksCount = Number(profileView && profileView.tracksCount ? profileView.tracksCount : profileTracks.length)
  const profileJoinedAt = profileView ? formatDate(profileView.createdAt) : ''

  return (
    <div className="page">
      <main className="content">
        <div className="topbar">
          <div className="brand-inline">
            <div className="brand-icon">КТК</div>
            <div>
              <h1>Messenger</h1>
              <p>Современный чат колледжа.</p>
            </div>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title="Сменить тему"
            >
              <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
              {theme === 'dark' ? 'Тёмная' : 'Светлая'}
            </button>
            <button
              type="button"
              className={pushButtonClass}
              onClick={handlePushToggle}
              disabled={pushButtonDisabled}
              title={pushState.permission === 'denied' ? 'Allow notifications in browser settings' : 'Manage notifications'}
            >
              {pushButtonLabel}
            </button>
            {user ? (
              <>
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                title="Выйти"
              >
                <span>?</span>
                Выйти
              </button>
              <button
                type="button"
                className="user-pill"
                onClick={() => setView('profile')}
                title="Открыть профиль"
              >
                <div className="avatar">
                  {user.avatarUrl ? (
                    <img src={resolveMediaUrl(user.avatarUrl)} alt="avatar" />
                  ) : (
                    (user.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="name">{user.displayName || user.username}</div>
                  <span>@{user.username}</span>
                  {userMoodLabel && <small className="profile-mood-chip">{userMoodLabel}</small>}
                </div>
              </button>
              </>
            ) : null}
          </div>
        </div>

        {user && (
          <div className="icon-rail">
            <button
              type="button"
              className={view === 'feed' ? 'active' : ''}
              onClick={() => setView('feed')}
              title="Лента"
            >
              {icons.feed}
            </button>
            <button
              type="button"
              className={view === 'chats' ? 'active' : ''}
              onClick={() => setView('chats')}
              title="Чаты"
              aria-label={unreadMessagesCount > 0 ? `Чаты, непрочитанных сообщений: ${unreadMessagesCount}` : 'Чаты'}
            >
              {icons.chats}
              {unreadMessagesCount > 0 && (
                <span className="icon-rail-badge">{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</span>
              )}
            </button>
            {user.isAdmin && (
              <button
                type="button"
                className={view === 'admin' ? 'active' : ''}
                onClick={() => {
                  setView('admin')
                  loadAdminUsers(adminQuery)
                }}
                title="Админ"
              >
                {icons.admin}
              </button>
            )}
            <button
              type="button"
              className={view === 'profile' ? 'active' : ''}
              onClick={() => setView('profile')}
              title="Профиль"
            >
              {icons.profile}
            </button>
          </div>
        )}

        {pushState.error ? (
          <div className="alert error">{pushState.error}</div>
        ) : null}

        {status.message ? (
          <div className={`alert ${status.type}`}>{status.message}</div>
        ) : null}
        {user && socketConnection !== 'connected' && socketStatusText ? (
          <div className={socketStatusClass}>{socketStatusText}</div>
        ) : null}

        {toasts.length > 0 && (
          <div className="toast-stack">
            {toasts.map((toast) => (
              <div key={toast.id} className={`toast ${toast.type || ''}`}>
                <div>
                  {toast.title && <strong>{toast.title}</strong>}
                  {toast.message && <span>{toast.message}</span>}
                </div>
                <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Закрыть">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!user && (
          <div className="auth-toggle">
            <button
              type="button"
              className={view === 'login' ? 'active' : ''}
              onClick={() => setView('login')}
            >
              Вход
            </button>
            <button
              type="button"
              className={view === 'register' ? 'active' : ''}
              onClick={() => setView('register')}
            >
              Регистрация
            </button>
          </div>
        )}

        {view === 'login' && !user && (
          <form className="panel" onSubmit={handleLogin}>
            <h2>Вход</h2>
            <p className="subtitle">Можно логин или username.</p>
            <label>
              Логин или username
              <input
                type="text"
                value={loginForm.login}
                onChange={(event) => setLoginForm({ ...loginForm, login: event.target.value })}
                placeholder="student_ktk"
                required
                minLength={3}
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="••••••"
                required
                minLength={6}
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>Войти</button>
          </form>
        )}

        {view === 'register' && !user && (
          <form className="panel" onSubmit={handleRegister}>
            <h2>Создать аккаунт</h2>
            <p className="subtitle">Выбери роль и будь на связи.</p>
            <label>
              Логин
              <input
                type="text"
                value={registerForm.login}
                onChange={(event) => setRegisterForm({ ...registerForm, login: event.target.value })}
                placeholder="ktk2026"
                required
                minLength={3}
              />
            </label>
            <label>
              Username (уникальный)
              <input
                type="text"
                value={registerForm.username}
                onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
                placeholder="cool_student"
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]{3,}"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                placeholder="••••••"
                required
                minLength={6}
              />
            </label>
            <label>
              Специализация
              <select
                value={registerForm.role}
                onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <button className="primary" type="submit" disabled={loading}>Зарегистрироваться</button>
          </form>
        )}

        {view === 'chats' && user && (
          <div className="chat-layout">
            <section className="chat-list">
              <div className="chat-search">
                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Найти по username... (Ctrl+K)"
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleStartConversation(item.username)}
                      >
                        <span className="avatar">{item.username[0].toUpperCase()}</span>
                        <div>
                          <strong>{item.displayName || item.username}</strong>
                          <small>@{item.username}</small>
                        </div>
                        <span className={`presence ${item.online ? 'online' : ''}`}></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="chat-filters" role="tablist" aria-label="Фильтры чатов">
                <button
                  type="button"
                  className={`chat-filter ${chatListFilter === CHAT_LIST_FILTERS.all ? 'active' : ''}`}
                  onClick={() => setChatListFilter(CHAT_LIST_FILTERS.all)}
                >
                  Все
                  <span>{conversations.length}</span>
                </button>
                <button
                  type="button"
                  className={`chat-filter ${chatListFilter === CHAT_LIST_FILTERS.unread ? 'active' : ''}`}
                  onClick={() => setChatListFilter(CHAT_LIST_FILTERS.unread)}
                >
                  Непрочитанные
                  <span>{unreadConversationCount}</span>
                </button>
                <button
                  type="button"
                  className={`chat-filter ${chatListFilter === CHAT_LIST_FILTERS.favorites ? 'active' : ''}`}
                  onClick={() => setChatListFilter(CHAT_LIST_FILTERS.favorites)}
                >
                  Избранные
                  <span>{favoriteConversationCount}</span>
                </button>
              </div>

              <div className={`group-create ${groupOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="group-toggle"
                  onClick={() => setGroupOpen((prev) => !prev)}
                >
                  <span>?</span>
                  <div>
                    <strong>Новый групповой чат</strong>
                    <small>Нажми, чтобы создать группу</small>
                  </div>
                </button>
                {groupOpen && (
                  <div className="group-form">
                    <input
                      type="text"
                      value={groupTitle}
                      onChange={(event) => setGroupTitle(event.target.value)}
                      placeholder="Название группы"
                    />
                    <input
                      type="text"
                      value={groupMembers}
                      onChange={(event) => setGroupMembers(event.target.value)}
                      placeholder="Usernames через запятую"
                    />
                    <button className="primary" type="button" onClick={handleCreateGroup}>Создать</button>
                  </div>
                )}
              </div>

              <div className="chat-items">
                {conversations.length === 0 && (
                  <div className="empty">Пока нет диалогов. Найди пользователя по username.</div>
                )}
                {conversations.length > 0 && visibleConversations.length === 0 && (
                  <div className="empty">
                    {chatListFilter === CHAT_LIST_FILTERS.unread
                      ? 'Непрочитанных диалогов пока нет.'
                      : 'Избранных диалогов пока нет.'}
                  </div>
                )}
                {visibleConversations.map((conv) => {
                  const unreadCount = Number(conv.unreadCount || 0)
                  const isActive = activeConversation && conv.id === activeConversation.id
                  const isFavorite = favoriteConversationSet.has(conv.id)
                  const conversationTitle = getConversationDisplayName(conv, chatAliasByConversation)
                  const draftText = typeof draftsByConversation[conv.id] === 'string' ? draftsByConversation[conv.id].trim() : ''
                  const hasDraft = draftText.length > 0
                  const draftPreview = hasDraft
                    ? `Draft: ${draftText.length > 80 ? `${draftText.slice(0, 77)}...` : draftText}`
                    : ''
                  return (
                    <button
                      type="button"
                      key={conv.id}
                      className={`chat-item ${isActive ? 'active' : ''} ${!isActive && unreadCount > 0 ? 'unread' : ''} ${isFavorite ? 'favorite' : ''}`.trim()}
                      onClick={() => setActiveConversation(conv)}
                    >
                      <span className="avatar">
                        {conv.isGroup
                          ? (conv.title || 'G')[0].toUpperCase()
                          : (conversationTitle || 'U')[0].toUpperCase()}
                      </span>
                      <div className="chat-meta">
                        <div className="chat-title-row">
                          <div className="chat-title">
                            {conversationTitle}
                          </div>
                          {isFavorite && (
                            <span className="chat-favorite-mark" title="Избранный чат">★</span>
                          )}
                        </div>
                        <div className={`chat-preview ${hasDraft ? 'draft' : ''}`}>
                          {hasDraft ? draftPreview : (conv.lastMessage || getProfileMoodLabel(conv.other) || 'Нет сообщений')}
                        </div>
                      </div>
                      <div className="chat-side">
                        <div className="chat-time">{formatTime(conv.lastAt)}</div>
                        {!isActive && unreadCount > 0 && (
                          <span className="chat-unread">{unreadCount}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className={`chat-window chat-wallpaper-${activeChatWallpaper.value}`.trim()}>
              {activeConversation ? (
                <>
                  <div className="chat-top">
                    <div className="chat-header">
                      {activeConversation.isGroup ? (
                        <div className="chat-user">
                          <div className="avatar small">
                            {(activeConversation.title || 'G')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3>{activeConversation.title}</h3>
                            <span>Групповой чат</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="chat-user chat-header-link"
                          onClick={() => openProfile(activeConversation.other.username)}
                        >
                          <div className="avatar small">
                            {activeConversation.other.avatarUrl ? (
                              <img src={resolveMediaUrl(activeConversation.other.avatarUrl)} alt="avatar" />
                            ) : (
                              (activeChatTitle || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3>{activeChatTitle}</h3>
                            {activeChatHandle && (
                              <div className="chat-user-handle">{activeChatHandle}</div>
                            )}
                            <div className="chat-status">
                              <span className={`presence-dot ${isOnline(activeConversation.other.id) ? 'online' : ''}`}></span>
                              {isOnline(activeConversation.other.id) ? 'в сети' : 'не в сети'}
                            </div>
                            {activeChatMoodLabel && (
                              <div className="chat-mood">{activeChatMoodLabel}</div>
                            )}
                          </div>
                        </button>
                      )}
                      <div className="chat-actions">
                        <button
                          type="button"
                          className="chat-action"
                          onClick={() => setChatSearchOpen((prev) => !prev)}
                          title="Поиск"
                        >
                          🔍
                        </button>
                        <button
                          type="button"
                          className="chat-action"
                          onClick={handleCall}
                          title={isChatBlocked ? 'Пользователь заблокирован' : 'Звонок'}
                          disabled={isChatBlocked}
                        >
                          📞
                        </button>
                        <button
                          type="button"
                          className={`chat-action ${isActiveConversationFavorite ? 'favorite' : ''}`.trim()}
                          onClick={() => toggleConversationFavorite()}
                          title={isActiveConversationFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                        >
                          {isActiveConversationFavorite ? '★' : '☆'}
                        </button>
                        <button
                          type="button"
                          className="chat-action"
                          onClick={cycleChatWallpaper}
                          title={`Тема чата: ${activeChatWallpaper.label}`}
                        >
                          🎨
                        </button>
                        <button
                          type="button"
                          className="chat-action"
                          onClick={openChatMenu}
                          title={activeConversation.isGroup ? 'Доступно в личных чатах' : 'Меню'}
                          disabled={activeConversation.isGroup}
                        >
                          ⋯
                        </button>
                      </div>
                    </div>
                    {pinnedMessage && (
                      <div className="pinned-banner">
                        <div>
                          <span className="pinned-label">Закрепленное сообщение</span>
                          {pinnedMessage.senderUsername && (
                            <span className="pinned-author">@{pinnedMessage.senderUsername}</span>
                          )}
                          <p>{getMessagePreview(pinnedMessage)}</p>
                        </div>
                        <button type="button" onClick={() => togglePinMessage(pinnedMessage)} title="Открепить">
                          ?
                        </button>
                      </div>
                    )}
                    {chatSearchOpen && (
                      <div className="chat-search-bar">
                        <span>🔍</span>
                        <input
                          type="text"
                          placeholder="Поиск в чате"
                          value={chatSearchQuery}
                          onChange={(event) => setChatSearchQuery(event.target.value)}
                        />
                        {chatSearchQuery && (
                          <button type="button" onClick={() => setChatSearchQuery('')} title="Очистить">
                            ?
                          </button>
                        )}
                      </div>
                    )}
                    {isChatBlocked && (
                      <div className="chat-blocked">
                        <span>Вы заблокировали пользователя.</span>
                        <button type="button" onClick={toggleChatBlock}>Разблокировать</button>
                      </div>
                    )}
                    {typingLabel && (
                      <div className="chat-typing">{typingLabel}</div>
                    )}
                  </div>
                  <div className={`chat-messages ${chatShaking ? 'nudge-shake' : ''}`.trim()} ref={chatMessagesRef}>
                    {filteredMessages.length === 0 && (
                      <div className="empty">
                        {chatSearchQuery ? 'Сообщения не найдены.' : 'Напишите первое сообщение.'}
                      </div>
                    )}
                  {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message-row ${msg.senderId === user.id ? 'mine' : ''}`}
                        onContextMenu={(event) => openMessageMenu(event, msg)}
                      >
                        {msg.senderId !== user.id && (
                          <button
                            type="button"
                            className="avatar tiny clickable"
                            onClick={() => openProfile(msg.senderUsername)}
                            title="Открыть профиль"
                          >
                            {msg.senderAvatarUrl ? (
                              <img src={resolveMediaUrl(msg.senderAvatarUrl)} alt="avatar" />
                            ) : (
                              (msg.senderUsername || 'U')[0].toUpperCase()
                            )}
                          </button>
                        )}
                        <div className={`message-bubble ${msg.attachmentKind === 'sticker' ? 'sticker' : ''} ${msg.attachmentKind === 'gif' ? 'gif' : ''}`.trim()}>
                          {msg.replyTo && (
                            <div className="message-reply">
                              <span className="message-reply-author">
                                {getReplyAuthorLabel(msg.replyTo)}
                              </span>
                              <p className="message-reply-text">
                                {msg.replyTo.deletedAt ? 'Сообщение удалено' : getMessagePreview(msg.replyTo)}
                              </p>
                            </div>
                          )}
                          {msg.attachmentUrl && (
                            isVideoMessageAttachment(msg) ? (
                              msg.attachmentKind === VIDEO_NOTE_KIND ? (
                                <div className="video-note-shell">
                                  <video
                                    src={resolveMediaUrl(msg.attachmentUrl)}
                                    className="video-note-player"
                                    controls
                                    playsInline
                                    preload="metadata"
                                  />
                                </div>
                              ) : (
                                <video
                                  src={resolveMediaUrl(msg.attachmentUrl)}
                                  className="media-thumb"
                                  controls
                                  playsInline
                                  preload="metadata"
                                />
                              )
                            ) : (
                              <img
                                src={resolveMediaUrl(msg.attachmentUrl)}
                                alt="attachment"
                                className="media-thumb"
                                onClick={() => setLightboxImage(resolveMediaUrl(msg.attachmentUrl))}
                              />
                            )
                          )}
                          {editingMessageId === msg.id ? (
                            <div className="comment-input">
                              <input
                                type="text"
                                value={editingMessageText}
                                onChange={(event) => setEditingMessageText(event.target.value)}
                              />
                              <button type="button" className="primary" onClick={() => {
                                editMessage(msg.id, editingMessageText)
                                  .then((data) => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id ? { ...m, body: data.message.body, editedAt: data.message.editedAt } : m
                                      )
                                    )
                                    if (pinnedMessage && pinnedMessage.id === msg.id && activeConversation) {
                                      setPinnedByConversation((prev) => ({
                                        ...prev,
                                        [activeConversation.id]: {
                                          ...pinnedMessage,
                                          body: data.message.body,
                                          editedAt: data.message.editedAt
                                        }
                                      }))
                                    }
                                    setEditingMessageId(null)
                                  })
                                  .catch((err) => setStatus({ type: 'error', message: err.message }))
                              }}>
                                Сохранить
                              </button>
                            </div>
                          ) : (
                            renderMessageBody(msg)
                          )}
                          {msg.poll && renderPollCard(msg)}
                          <div className="message-meta">
                            {msg.editedAt && <span className="message-edited">изменено</span>}
                            <time className="message-time">{formatTime(msg.createdAt)}</time>
                            {msg.senderId === user.id && activeConversation && !activeConversation.isGroup && (
                              <span className={`message-status ${msg.readByOther ? 'read' : ''}`}>
                                {msg.readByOther ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                          {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                            <div className={`message-reactions ${msg.senderId === user.id ? 'mine' : ''}`.trim()}>
                              {msg.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  type="button"
                                  className={`message-reaction ${reaction.reacted ? 'active' : ''}`.trim()}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleMessageReaction(msg, reaction.emoji)
                                  }}
                                >
                                  <span className="message-reaction-emoji">{reaction.emoji}</span>
                                  <span className="message-reaction-count">{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {(msg.senderId === user.id || user.isAdmin) && editingMessageId !== msg.id && activeConversation && activeConversation.isGroup && (
                          <div className="message-actions">
                            {!msg.poll && (
                              <button type="button" onClick={() => {
                                startEditMessage(msg)
                              }}>✏️</button>
                            )}
                            <button type="button" onClick={() => handleDeleteMessage(msg)}>🗑️</button>
                          </div>
                        )}
                        {msg.senderId === user.id && (
                          <button
                            type="button"
                            className="avatar tiny clickable"
                            onClick={() => setView('profile')}
                            title="Открыть профиль"
                          >
                            {user.avatarUrl ? (
                              <img src={resolveMediaUrl(user.avatarUrl)} alt="avatar" />
                            ) : (
                              (user.username || 'U')[0].toUpperCase()
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                {contextMenu.open && contextMenu.message && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={contextMenuRef}
                    className="message-menu with-reactions"
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                      <div className="message-menu-reactions">
                        {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`message-menu-emoji ${hasEmojiReaction(contextMenu.message, emoji) ? 'active' : ''}`.trim()}
                            onClick={() => handleMessageReaction(contextMenu.message, emoji, { closeMenu: true })}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`message-menu-expand ${contextMenu.showAllReactions ? 'open' : ''}`.trim()}
                          onClick={toggleContextMenuReactions}
                          title={contextMenu.showAllReactions ? 'Скрыть все реакции' : 'Показать все реакции'}
                          aria-label={contextMenu.showAllReactions ? 'Скрыть все реакции' : 'Показать все реакции'}
                        >
                          ▾
                        </button>
                      </div>
                      {contextMenu.showAllReactions && (
                        <div className="message-menu-reactions-grid">
                          {ALL_MESSAGE_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`message-menu-emoji ${hasEmojiReaction(contextMenu.message, emoji) ? 'active' : ''}`.trim()}
                              onClick={() => handleMessageReaction(contextMenu.message, emoji, { closeMenu: true })}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => startReplyMessage(contextMenu.message)}>
                        Ответить
                      </button>
                      {contextMenu.message.body && (
                        <button type="button" onClick={() => handleCopyMessage(contextMenu.message)}>
                          Копировать текст
                        </button>
                      )}
                      <button type="button" onClick={() => togglePinMessage(contextMenu.message)}>
                        {pinnedMessage && pinnedMessage.id === contextMenu.message.id ? 'Открепить' : 'Закрепить'}
                      </button>
                      {(contextMenu.message.senderId === user.id || user.isAdmin) && !contextMenu.message.poll && (
                        <button type="button" onClick={() => startEditMessage(contextMenu.message)}>
                          Редактировать
                        </button>
                      )}
                      {(contextMenu.message.senderId === user.id || user.isAdmin) && (
                        <button type="button" className="danger" onClick={() => handleDeleteMessage(contextMenu.message)}>
                          Удалить
                        </button>
                      )}
                    </div>,
                  document.body
                )}
                  <form className={`composer ${isChatBlocked ? 'disabled' : ''}`} onSubmit={handleSendMessage}>
                    {replyMessage && (
                      <div className="composer-reply">
                        <div className="composer-reply-head">
                          <span>Ответ: {getReplyAuthorLabel(replyMessage)}</span>
                          <button type="button" onClick={() => setReplyMessage(null)} title="Отменить ответ">
                            ×
                          </button>
                        </div>
                        <p>{getMessagePreview(replyMessage)}</p>
                      </div>
                    )}
                    {pollComposerOpen && (
                      <div className="composer-poll">
                        <div className="composer-poll-head">
                          <strong>Новый опрос</strong>
                          <button type="button" onClick={closePollComposer} title="Закрыть">
                            ×
                          </button>
                        </div>
                        <label>
                          Вопрос
                          <input
                            type="text"
                            value={pollDraft.question}
                            onChange={(event) => setPollDraft((prev) => ({ ...prev, question: event.target.value }))}
                            placeholder="О чем голосуем?"
                            maxLength={240}
                            disabled={isChatBlocked}
                          />
                        </label>
                        <div className="composer-poll-options">
                          {pollDraft.options.map((option, index) => (
                            <div key={`poll-option-${index}`} className="composer-poll-option">
                              <input
                                type="text"
                                value={option}
                                onChange={(event) => updatePollOption(index, event.target.value)}
                                placeholder={`Вариант ${index + 1}`}
                                maxLength={120}
                                disabled={isChatBlocked}
                              />
                              {pollDraft.options.length > POLL_OPTION_MIN_COUNT && (
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => removePollOption(index)}
                                  title="Удалить вариант"
                                >
                                  −
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="composer-poll-tools">
                          <button
                            type="button"
                            className="ghost"
                            onClick={addPollOption}
                            disabled={pollDraft.options.length >= POLL_OPTION_MAX_COUNT}
                          >
                            + Вариант
                          </button>
                          <label className="composer-poll-multi">
                            <input
                              type="checkbox"
                              checked={pollDraft.allowsMultiple}
                              onChange={(event) => setPollDraft((prev) => ({ ...prev, allowsMultiple: event.target.checked }))}
                            />
                            <span>Разрешить несколько ответов</span>
                          </label>
                          <button
                            type="button"
                            className="primary"
                            onClick={handleCreatePoll}
                            disabled={loading || isChatBlocked}
                          >
                            Отправить опрос
                          </button>
                        </div>
                      </div>
                    )}
                    <input
                      ref={composerInputRef}
                      type="text"
                      value={messageText}
                      onChange={handleMessageInputChange}
                      placeholder="Сообщение..."
                      disabled={isChatBlocked}
                    />
                    <label className="file-btn">
                      Файл
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.ogv,.ogg,.m4v,.gif"
                        disabled={isChatBlocked}
                        onChange={(event) => {
                          const file = event.target.files && event.target.files[0] ? event.target.files[0] : null
                          if (!file) {
                            clearMessageAttachment()
                            return
                          }
                          stopVideoNoteRecording(true)
                          const isVideo = isVideoFileLike(file)
                          setMessageFile(file)
                          setMessageAttachmentKind(isVideo ? 'video' : 'image')
                          setMessagePreviewType(isVideo ? 'video' : 'image')
                          setComposerPreviewUrl(URL.createObjectURL(file))
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className={`record-btn media-trigger-btn ${mediaPanelOpen ? 'active' : ''}`.trim()}
                      onClick={() => {
                        if (mediaPanelOpen) {
                          setMediaPanelOpen(false)
                          return
                        }
                        setPollComposerOpen(false)
                        setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
                        setMediaPanelQuery('')
                        setMediaPanelOpen(true)
                        window.requestAnimationFrame(() => {
                          if (composerInputRef.current) composerInputRef.current.focus()
                        })
                      }}
                      disabled={isChatBlocked || stickersLoading || gifsLoading}
                      title="Emoji / Стикеры / GIF"
                    >
                      {stickersLoading || gifsLoading ? '...' : '😊'}
                    </button>
                    <button
                      type="button"
                      className={`record-btn poll-trigger-btn ${pollComposerOpen ? 'active' : ''}`.trim()}
                      onClick={() => {
                        if (pollComposerOpen) {
                          closePollComposer()
                          return
                        }
                        setPollComposerOpen(true)
                        setMediaPanelOpen(false)
                      }}
                      disabled={isChatBlocked}
                      title="Создать опрос"
                    >
                      📊
                    </button>
                    <button
                      type="button"
                      className={`record-btn ${videoNoteRecording ? 'recording' : ''}`}
                      onClick={toggleVideoNoteRecording}
                      disabled={isChatBlocked}
                    >
                      {videoNoteRecording ? `Стоп ${videoNoteDuration}с` : 'Кружок'}
                    </button>
                    <button className="primary" type="submit" disabled={loading || isChatBlocked}>Отправить</button>
                  </form>
                  {commandSuggestions.length > 0 && !mediaPanelOpen && !pollComposerOpen && (
                    <div className="command-hints">
                      {commandSuggestions.map((item) => (
                        <button
                          key={item.command}
                          type="button"
                          onClick={() => applyCommandSuggestion(item.template)}
                        >
                          <code>{item.command}</code>
                          <span>{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {mediaPanelOpen && (
                    <div className="sticker-panel media-panel">
                      <div className="media-panel-headline">
                        <div className="media-panel-heading">
                          <strong>
                            {mediaPanelTab === MEDIA_PANEL_TABS.emoji
                              ? 'Emoji'
                              : mediaPanelTab === MEDIA_PANEL_TABS.stickers
                                ? 'Стикеры'
                                : 'GIF'}
                          </strong>
                          <span>
                            {mediaPanelTab === MEDIA_PANEL_TABS.emoji
                              ? `${visibleEmojis.length} emoji • Ctrl+E`
                              : mediaPanelTab === MEDIA_PANEL_TABS.stickers
                                ? `${visibleStickers.length}/${myStickers.length} в библиотеке`
                                : `${visibleGifs.length}/${myGifs.length} в библиотеке`}
                          </span>
                        </div>
                        {mediaPanelTab === MEDIA_PANEL_TABS.stickers && (
                          <label className="file-btn sticker-upload-btn">
                            Новый
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              onChange={handleStickerUpload}
                              disabled={stickersLoading}
                            />
                          </label>
                        )}
                        {mediaPanelTab === MEDIA_PANEL_TABS.gifs && (
                          <label className="file-btn sticker-upload-btn">
                            Новый
                            <input
                              type="file"
                              accept="image/gif,.gif"
                              onChange={handleGifUpload}
                              disabled={gifsLoading}
                            />
                          </label>
                        )}
                      </div>

                      <div className="media-panel-search-row">
                        <input
                          type="text"
                          value={mediaPanelQuery}
                          onChange={(event) => setMediaPanelQuery(event.target.value)}
                          placeholder={
                            mediaPanelTab === MEDIA_PANEL_TABS.emoji
                              ? 'Поиск emoji (пример: heart, смех, cat)'
                              : mediaPanelTab === MEDIA_PANEL_TABS.stickers
                                ? 'Поиск по названию стикера'
                                : 'Поиск по названию GIF'
                          }
                        />
                        {mediaPanelQuery && (
                          <button type="button" className="ghost media-search-clear" onClick={() => setMediaPanelQuery('')}>
                            ×
                          </button>
                        )}
                      </div>

                      <div className="media-panel-body">
                        {mediaPanelTab === MEDIA_PANEL_TABS.emoji && (
                          <>
                            {recentEmojis.length > 0 && !mediaQueryNormalized && (
                              <div className="sticker-section">
                                <span>Недавние</span>
                                <div className="emoji-grid">
                                  {recentEmojis.map((item) => (
                                    <button
                                      key={`recent-emoji-${item.value}`}
                                      type="button"
                                      className="emoji-item"
                                      onClick={() => appendEmojiToMessage(item.value)}
                                      title={`Добавить ${item.value}`}
                                    >
                                      {item.value}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {groupedVisibleEmojis.length === 0 && (
                              <div className="empty small">Emoji не найдены</div>
                            )}
                            {groupedVisibleEmojis.map(([groupKey, items]) => (
                              <div key={groupKey} className="sticker-section">
                                <span>{EMOJI_GROUP_LABELS[groupKey] || 'Emoji'}</span>
                                <div className="emoji-grid">
                                  {items.map((item) => (
                                    <button
                                      key={item.value}
                                      type="button"
                                      className="emoji-item"
                                      onClick={() => appendEmojiToMessage(item.value)}
                                      title={`Добавить ${item.value}`}
                                    >
                                      {item.value}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {mediaPanelTab === MEDIA_PANEL_TABS.stickers && (
                          <>
                            {visibleRecentStickers.length > 0 && (
                              <div className="sticker-section">
                                <span>Недавние</span>
                                <div className="sticker-grid">
                                  {visibleRecentStickers.map((sticker) => (
                                    <button
                                      key={`recent-${sticker.id}`}
                                      type="button"
                                      className="sticker-item"
                                      onClick={() => handleSendSticker(sticker)}
                                      title={sticker.title || 'Стикер'}
                                    >
                                      <img src={resolveMediaUrl(sticker.imageUrl)} alt={sticker.title || 'sticker'} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="sticker-section">
                              <span>Мои</span>
                              {myStickers.length === 0 ? (
                                <div className="empty small">Загрузите первый стикер</div>
                              ) : visibleStickers.length === 0 ? (
                                <div className="empty small">По запросу ничего не найдено</div>
                              ) : (
                                <div className="sticker-grid">
                                  {visibleStickers.map((sticker) => (
                                    <div key={sticker.id} className="sticker-cell">
                                      <button
                                        type="button"
                                        className="sticker-item"
                                        onClick={() => handleSendSticker(sticker)}
                                        title={sticker.title || 'Стикер'}
                                      >
                                        <img src={resolveMediaUrl(sticker.imageUrl)} alt={sticker.title || 'sticker'} />
                                      </button>
                                      <button
                                        type="button"
                                        className="sticker-remove"
                                        onClick={() => handleStickerDelete(sticker.id)}
                                        title="Удалить стикер"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {mediaPanelTab === MEDIA_PANEL_TABS.gifs && (
                          <>
                            {visibleRecentGifs.length > 0 && (
                              <div className="sticker-section">
                                <span>Недавние</span>
                                <div className="sticker-grid">
                                  {visibleRecentGifs.map((gif) => (
                                    <button
                                      key={`recent-gif-${gif.id}`}
                                      type="button"
                                      className="sticker-item gif-item"
                                      onClick={() => handleSendGif(gif)}
                                      title={gif.title || 'GIF'}
                                    >
                                      <img src={resolveMediaUrl(gif.imageUrl)} alt={gif.title || 'gif'} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="sticker-section">
                              <span>Мои GIF</span>
                              {myGifs.length === 0 ? (
                                <div className="empty small">Загрузите первый GIF</div>
                              ) : visibleGifs.length === 0 ? (
                                <div className="empty small">По запросу ничего не найдено</div>
                              ) : (
                                <div className="sticker-grid">
                                  {visibleGifs.map((gif) => (
                                    <div key={gif.id} className="sticker-cell">
                                      <button
                                        type="button"
                                        className="sticker-item gif-item"
                                        onClick={() => handleSendGif(gif)}
                                        title={gif.title || 'GIF'}
                                      >
                                        <img src={resolveMediaUrl(gif.imageUrl)} alt={gif.title || 'gif'} />
                                      </button>
                                      <button
                                        type="button"
                                        className="sticker-remove"
                                        onClick={() => handleGifDelete(gif.id)}
                                        title="Удалить GIF"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="media-panel-tabs">
                        <button
                          type="button"
                          className={mediaPanelTab === MEDIA_PANEL_TABS.emoji ? 'active' : ''}
                          onClick={() => {
                            setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
                            setMediaPanelQuery('')
                          }}
                          title="Emoji"
                        >
                          😀 Emoji
                        </button>
                        <button
                          type="button"
                          className={mediaPanelTab === MEDIA_PANEL_TABS.stickers ? 'active' : ''}
                          onClick={() => {
                            setMediaPanelTab(MEDIA_PANEL_TABS.stickers)
                            setMediaPanelQuery('')
                          }}
                          title="Стикеры"
                        >
                          ⭐ Стикеры
                        </button>
                        <button
                          type="button"
                          className={mediaPanelTab === MEDIA_PANEL_TABS.gifs ? 'active' : ''}
                          onClick={() => {
                            setMediaPanelTab(MEDIA_PANEL_TABS.gifs)
                            setMediaPanelQuery('')
                          }}
                          title="GIF"
                        >
                          GIF
                        </button>
                      </div>
                    </div>
                  )}
                  {videoNoteRecording && (
                    <div className="video-note-live">
                      <video ref={videoNotePreviewRef} autoPlay muted playsInline />
                      <span>Запись {videoNoteDuration}с / {VIDEO_NOTE_MAX_SECONDS}с</span>
                    </div>
                  )}
                  {messagePreview && (
                    <div className="upload-preview">
                      {messagePreviewType === 'video' ? (
                        messageAttachmentKind === VIDEO_NOTE_KIND ? (
                          <div className="video-note-shell">
                            <video
                              src={messagePreview}
                              className="video-note-player"
                              controls
                              playsInline
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <video
                            src={messagePreview}
                            controls
                            playsInline
                            preload="metadata"
                          />
                        )
                      ) : (
                        <img src={messagePreview} alt="preview" />
                      )}
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => clearMessageAttachment()}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="chat-empty">
                  <h3>Выберите диалог</h3>
                  <p>Найдите пользователя по username и начните чат.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'feed' && user && (
          <div className="feed-layout">
            <form className="feed-composer" onSubmit={handleCreatePost}>
              <div className="feed-header">
                <div className="avatar small">
                  {user.avatarUrl ? (
                    <img src={resolveMediaUrl(user.avatarUrl)} alt="avatar" />
                  ) : (
                    (user.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{user.displayName || user.username}</strong>
                  <span>@{user.username}</span>
                </div>
              </div>
              <textarea
                rows={3}
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                placeholder="Что нового в колледже?"
              />
              <div className="feed-actions">
                <label className="file-btn">
                  📷
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files[0]
                      setPostFile(file)
                      setPostPreview(file ? URL.createObjectURL(file) : '')
                    }}
                  />
                </label>
                <button className="primary" type="submit" disabled={loading}>Опубликовать</button>
              </div>
              {postPreview && (
                <div className="upload-preview">
                  <img src={postPreview} alt="preview" />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setPostFile(null)
                      setPostPreview('')
                    }}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </form>

            <section className="feed-toolbox">
              <div className="feed-metrics">
                <article>
                  <span>Total posts</span>
                  <strong>{feedMetrics.total}</strong>
                </article>
                <article>
                  <span>My posts</span>
                  <strong>{feedMetrics.mine}</strong>
                </article>
                <article>
                  <span>Bookmarks</span>
                  <strong>{feedMetrics.bookmarked}</strong>
                </article>
                <article>
                  <span>Engagement</span>
                  <strong>{feedMetrics.engagement}</strong>
                </article>
              </div>

              <div className="feed-filters-row">
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.all ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.all)}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.popular ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.popular)}
                >
                  Popular
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.mine ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.mine)}
                >
                  Mine
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.bookmarks ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.bookmarks)}
                >
                  Bookmarks
                </button>
              </div>

              <div className="feed-query-row">
                <input
                  type="text"
                  value={feedQuery}
                  onChange={(event) => setFeedQuery(event.target.value)}
                  placeholder="Search posts, authors, or #tags..."
                />
                {(feedQuery || activeFeedTag || feedFilter !== FEED_FILTERS.all) && (
                  <button type="button" className="ghost" onClick={resetFeedFilters}>
                    Reset
                  </button>
                )}
              </div>

              {trendingTags.length > 0 && (
                <div className="feed-tags-row">
                  {trendingTags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      className={`feed-tag ${activeFeedTag === item.tag ? 'active' : ''}`.trim()}
                      onClick={() => setActiveFeedTag((prev) => (prev === item.tag ? '' : item.tag))}
                    >
                      {item.tag} <span>{item.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="feed-list">
              {visibleFeedPosts.length === 0 && (
                <div className="empty">
                  {posts.length === 0 ? 'Постов пока нет.' : 'По текущим фильтрам посты не найдены.'}
                </div>
              )}
              {visibleFeedPosts.map((post) => (
                <article
                  key={post.id}
                  className="feed-card"
                  onContextMenu={(event) => openPostMenu(event, post)}
                >
                  {post.repostOf && (
                    <div className="repost-badge">? Репост</div>
                  )}
                  <button
                    type="button"
                    className="feed-header clickable"
                    onClick={() => openProfile(post.author.username)}
                  >
                    <div className="avatar small">
                      {post.author.avatarUrl ? (
                        <img src={resolveMediaUrl(post.author.avatarUrl)} alt="avatar" />
                      ) : (
                        post.author.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <strong>{post.author.displayName || post.author.username}</strong>
                      <span>@{post.author.username}</span>
                    </div>
                    <time>{formatTime(post.createdAt)}</time>
                  </button>
                  {post.body && <p>{post.body}</p>}
                  {post.imageUrl && (
                    <img
                      className="feed-image media-thumb"
                      src={resolveMediaUrl(post.imageUrl)}
                      alt="post"
                      onClick={() => setLightboxImage(resolveMediaUrl(post.imageUrl))}
                    />
                  )}
                  {post.repostOf && (
                    <div className="repost-card">
                      <div className="repost-label">? Репост</div>
                      <div className="repost-meta">
                        @{post.repostOf.authorUsername}
                      </div>
                      {post.repostOf.body && <p>{post.repostOf.body}</p>}
                      {post.repostOf.imageUrl && (
                        <img
                          className="feed-image media-thumb"
                          src={resolveMediaUrl(post.repostOf.imageUrl)}
                          alt="repost"
                          onClick={() => setLightboxImage(resolveMediaUrl(post.repostOf.imageUrl))}
                        />
                      )}
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      type="button"
                      className={post.liked ? 'active' : ''}
                      onClick={() => handleLikePost(post.id)}
                    >
                      ❤️ {post.likesCount}
                    </button>
                    <button type="button" onClick={() => handleToggleComments(post.id)}>
                      💬 {post.commentsCount}
                    </button>
                    <button
                      type="button"
                      className={`${post.reposted ? 'active' : ''} ${isOwnRepostPost(post) ? 'disabled' : ''}`.trim()}
                      onClick={() => handleRepostPost(post.id)}
                      disabled={isOwnRepostPost(post)}
                      title={isOwnRepostPost(post) ? 'Нельзя репостить свой репост' : 'Репост'}
                    >
                      🔁 {post.repostsCount}
                    </button>
                    <button
                      type="button"
                      className={bookmarkedPostIds.has(post.id) ? 'active' : ''}
                      onClick={() => togglePostBookmark(post.id)}
                      title={bookmarkedPostIds.has(post.id) ? 'Убрать из закладок' : 'Добавить в закладки'}
                    >
                      🔖
                    </button>
                  </div>
                  {editingPostId === post.id && (
                    <div className="comment-input">
                      <input
                        type="text"
                        value={editingPostText}
                        onChange={(event) => setEditingPostText(event.target.value)}
                      />
                      <button type="button" className="primary" onClick={() => {
                        editPost(post.id, editingPostText)
                          .then(() => {
                            setPosts((prev) =>
                              prev.map((p) => (p.id === post.id ? { ...p, body: editingPostText } : p))
                            )
                            setProfilePosts((prev) =>
                              prev.map((p) => (p.id === post.id ? { ...p, body: editingPostText } : p))
                            )
                            setEditingPostId(null)
                          })
                          .catch((err) => setStatus({ type: 'error', message: err.message }))
                      }}>
                        Сохранить
                      </button>
                    </div>
                  )}
                  {openComments === post.id && (
                    <div className="comment-box">
                      <div className="comment-list">
                        {(commentsByPost[post.id] || []).map((comment) => (
                          <div key={comment.id} className="comment-item">
                            <div className="avatar tiny">
                              {comment.user.avatarUrl ? (
                                <img src={resolveMediaUrl(comment.user.avatarUrl)} alt="avatar" />
                              ) : (
                                comment.user.username[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong>{comment.user.displayName || comment.user.username}</strong>
                              <p>{comment.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="comment-input">
                        <input
                          type="text"
                          placeholder="Написать комментарий..."
                          value={commentDraft[post.id] || ''}
                          onChange={(event) =>
                            setCommentDraft((prev) => ({ ...prev, [post.id]: event.target.value }))
                          }
                        />
                        <button type="button" className="primary" onClick={() => handleAddComment(post.id)}>
                          Отправить
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
        {view === 'profile-view' && (
          <div className="profile-page">
            <button type="button" className="ghost" onClick={() => setView(profileBackView || 'feed')}>Back</button>
            {profileLoading && !profileView && (
              <div className="panel">
                <div className="empty">Loading profile...</div>
              </div>
            )}
            {profileView && (
              <>
                <div
                  className="profile-hero profile-hero-expanded"
                  style={{
                    backgroundColor: profileView.themeColor || '#7a1f1d',
                    backgroundImage: profileView.bannerUrl ? `url(${resolveMediaUrl(profileView.bannerUrl)})` : 'none'
                  }}
                >
                  <div className="avatar large">
                    {profileView.avatarUrl ? (
                      <img src={resolveMediaUrl(profileView.avatarUrl)} alt="avatar" />
                    ) : (
                      profileView.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="profile-hero-main">
                    <div>
                      <h2>{profileView.displayName || profileView.username}</h2>
                      <span>@{profileView.username}</span>
                    </div>
                    {profileViewMoodLabel && <div className="profile-mood-chip profile-mood-profile">{profileViewMoodLabel}</div>}
                    {profileView.bio && <p>{profileView.bio}</p>}
                    <div className="profile-stats">
                      <span><strong>{profileFollowers}</strong> followers</span>
                      <span><strong>{profileFollowing}</strong> following</span>
                      <span><strong>{profileTracksCount}</strong> tracks</span>
                      {profileJoinedAt && <span>since {profileJoinedAt}</span>}
                    </div>
                  </div>
                  <div className="profile-actions-row">
                    {canSubscribeProfile ? (
                      <button
                        type="button"
                        className={`primary profile-subscribe ${profileView.isSubscribed ? 'subscribed' : ''}`.trim()}
                        onClick={handleToggleSubscription}
                        disabled={loading}
                      >
                        {profileView.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                      </button>
                    ) : (
                      <button type="button" className="ghost" onClick={() => setView('profile')}>
                        Edit profile
                      </button>
                    )}
                  </div>
                </div>
                <section className="music-panel">
                  <div className="music-panel-head">
                    <h3>Music</h3>
                    <span>{profileTracks.length}</span>
                  </div>
                  {profileTracks.length === 0 ? (
                    <div className="empty">No music added yet.</div>
                  ) : (
                    <div className="track-list">
                      {profileTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          className={`track-item ${activeTrackId === track.id ? 'active' : ''}`.trim()}
                          onClick={() => handleTrackSelect(track.id)}
                        >
                          <div>
                            <strong>{track.title || 'Untitled'}</strong>
                            <span>{track.artist || `Added ${formatDate(track.createdAt)}`}</span>
                          </div>
                          <span>{activeTrackId === track.id ? 'Hide' : 'Play'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {activeProfileTrack && (
                    <audio
                      key={activeProfileTrack.id}
                      controls
                      autoPlay
                      className="profile-audio-player"
                      src={resolveMediaUrl(activeProfileTrack.audioUrl)}
                    />
                  )}
                </section>
                <div className="feed-list">
                  {profilePosts.length === 0 && (
                    <div className="empty">No posts yet.</div>
                  )}
                  {profilePosts.map((post) => (
                    <article
                      key={post.id}
                      className="feed-card"
                      onContextMenu={(event) => openPostMenu(event, post)}
                    >
                      {post.repostOf && (
                        <div className="repost-badge">Repost</div>
                      )}
                      <div className="feed-header">
                        <div className="avatar small">
                          {profileView.avatarUrl ? (
                            <img src={resolveMediaUrl(profileView.avatarUrl)} alt="avatar" />
                          ) : (
                            profileView.username[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>{profileView.displayName || profileView.username}</strong>
                          <span>@{profileView.username}</span>
                        </div>
                        <time>{formatTime(post.createdAt)}</time>
                      </div>
                      {post.body && <p>{post.body}</p>}
                      {post.imageUrl && (
                        <img
                          className="feed-image media-thumb"
                          src={resolveMediaUrl(post.imageUrl)}
                          alt="post"
                          onClick={() => setLightboxImage(resolveMediaUrl(post.imageUrl))}
                        />
                      )}
                      {post.repostOf && (
                        <div className="repost-card">
                          <div className="repost-label">Repost</div>
                          <div className="repost-meta">
                            @{post.repostOf.authorUsername}
                          </div>
                          {post.repostOf.body && <p>{post.repostOf.body}</p>}
                          {post.repostOf.imageUrl && (
                            <img
                              className="feed-image media-thumb"
                              src={resolveMediaUrl(post.repostOf.imageUrl)}
                              alt="repost"
                              onClick={() => setLightboxImage(resolveMediaUrl(post.repostOf.imageUrl))}
                            />
                          )}
                        </div>
                      )}
                      <div className="post-actions">
                        <button
                          type="button"
                          className={post.liked ? 'active' : ''}
                          onClick={() => handleLikePost(post.id)}
                        >
                          Like {post.likesCount}
                        </button>
                        <button type="button" onClick={() => handleToggleComments(post.id)}>
                          Comments {post.commentsCount}
                        </button>
                        <button
                          type="button"
                          className={`${post.reposted ? 'active' : ''} ${isOwnRepostPost(post) ? 'disabled' : ''}`.trim()}
                          onClick={() => handleRepostPost(post.id)}
                          disabled={isOwnRepostPost(post)}
                          title={isOwnRepostPost(post) ? 'Cannot repost your own repost' : 'Repost'}
                        >
                          Repost {post.repostsCount}
                        </button>
                        <button
                          type="button"
                          className={bookmarkedPostIds.has(post.id) ? 'active' : ''}
                          onClick={() => togglePostBookmark(post.id)}
                          title={bookmarkedPostIds.has(post.id) ? 'Remove bookmark' : 'Add bookmark'}
                        >
                          Bookmark
                        </button>
                      </div>
                      {editingPostId === post.id && (
                        <div className="comment-input">
                          <input
                            type="text"
                            value={editingPostText}
                            onChange={(event) => setEditingPostText(event.target.value)}
                          />
                          <button type="button" className="primary" onClick={() => {
                            editPost(post.id, editingPostText)
                              .then(() => {
                                setProfilePosts((prev) =>
                                  prev.map((p) => (p.id === post.id ? { ...p, body: editingPostText } : p))
                                )
                                setPosts((prev) =>
                                  prev.map((p) => (p.id === post.id ? { ...p, body: editingPostText } : p))
                                )
                                setEditingPostId(null)
                              })
                              .catch((err) => setStatus({ type: 'error', message: err.message }))
                          }}>
                            Save
                          </button>
                        </div>
                      )}
                      {openComments === post.id && (
                        <div className="comment-box">
                          <div className="comment-list">
                            {(commentsByPost[post.id] || []).map((comment) => (
                              <div key={comment.id} className="comment-item">
                                <div className="avatar tiny">
                                  {comment.user.avatarUrl ? (
                                    <img src={resolveMediaUrl(comment.user.avatarUrl)} alt="avatar" />
                                  ) : (
                                    comment.user.username[0].toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <strong>{comment.user.displayName || comment.user.username}</strong>
                                  <p>{comment.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="comment-input">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentDraft[post.id] || ''}
                              onChange={(event) =>
                                setCommentDraft((prev) => ({ ...prev, [post.id]: event.target.value }))
                              }
                            />
                            <button type="button" className="primary" onClick={() => handleAddComment(post.id)}>
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        )}        {view === 'admin' && user && user.isAdmin && (
          <div className="panel admin-panel">
            <h2>Админ панель</h2>
            <div className="admin-search">
              <input
                type="text"
                placeholder="Поиск по username..."
                value={adminQuery}
                onChange={(event) => setAdminQuery(event.target.value)}
              />
              <button type="button" className="primary" onClick={() => loadAdminUsers(adminQuery)}>
                Найти
              </button>
            </div>
            <div className="admin-list">
              {adminUsers.length === 0 && <div className="empty">Пользователи не найдены.</div>}
              {adminUsers.map((u) => (
                <div key={u.id} className="admin-item">
                  <div>
                    <strong>{u.display_name || u.username}</strong>
                    <span>@{u.username}</span>
                    <div className="admin-badges">
                      {u.is_admin && <span className="badge admin">ADMIN</span>}
                      {u.is_moderator && <span className="badge moder">MODER</span>}
                    </div>
                  </div>
                  <div className="admin-meta">
                    <span>Предупр.: {u.warnings_count}</span>
                    <span>{u.is_banned ? 'БАН' : 'активен'}</span>
                  </div>
                  <div className="admin-actions">
                    {u.is_banned ? (
                      <button type="button" onClick={() => adminUnbanUser(u.id).then(() => loadAdminUsers(adminQuery))}>
                        Разбан
                      </button>
                    ) : (
                      <button type="button" onClick={() => adminBanUser(u.id).then(() => loadAdminUsers(adminQuery))}>
                        Бан
                      </button>
                    )}
                    <input
                      type="text"
                      placeholder="Причина предупреждения"
                      value={adminWarnReason[u.id] || ''}
                      onChange={(event) =>
                        setAdminWarnReason((prev) => ({ ...prev, [u.id]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        adminWarnUser(u.id, adminWarnReason[u.id] || '')
                          .then(() => {
                            setAdminWarnReason((prev) => ({ ...prev, [u.id]: '' }))
                            loadAdminUsers(adminQuery)
                          })
                      }
                    >
                      Предупредить
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminClearWarnings(u.id).then(() => loadAdminUsers(adminQuery))
                      }
                    >
                      Снять предупреждения
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminSetModerator(u.id, !u.is_moderator)
                          .then(() => loadAdminUsers(adminQuery))
                      }
                    >
                      {u.is_moderator ? 'Снять модер' : 'Назначить модер'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'profile' && user && (
          <form className="panel" onSubmit={handleProfileSave}>
            <div className="panel-header">
              <div>
                <h2>Профиль</h2>
                <p className="subtitle">Настрой профиль как в Telegram.</p>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => openProfile(user.username)}
                title="Открыть мой публичный профиль"
              >
                Открыть мой профиль
              </button>
            </div>
            <div
              className="profile-banner"
              style={{
                backgroundColor: profileForm.themeColor,
                backgroundImage: user.bannerUrl ? `url(${resolveMediaUrl(user.bannerUrl)})` : 'none'
              }}
            ></div>
            <label className="file-btn">
              Изменить обложку
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleBannerChange} />
            </label>
            <div className="profile-avatar">
              <div className="avatar large">
                {user.avatarUrl ? (
                  <img src={resolveMediaUrl(user.avatarUrl)} alt="avatar" />
                ) : (
                  (user.username || 'U')[0].toUpperCase()
                )}
              </div>
              <label className="file-btn">
                Изменить аватар
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
              </label>
            </div>
            <label>
              Цвет профиля
              <input
                type="color"
                value={profileForm.themeColor}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, themeColor: event.target.value })
                }
              />
            </label>
            <label>
              Отображаемое имя
              <input
                type="text"
                value={profileForm.displayName}
                onChange={(event) => setProfileForm({ ...profileForm, displayName: event.target.value })}
                placeholder="Ваше имя"
              />
            </label>
            <label>
              Статус emoji
              <input
                type="text"
                value={profileForm.statusEmoji}
                onChange={(event) => setProfileForm({ ...profileForm, statusEmoji: event.target.value })}
                placeholder="✨"
                maxLength={16}
              />
            </label>
            <div className="status-emoji-presets" aria-label="Быстрые emoji для статуса">
              {STATUS_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={profileForm.statusEmoji === emoji ? 'active' : ''}
                  onClick={() => applyStatusEmojiPreset(emoji)}
                  title={`Поставить ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className="shuffle"
                onClick={applyRandomStatusEmoji}
                title="Случайный emoji"
              >
                🎲
              </button>
            </div>
            <label>
              Статус
              <input
                type="text"
                value={profileForm.statusText}
                onChange={(event) => setProfileForm({ ...profileForm, statusText: event.target.value })}
                placeholder="На связи и в настроении"
                maxLength={80}
              />
            </label>
            <label>
              Username
              <input
                type="text"
                value={profileForm.username}
                onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}
                placeholder="cool_student"
                minLength={3}
                pattern="[a-zA-Z0-9_]{3,}"
              />
            </label>
            <label>
              Специализация
              <select
                value={profileForm.role}
                onChange={(event) => setProfileForm({ ...profileForm, role: event.target.value })}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label>
              О себе
              <textarea
                rows={4}
                value={profileForm.bio}
                onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                placeholder="Пару слов о себе"
              />
            </label>
            <div className="music-editor">
              <h3>Profile music</h3>
              <div className="music-upload-form">
                <input
                  type="text"
                  value={trackTitle}
                  onChange={(event) => setTrackTitle(event.target.value)}
                  placeholder="Track title"
                  maxLength={120}
                />
                <input
                  type="text"
                  value={trackArtist}
                  onChange={(event) => setTrackArtist(event.target.value)}
                  placeholder="Artist"
                  maxLength={120}
                />
                <label className="file-btn">
                  Select audio
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/aac,.mp3,.wav,.ogg,.webm,.m4a,.aac"
                    onChange={(event) => setTrackFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)}
                  />
                </label>
                {trackFile && <small>Selected: {trackFile.name}</small>}
                <button
                  className="primary"
                  type="button"
                  onClick={handleProfileTrackUpload}
                  disabled={musicUploadLoading || !trackFile}
                >
                  {musicUploadLoading ? 'Uploading...' : 'Add to profile'}
                </button>
              </div>
              <div className="my-tracks-list">
                {myTracks.length === 0 && <div className="empty">No tracks uploaded yet.</div>}
                {myTracks.map((track) => (
                  <div key={track.id} className="my-track-item">
                    <div>
                      <strong>{track.title || 'Untitled'}</strong>
                      <span>{track.artist || formatDate(track.createdAt)}</span>
                    </div>
                    <button type="button" className="ghost" onClick={() => handleDeleteTrack(track.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button className="primary" type="submit" disabled={loading}>Сохранить</button>
          </form>
        )}

        {view === 'profile' && !user && (
          <div className="panel">
            <h2>Профиль</h2>
            <p className="subtitle">Сначала войдите или зарегистрируйтесь.</p>
          </div>
        )}

        {postMenu.open && postMenu.post && typeof document !== 'undefined' && createPortal(
          <div
            ref={postMenuRef}
            className="message-menu compact"
            style={{ top: `${postMenu.y}px`, left: `${postMenu.x}px` }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
          >
            {isOwnRepostPost(postMenu.post) ? (
              <button type="button" className="disabled" disabled>
                Репост недоступен
              </button>
            ) : (
              <button type="button" className="accent" onClick={() => handleRepostFromMenu(postMenu.post)}>
                {postMenu.post.reposted ? '? Отменить репост' : '? Репост'}
              </button>
            )}
            {user && (user.id === postMenu.post.author.id || user.isAdmin) && (
              <button type="button" onClick={() => startEditPost(postMenu.post)}>
                Редактировать
              </button>
            )}
            {user && (user.id === postMenu.post.author.id || user.isAdmin) && (
              <button type="button" className="danger" onClick={() => handleDeletePost(postMenu.post)}>
                Удалить
              </button>
            )}
          </div>,
          document.body
        )}

        {chatMenu.open && activeConversation && !activeConversation.isGroup && typeof document !== 'undefined' && createPortal(
          <div
            ref={chatMenuRef}
            className="message-menu compact"
            style={{ top: `${chatMenu.y}px`, left: `${chatMenu.x}px` }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => {
              setChatMenu(INITIAL_CHAT_MENU_STATE)
              openProfile(activeConversation.other.username)
            }}>
              Открыть профиль
            </button>
            <button type="button" onClick={() => {
              setChatMenu(INITIAL_CHAT_MENU_STATE)
              setChatSearchOpen(true)
            }}>
              Поиск
            </button>
            <button type="button" onClick={() => {
              toggleConversationFavorite(activeConversation.id, { closeMenu: true })
            }}>
              {isActiveConversationFavorite ? 'Убрать из избранного' : 'В избранное'}
            </button>
            <button type="button" onClick={() => {
              setChatMenu(INITIAL_CHAT_MENU_STATE)
              handleCall()
            }}>
              Звонок
            </button>
            <button type="button" onClick={setActiveChatAlias}>
              {activeConversationAlias ? 'Изменить локальный ник' : 'Добавить локальный ник'}
            </button>
            <div className="chat-menu-wallpapers">
              <span>Тема чата</span>
              <div className="chat-menu-wallpapers-list">
                {CHAT_WALLPAPERS.map((wallpaper) => (
                  <button
                    key={wallpaper.value}
                    type="button"
                    className={activeChatWallpaper.value === wallpaper.value ? 'active' : ''}
                    onClick={() => setChatWallpaper(wallpaper.value, { closeMenu: true })}
                  >
                    {wallpaper.label}
                  </button>
                ))}
              </div>
            </div>
            {activeConversationAlias && (
              <button
                type="button"
                onClick={() => {
                  setChatAliasByConversation((prev) => {
                    const next = { ...prev }
                    delete next[activeConversation.id]
                    return next
                  })
                  setChatMenu(INITIAL_CHAT_MENU_STATE)
                  setStatus({ type: 'info', message: 'Локальный ник удален.' })
                }}
              >
                Сбросить локальный ник
              </button>
            )}
            <button type="button" className="danger" onClick={toggleChatBlock}>
              {isChatBlocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>,
          document.body
        )}

        {callState.status === 'incoming' && (
          <div className="call-modal">
            <div className="call-card">
              <div className="call-title">Входящий звонок</div>
              <div className="call-user">
                <div className="avatar small">
                  {callUser && callUser.avatarUrl ? (
                    <img src={resolveMediaUrl(callUser.avatarUrl)} alt="avatar" />
                  ) : (
                    (callTitle || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{callTitle}</strong>
                  {callSubtitle && <span>{callSubtitle}</span>}
                </div>
              </div>
              <div className="call-actions">
                <button type="button" className="danger" onClick={() => declineCall('declined')}>
                  Отклонить
                </button>
                <button type="button" className="primary" onClick={answerCall}>
                  Ответить
                </button>
              </div>
            </div>
          </div>
        )}

        {callState.status !== 'idle' && callState.status !== 'incoming' && (
          <div className="call-bar">
            <div>
              <strong>{callTitle}</strong>
              <span>{callStatusText}</span>
            </div>
            <button type="button" className="danger" onClick={() => endCall(true)}>
              Завершить
            </button>
          </div>
        )}
      </main>

      {user && (
        <div className="icon-rail icon-rail-root">
          <button
            type="button"
            className={view === 'feed' ? 'active' : ''}
            onClick={() => setView('feed')}
            title="Лента"
          >
            {icons.feed}
          </button>
          <button
            type="button"
            className={view === 'chats' ? 'active' : ''}
            onClick={() => setView('chats')}
            title="Чаты"
            aria-label={unreadMessagesCount > 0 ? `Чаты, непрочитанных сообщений: ${unreadMessagesCount}` : 'Чаты'}
          >
            {icons.chats}
            {unreadMessagesCount > 0 && (
              <span className="icon-rail-badge">{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</span>
            )}
          </button>
          {user.isAdmin && (
            <button
              type="button"
              className={view === 'admin' ? 'active' : ''}
              onClick={() => {
                setView('admin')
                loadAdminUsers(adminQuery)
              }}
              title="Админ"
            >
              {icons.admin}
            </button>
          )}
          <button
            type="button"
            className={view === 'profile' ? 'active' : ''}
            onClick={() => setView('profile')}
            title="Профиль"
          >
            {icons.profile}
          </button>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline />

      {avatarModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Изменить аватар</h3>
            <div className="avatar-crop">
              <div
                className="avatar-preview"
                onPointerDown={handleAvatarDragStart}
                onPointerMove={handleAvatarDragMove}
                onPointerUp={handleAvatarDragEnd}
                onPointerLeave={handleAvatarDragEnd}
              >
                <img
                  src={avatarSource}
                  alt="avatar preview"
                  style={{ transform: `translate(${avatarOffset.x}px, ${avatarOffset.y}px) scale(${avatarZoom})` }}
                />
              </div>
            </div>
            <label className="slider">
              Масштаб
              <input
                type="range"
                min={AVATAR_ZOOM_MIN}
                max={AVATAR_ZOOM_MAX}
                step="0.05"
                value={avatarZoom}
                onChange={(event) => setAvatarZoom(clampAvatarZoom(Number(event.target.value)))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setAvatarModalOpen(false)}>
                Отмена
              </button>
              <button type="button" className="primary" onClick={handleAvatarSave} disabled={loading}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage('')}>
          <img src={lightboxImage} alt="full" />
        </div>
      )}
    </div>
  )
}



