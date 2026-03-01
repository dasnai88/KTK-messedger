import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { io } from 'socket.io-client'
import {
  createConversation,
  createGroupConversation,
  getConversations,
  getHealth,
  getMe,
  getMyVerificationRequest,
  getMessages,
  markConversationRead,
  setConversationFavorite,
  getProfile,
  getProfileShowcase,
  getProfilePosts,
  getProfileTracks,
  getPosts,
  getPresence,
  getPushPublicKey,
  getRoles,
  getTokenValue,
  getComments,
  login,
  verifyTwoFactorLogin,
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
  changeMyPassword,
  createMyVerificationRequest,
  cancelMyVerificationRequest,
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
  adminSetVerified,
  adminListVerificationRequests,
  adminReviewVerificationRequest,
  adminCreateRole,
  adminSetUserRole,
  adminResetUserPassword,
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
  getMyProfileShowcase,
  saveMyProfileShowcase,
  createPoll,
  votePoll,
  getMySessions,
  revokeSession,
  revokeOtherSessions,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  regenerateTwoFactorBackupCodes,
  getMyPrivacyControls,
  getUserPrivacy,
  setUserPrivacy,
  forwardMessage as forwardMessageApi,
  getConversationBookmarks,
  toggleMessageBookmark
} from './api.js'

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h4v7H4v-7Zm6 0h10v7H10v-7Zm5-4h5v2h-5V9Zm-4 0h2v2h-2V9Z" />
    </svg>
  ),
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
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.43 12.98a7.8 7.8 0 0 0 .05-.98c0-.33-.02-.65-.05-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.2 7.2 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42L9.13 5.07c-.61.24-1.17.57-1.69.98l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.03.33-.05.65-.05.98 0 .33.02.65.05.98L2.47 14.63a.5.5 0 0 0-.12.64l2 3.46c.13.22.39.31.6.22l2.49-1c.52.41 1.08.74 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.24 1.17-.57 1.69-.98l2.49 1c.22.09.47 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 6a3 3 0 1 1-3 3 3 3 0 0 1 3-3Zm0 11.2a7.7 7.7 0 0 1-4.5-4 4.9 4.9 0 0 1 9 0 7.7 7.7 0 0 1-4.5 4Z" />
    </svg>
  )
}

const fallbackRoles = [
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'programmist', label: 'Программист' },
  { value: 'biomed', label: 'Биомед' },
  { value: 'holodilchik', label: 'Холодильчик' },
  { value: 'tehmash', label: 'Техмаш' },
  { value: 'promteh', label: 'Промтех' },
  { value: 'laborant', label: 'Лаборант' },
  { value: 'polimer', label: 'Полимер' },
  { value: 'energomat', label: 'Энергомат' },
  { value: 'himanaliz', label: 'Химанализ' },
  { value: 'pishrast', label: 'Пищраст' },
  { value: 'pishzhiv', label: 'Пищжив' },
  { value: 'legprom', label: 'Легпром' },
  { value: 'povar', label: 'Повар' },
  { value: 'turizm', label: 'Туризм' },
  { value: 'deloproizvod', label: 'Делопроизвод' }
]

const initialRegister = {
  login: '',
  username: '',
  password: '',
  role: 'student'
}

const initialLogin = {
  login: '',
  password: ''
}

const INITIAL_TWO_FACTOR_LOGIN_STATE = {
  pending: false,
  token: '',
  code: '',
  backupCode: ''
}

const DEFAULT_PRIVACY_RELATION = {
  isMuted: false,
  isBlocked: false,
  hideProfileContent: false,
  denyDm: false,
  blockedByTarget: false,
  dmBlocked: false,
  profileHidden: false
}

const DEFAULT_TWO_FACTOR_STATUS = {
  eligible: false,
  enabled: false,
  pendingSetup: false,
  backupCodesCount: 0
}

const verificationStatusOptions = [
  { value: 'pending', label: 'На проверке' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'cancelled', label: 'Отменено' }
]

const verificationStatusLabelByValue = new Map(
  verificationStatusOptions.map((item) => [item.value, item.label])
)

const initialVerificationForm = {
  fullName: '',
  reason: '',
  evidence: ''
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

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function normalizeVerificationStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  return verificationStatusLabelByValue.has(status) ? status : 'pending'
}

function normalizeVerificationRequest(value) {
  if (!value || typeof value !== 'object') return null
  return {
    id: String(value.id || ''),
    userId: String(value.userId || value.user_id || ''),
    fullName: String(value.fullName || value.full_name || '').trim(),
    reason: String(value.reason || '').trim(),
    evidence: String(value.evidence || '').trim(),
    status: normalizeVerificationStatus(value.status),
    adminNote: String(value.adminNote || value.admin_note || '').trim(),
    reviewedBy: String(value.reviewedBy || value.reviewed_by || ''),
    reviewedByUsername: String(value.reviewedByUsername || value.reviewed_by_username || ''),
    createdAt: value.createdAt || value.created_at || '',
    updatedAt: value.updatedAt || value.updated_at || '',
    reviewedAt: value.reviewedAt || value.reviewed_at || '',
    user: value.user && typeof value.user === 'object' ? value.user : null
  }
}

function normalizePrivacyRelation(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PRIVACY_RELATION }
  return {
    isMuted: value.isMuted === true || value.is_muted === true,
    isBlocked: value.isBlocked === true || value.is_blocked === true,
    hideProfileContent: value.hideProfileContent === true || value.hide_profile_content === true,
    denyDm: value.denyDm === true || value.deny_dm === true,
    blockedByTarget: value.blockedByTarget === true || value.blocked_by_target === true,
    dmBlocked: value.dmBlocked === true || value.dm_blocked === true,
    profileHidden: value.profileHidden === true || value.profile_hidden === true
  }
}

function extractHashtags(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) || []
  return matches
    .map((tag) => tag.toLowerCase())
    .filter(Boolean)
}

function extractUrls(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || []
  return matches
    .map((url) => String(url || '').trim().replace(/[),.;!?]+$/g, ''))
    .filter(Boolean)
}

function getUrlHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

function getMessageReactionScore(message) {
  if (!message || !Array.isArray(message.reactions)) return 0
  return message.reactions.reduce((acc, item) => acc + Math.max(0, Number(item.count || 0)), 0)
}

function getMessageAttachmentFamily(message) {
  if (!message || !message.attachmentUrl) return ''
  if (message.attachmentKind === 'sticker') return 'sticker'
  if (message.attachmentKind === 'gif') return 'gif'
  if (message.attachmentKind === VIDEO_NOTE_KIND) return 'video-note'
  if (isVideoMessageAttachment(message)) return 'video'
  return 'image'
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getFeedPostEngagementScore(post) {
  if (!post || typeof post !== 'object') return 0
  return (
    (Number(post.likesCount || 0) * 3) +
    Number(post.commentsCount || 0) +
    (Number(post.repostsCount || 0) * 4)
  )
}

function getFeedPostAgeMs(post) {
  const createdAt = Date.parse(post?.createdAt || '') || 0
  if (!createdAt) return Number.POSITIVE_INFINITY
  return Math.max(0, Date.now() - createdAt)
}

function formatRelativeFeedAge(value) {
  const timestamp = Date.parse(value || '')
  if (!timestamp) return ''
  const diffMs = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes}м назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}ч назад`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}д назад`
  return formatDate(value)
}

function renderHighlightedText(value, query) {
  const text = String(value || '')
  const normalizedQuery = String(query || '').trim()
  if (!text || !normalizedQuery) return text
  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'ig')
  const parts = text.split(regex)
  if (parts.length <= 1) return text
  const normalizedLower = normalizedQuery.toLowerCase()
  return parts.map((part, index) => (
    part.toLowerCase() === normalizedLower
      ? <mark key={`hl-${index}`}>{part}</mark>
      : <span key={`tx-${index}`}>{part}</span>
  ))
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
  if (conversation.isPersonalFavorites) return conversation.title || 'Избранное'
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
const BANNER_ZOOM_MIN = 1
const BANNER_ZOOM_MAX = 3.2
const BANNER_EXPORT_WIDTH = 1600
const BANNER_EXPORT_HEIGHT = 520
const PUSH_OPEN_STORAGE_KEY = 'ktk_push_open_conversation'
const DRAFT_STORAGE_KEY = 'ktk_message_drafts'
const FEED_BOOKMARKS_STORAGE_KEY = 'ktk_feed_bookmarks'
const FEED_EXPLORER_STORAGE_KEY = 'ktk_feed_explorer_v1'
const DASHBOARD_PREFERENCES_STORAGE_KEY = 'ktk_dashboard_preferences_v1'
const DASHBOARD_COMMAND_HISTORY_STORAGE_KEY = 'ktk_dashboard_command_history_v1'
const CHAT_WALLPAPER_STORAGE_KEY = 'ktk_chat_wallpapers'
const CHAT_ALIAS_STORAGE_KEY = 'ktk_chat_aliases'
const RECENT_STICKERS_STORAGE_KEY = 'ktk_recent_stickers'
const RECENT_GIFS_STORAGE_KEY = 'ktk_recent_gifs'
const RECENT_EMOJIS_STORAGE_KEY = 'ktk_recent_emojis'
const UI_PREFERENCES_STORAGE_KEY = 'ktk_ui_preferences_v1'
const PROFILE_SHOWCASE_STORAGE_KEY = 'ktk_profile_showcase_v1'
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
const CHAT_EXPLORER_TABS = {
  overview: 'overview',
  media: 'media',
  links: 'links',
  highlights: 'highlights'
}
const CHAT_EXPLORER_TAB_OPTIONS = [
  { value: CHAT_EXPLORER_TABS.overview, label: 'Обзор' },
  { value: CHAT_EXPLORER_TABS.media, label: 'Медиа' },
  { value: CHAT_EXPLORER_TABS.links, label: 'Ссылки' },
  { value: CHAT_EXPLORER_TABS.highlights, label: 'Хайлайты' }
]
const CHAT_HIGHLIGHT_KIND_META = {
  pinned: { icon: '📌', label: 'Закреп' },
  poll: { icon: '📊', label: 'Опрос' },
  bookmark: { icon: '🔖', label: 'Сохранено' },
  reaction: { icon: '✨', label: 'Реакции' },
  forward: { icon: '↪', label: 'Переслано' },
  reply: { icon: '↩', label: 'Ответ' }
}
const FEED_FILTERS = {
  all: 'all',
  popular: 'popular',
  mine: 'mine',
  bookmarks: 'bookmarks'
}
const FEED_SORT_MODES = {
  latest: 'latest',
  smart: 'smart',
  engagement: 'engagement',
  discussed: 'discussed'
}
const FEED_TIME_WINDOWS = {
  all: 'all',
  day: 'day',
  week: 'week',
  month: 'month'
}
const FEED_LAYOUTS = {
  cards: 'cards',
  compact: 'compact'
}
const FEED_SORT_TABS = [
  { value: FEED_SORT_MODES.smart, label: 'Smart' },
  { value: FEED_SORT_MODES.latest, label: 'Новые' },
  { value: FEED_SORT_MODES.engagement, label: 'Хайп' },
  { value: FEED_SORT_MODES.discussed, label: 'Дискуссии' }
]
const FEED_TIME_TABS = [
  { value: FEED_TIME_WINDOWS.day, label: '24ч' },
  { value: FEED_TIME_WINDOWS.week, label: '7д' },
  { value: FEED_TIME_WINDOWS.month, label: '30д' },
  { value: FEED_TIME_WINDOWS.all, label: 'Все' }
]
const FEED_LAYOUT_TABS = [
  { value: FEED_LAYOUTS.cards, label: 'Cards' },
  { value: FEED_LAYOUTS.compact, label: 'Compact' }
]
const FEED_QUERY_MAX_LENGTH = 140
const DEFAULT_FEED_EXPLORER_SETTINGS = {
  sortMode: FEED_SORT_MODES.smart,
  timeWindow: FEED_TIME_WINDOWS.all,
  mediaOnly: false,
  layout: FEED_LAYOUTS.cards
}

function normalizeFeedFilterValue(value) {
  return Object.values(FEED_FILTERS).includes(value) ? value : FEED_FILTERS.all
}

function normalizeFeedQueryValue(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, FEED_QUERY_MAX_LENGTH)
}

function normalizeFeedExplorerSettings(value) {
  const source = value && typeof value === 'object' ? value : {}
  const sortMode = Object.values(FEED_SORT_MODES).includes(source.sortMode)
    ? source.sortMode
    : DEFAULT_FEED_EXPLORER_SETTINGS.sortMode
  const timeWindow = Object.values(FEED_TIME_WINDOWS).includes(source.timeWindow)
    ? source.timeWindow
    : DEFAULT_FEED_EXPLORER_SETTINGS.timeWindow
  const layout = Object.values(FEED_LAYOUTS).includes(source.layout)
    ? source.layout
    : DEFAULT_FEED_EXPLORER_SETTINGS.layout
  return {
    sortMode,
    timeWindow,
    mediaOnly: Boolean(source.mediaOnly),
    layout
  }
}
const CHAT_WALLPAPERS = [
  { value: 'default', label: 'Классика' },
  { value: 'aurora', label: 'Аврора' },
  { value: 'sunset', label: 'Закат' },
  { value: 'midnight', label: 'Ночь' },
  { value: 'grid', label: 'Сетка' }
]
const STATUS_EMOJI_PRESETS = ['🔥', '😎', '✨', '🌙', '🎯', '🚀', '💡', '🎧', '🤝', '🎮']
const PROFILE_WAVE_TEMPLATES = [
  '👋 Привет! Залетел в профиль и решил написать.',
  '⚡ Йо! У тебя крутой профиль, давай общаться.',
  '🔥 Хэй! Понравился стиль, хочу пообщаться.'
]
const PROFILE_COLOR_PRESETS = [
  { value: '#7a1f1d', label: 'Ruby' },
  { value: '#1f3f7a', label: 'Ocean' },
  { value: '#145c49', label: 'Forest' },
  { value: '#5c2d91', label: 'Violet' },
  { value: '#9a3412', label: 'Sunset' },
  { value: '#374151', label: 'Steel' }
]
const PROFILE_HERO_THEMES = [
  { value: 'default', label: 'Классика' },
  { value: 'sunset', label: 'Закат' },
  { value: 'ocean', label: 'Океан' },
  { value: 'forest', label: 'Лес' },
  { value: 'neon', label: 'Неон' }
]
const PROFILE_BADGE_OPTIONS = [
  { id: 'builder', emoji: '🛠️', label: 'Builder' },
  { id: 'designer', emoji: '🎨', label: 'Designer' },
  { id: 'mentor', emoji: '🧠', label: 'Mentor' },
  { id: 'gamer', emoji: '🎮', label: 'Gamer' },
  { id: 'music', emoji: '🎧', label: 'Music' },
  { id: 'rapid', emoji: '⚡', label: 'Rapid' },
  { id: 'night', emoji: '🌙', label: 'Night Owl' },
  { id: 'communicator', emoji: '💬', label: 'Communicator' }
]
const DEV_PROFILE_PRESETS = [
  {
    id: 'frontend',
    emoji: '🖥️',
    label: 'Frontend',
    headline: 'Frontend developer: UI, перформанс и UX.',
    skills: ['React', 'TypeScript', 'CSS', 'Vite'],
    badges: ['builder', 'designer', 'rapid'],
    heroTheme: 'ocean',
    accent: '#1f3f7a'
  },
  {
    id: 'backend',
    emoji: '🧱',
    label: 'Backend',
    headline: 'Backend engineer: API, базы данных, надежность.',
    skills: ['Node.js', 'Express', 'PostgreSQL', 'REST'],
    badges: ['builder', 'mentor', 'rapid'],
    heroTheme: 'forest',
    accent: '#145c49'
  },
  {
    id: 'fullstack',
    emoji: '🛠️',
    label: 'Fullstack',
    headline: 'Fullstack dev: от интерфейса до продакшн-API.',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    badges: ['builder', 'designer', 'mentor'],
    heroTheme: 'default',
    accent: '#374151'
  },
  {
    id: 'mobile',
    emoji: '📱',
    label: 'Mobile',
    headline: 'Mobile developer: быстрые и удобные приложения.',
    skills: ['Flutter', 'Dart', 'UI', 'Animations'],
    badges: ['builder', 'designer', 'communicator'],
    heroTheme: 'sunset',
    accent: '#9a3412'
  },
  {
    id: 'ai',
    emoji: '🤖',
    label: 'AI/ML',
    headline: 'AI engineer: автоматизация, модели и эксперименты.',
    skills: ['Python', 'ML', 'Prompting', 'APIs'],
    badges: ['mentor', 'rapid', 'night'],
    heroTheme: 'neon',
    accent: '#5c2d91'
  }
]
const DEV_TRACK_KEYWORDS = [
  { id: 'frontend', label: 'Frontend', keywords: ['react', 'vue', 'svelte', 'javascript', 'typescript', 'css', 'html', 'next', 'vite'] },
  { id: 'backend', label: 'Backend', keywords: ['node', 'express', 'nestjs', 'api', 'postgres', 'mysql', 'sql', 'redis', 'docker'] },
  { id: 'mobile', label: 'Mobile', keywords: ['flutter', 'dart', 'android', 'ios', 'kotlin', 'swift', 'react native'] },
  { id: 'data', label: 'Data/AI', keywords: ['python', 'ml', 'ai', 'llm', 'pandas', 'numpy', 'prompt', 'tensorflow'] },
  { id: 'devops', label: 'DevOps', keywords: ['ci', 'cd', 'kubernetes', 'devops', 'linux', 'nginx', 'monitoring', 'cloud'] }
]
const UI_STYLE_OPTIONS = [
  { value: 'glass', label: 'Glass' },
  { value: 'neo', label: 'Neo' },
  { value: 'classic', label: 'Classic' }
]
const UI_DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfort' },
  { value: 'spacious', label: 'Spacious' }
]
const DEFAULT_UI_PREFERENCES = {
  style: 'glass',
  density: 'comfortable',
  ambient: 58,
  radius: 22,
  syncAccent: true
}
const DEFAULT_PROFILE_SHOWCASE = {
  headline: '',
  heroTheme: 'default',
  skills: [],
  badges: [],
  links: []
}
const VIDEO_NOTE_KIND = 'video-note'
const VIDEO_NOTE_MAX_SECONDS = 60
const MENU_VIEWPORT_PADDING = 12
const MENU_ANCHOR_GAP = 8
const TOUCH_CONTEXT_MENU_DELAY_MS = 360
const TOUCH_CONTEXT_MENU_MOVE_THRESHOLD = 12
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
const INITIAL_MINI_PROFILE_CARD_STATE = {
  open: false,
  x: 0,
  y: 0,
  user: null
}
const MINI_PROFILE_CARD_ESTIMATED_WIDTH = 320
const MINI_PROFILE_CARD_ESTIMATED_HEIGHT = 220
const PROFILE_ACHIEVEMENTS_UNLOCKED_PREVIEW_LIMIT = 4
const PROFILE_ACHIEVEMENTS_LOCKED_PREVIEW_LIMIT = 2
const QUICK_MESSAGE_REACTIONS = ['❤️', '👍', '😭', '👎', '🤩', '🐳', '❤️‍🔥']
const ALL_MESSAGE_REACTIONS = Array.from(new Set([
  ...QUICK_MESSAGE_REACTIONS,
  '👌', '🔥', '🥰', '👏', '😃', '🤔', '🤯', '😱', '🎉', '🤬',
  '😢', '🙏', '🤝', '🫡', '💯', '🤣', '😇', '🥳', '😴', '😋',
  '😡', '💔', '💩', '😀', '👀', '🎃', '🙀', '🙉', '🙊', '🫶',
  '🤗', '🤤', '🤮', '🍾', '🍓', '🌭', '⚡', '🏆', '💋', '🤡',
  '💘', '🎯', '🫠', '😐', '😶', '🙃', '🫢', '🤌', '✌️', '👋'
]))

function clampNumber(value, min, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  return Math.min(max, Math.max(min, num))
}

function normalizeHexColor(value, fallback = '#7a1f1d') {
  const raw = String(value || '').trim()
  if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toLowerCase()
  if (/^#([0-9a-fA-F]{3})$/.test(raw)) {
    const short = raw.slice(1)
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase()
  }
  return fallback
}

function hexToRgb(hex) {
  const value = normalizeHexColor(hex).slice(1)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  }
}

function mixRgbColor(rgbA, rgbB, ratio) {
  const mixRatio = clampNumber(ratio, 0, 1)
  return {
    r: Math.round(rgbA.r + (rgbB.r - rgbA.r) * mixRatio),
    g: Math.round(rgbA.g + (rgbB.g - rgbA.g) * mixRatio),
    b: Math.round(rgbA.b + (rgbB.b - rgbA.b) * mixRatio)
  }
}

function rgbToHex(rgb) {
  const toHex = (channel) => clampNumber(channel, 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

function rgbToCssTriplet(rgb) {
  return `${clampNumber(rgb.r, 0, 255)} ${clampNumber(rgb.g, 0, 255)} ${clampNumber(rgb.b, 0, 255)}`
}

function rgbToHsl(rgb) {
  const r = clampNumber(rgb.r, 0, 255) / 255
  const g = clampNumber(rgb.g, 0, 255) / 255
  const b = clampNumber(rgb.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  const l = (max + min) / 2
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6)
        break
      case g:
        h = 60 * (((b - r) / delta) + 2)
        break
      default:
        h = 60 * (((r - g) / delta) + 4)
        break
    }
  }

  if (h < 0) h += 360
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function hslToRgb(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360
  const sat = clampNumber(s, 0, 100) / 100
  const lig = clampNumber(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (hue < 60) {
    r = c; g = x; b = 0
  } else if (hue < 120) {
    r = x; g = c; b = 0
  } else if (hue < 180) {
    r = 0; g = c; b = x
  } else if (hue < 240) {
    r = 0; g = x; b = c
  } else if (hue < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function hslToHex(h, s, l) {
  return rgbToHex(hslToRgb(h, s, l))
}

function normalizeUiPreferences(value) {
  const source = value && typeof value === 'object' ? value : {}
  const style = UI_STYLE_OPTIONS.some((item) => item.value === source.style)
    ? source.style
    : DEFAULT_UI_PREFERENCES.style
  const density = UI_DENSITY_OPTIONS.some((item) => item.value === source.density)
    ? source.density
    : DEFAULT_UI_PREFERENCES.density
  const ambient = clampNumber(source.ambient, 0, 100)
  const radius = clampNumber(source.radius, 12, 36)
  const syncAccent = source.syncAccent !== false
  return {
    style,
    density,
    ambient,
    radius,
    syncAccent
  }
}

function normalizeProfileShowcase(value) {
  const source = value && typeof value === 'object' ? value : {}
  const heroTheme = PROFILE_HERO_THEMES.some((item) => item.value === source.heroTheme)
    ? source.heroTheme
    : DEFAULT_PROFILE_SHOWCASE.heroTheme
  const headline = String(source.headline || '').trim().slice(0, 120)
  const skills = Array.isArray(source.skills)
    ? source.skills
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8)
    : []
  const allowedBadgeIds = new Set(PROFILE_BADGE_OPTIONS.map((item) => item.id))
  const badges = Array.isArray(source.badges)
    ? source.badges
      .map((item) => String(item || '').trim())
      .filter((item) => allowedBadgeIds.has(item))
      .slice(0, 6)
    : []
  const links = Array.isArray(source.links)
    ? source.links
      .map((item) => {
        const label = String(item && item.label || '').trim().slice(0, 30)
        const url = String(item && item.url || '').trim().slice(0, 240)
        if (!label || !url) return null
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
        return { label, url: normalizedUrl }
      })
      .filter(Boolean)
      .slice(0, 2)
    : []
  return {
    headline,
    heroTheme,
    skills,
    badges,
    links
  }
}

function mapShowcaseToForm(showcase) {
  const normalized = normalizeProfileShowcase(showcase)
  return {
    headline: normalized.headline,
    heroTheme: normalized.heroTheme,
    skillsInput: normalized.skills.join(', '),
    badges: normalized.badges,
    linkPrimaryLabel: normalized.links[0] ? normalized.links[0].label : '',
    linkPrimaryUrl: normalized.links[0] ? normalized.links[0].url : '',
    linkSecondaryLabel: normalized.links[1] ? normalized.links[1].label : '',
    linkSecondaryUrl: normalized.links[1] ? normalized.links[1].url : ''
  }
}

function mapFormToShowcase(formValue) {
  const form = formValue && typeof formValue === 'object' ? formValue : {}
  const skills = String(form.skillsInput || '')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
  const badges = Array.isArray(form.badges) ? form.badges : []
  const links = []
  const firstLabel = String(form.linkPrimaryLabel || '').trim().slice(0, 30)
  const firstUrl = String(form.linkPrimaryUrl || '').trim().slice(0, 240)
  const secondLabel = String(form.linkSecondaryLabel || '').trim().slice(0, 30)
  const secondUrl = String(form.linkSecondaryUrl || '').trim().slice(0, 240)
  if (firstLabel && firstUrl) {
    links.push({ label: firstLabel, url: firstUrl })
  }
  if (secondLabel && secondUrl) {
    links.push({ label: secondLabel, url: secondUrl })
  }
  return normalizeProfileShowcase({
    headline: String(form.headline || '').trim().slice(0, 120),
    heroTheme: form.heroTheme,
    skills,
    badges,
    links
  })
}

function mergeSkillsInput(currentInput, skillsToAdd) {
  const existing = String(currentInput || '')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  const existingSet = new Set(existing.map((item) => item.toLowerCase()))
  const merged = [...existing]
  ;(Array.isArray(skillsToAdd) ? skillsToAdd : []).forEach((skill) => {
    const normalized = String(skill || '').trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (existingSet.has(key)) return
    existingSet.add(key)
    merged.push(normalized)
  })
  return merged.slice(0, 8).join(', ')
}

function buildDeveloperSnapshot(showcase, roleValue, postsCount = 0) {
  const normalized = normalizeProfileShowcase(showcase)
  const skills = normalized.skills.map((item) => String(item || '').toLowerCase())
  const tracks = DEV_TRACK_KEYWORDS.map((track) => {
    const score = track.keywords.reduce((acc, keyword) => {
      const hit = skills.some((skill) => skill.includes(keyword))
      return acc + (hit ? 1 : 0)
    }, 0)
    return {
      id: track.id,
      label: track.label,
      score
    }
  })
  const activeTracks = tracks.filter((track) => track.score > 0)
  const primary = activeTracks
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.label.localeCompare(b.label)
    })[0] || null
  const role = String(roleValue || '').toLowerCase()
  const roleBonus = role.includes('program') || role.includes('dev') ? 14 : 0
  const coverageBonus = Math.min(35, activeTracks.length * 9)
  const skillBonus = Math.min(35, normalized.skills.length * 5)
  const activityBonus = Math.min(16, Number(postsCount || 0) * 2)
  const total = clampNumber(Math.round(roleBonus + coverageBonus + skillBonus + activityBonus), 0, 100)
  const level = total >= 80 ? 'Архитектор' : total >= 60 ? 'Продвинутый' : total >= 35 ? 'Уверенный' : 'Старт'
  return {
    score: total,
    level,
    primaryTrack: primary ? primary.label : 'General',
    activeTracks: activeTracks
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }
}

function normalizeProfileShowcaseMap(value) {
  const source = value && typeof value === 'object' ? value : {}
  return Object.keys(source).reduce((acc, key) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) return acc
    acc[normalizedKey] = normalizeProfileShowcase(source[key])
    return acc
  }, {})
}

function calculateProfilePowerScore(profile, postsCount, tracksCount, showcase) {
  if (!profile) return 0
  let score = 0
  if (profile.avatarUrl) score += 12
  if (profile.bannerUrl) score += 10
  if (String(profile.bio || '').trim().length >= 40) score += 14
  if (String(profile.statusText || '').trim()) score += 8
  if (String(profile.statusEmoji || '').trim()) score += 4
  if (Number(profile.subscribersCount || 0) >= 10) score += 12
  if (Number(profile.subscribersCount || 0) >= 50) score += 8
  if (postsCount >= 3) score += 10
  if (postsCount >= 10) score += 5
  if (tracksCount >= 2) score += 8
  if (tracksCount >= 6) score += 5
  if (showcase && showcase.headline) score += 2
  if (showcase && showcase.skills && showcase.skills.length >= 3) score += 2
  return clampNumber(Math.round(score), 0, 100)
}

function buildProfileAchievements(profile, postsCount, tracksCount, showcase) {
  if (!profile) return { unlocked: [], locked: [], total: 0 }

  const followers = Number(profile.subscribersCount || 0)
  const bioLength = String(profile.bio || '').trim().length
  const hasAvatar = Boolean(profile.avatarUrl)
  const hasBanner = Boolean(profile.bannerUrl)
  const hasDisplayName = String(profile.displayName || profile.username || '').trim().length >= 2
  const hasStatus = String(profile.statusText || '').trim().length >= 3 || String(profile.statusEmoji || '').trim().length > 0
  const showcaseSkills = Array.isArray(showcase && showcase.skills) ? showcase.skills.length : 0
  const showcaseBadges = Array.isArray(showcase && showcase.badges) ? showcase.badges.length : 0
  const showcaseLinks = Array.isArray(showcase && showcase.links) ? showcase.links.length : 0
  const hasShowcaseHeadline = Boolean(showcase && String(showcase.headline || '').trim())
  const createdAtMs = Date.parse(profile.createdAt || '')
  const accountAgeDays = Number.isFinite(createdAtMs) && createdAtMs > 0
    ? Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24))
    : 0

  const achievementRules = [
    {
      id: 'registered',
      emoji: '🪪',
      title: 'Первые шаги',
      description: 'Выдано сразу после регистрации аккаунта.',
      requirement: 'Создать аккаунт',
      tier: 'starter',
      unlocked: true
    },
    {
      id: 'identity',
      emoji: '🧬',
      title: 'Узнаваемый образ',
      description: 'Профиль выглядит живым и персональным.',
      requirement: 'Аватар + имя + статус или bio 40+',
      tier: 'growth',
      unlocked: hasAvatar && hasDisplayName && (hasStatus || bioLength >= 40)
    },
    {
      id: 'author',
      emoji: '📰',
      title: 'Автор ленты',
      description: 'Пользователь стабильно публикуется.',
      requirement: 'Опубликовать 12+ постов',
      tier: 'growth',
      unlocked: postsCount >= 12
    },
    {
      id: 'audience',
      emoji: '📣',
      title: 'Сила сообщества',
      description: 'Профиль собирает активную аудиторию.',
      requirement: 'Набрать 30+ подписчиков',
      tier: 'growth',
      unlocked: followers >= 30
    },
    {
      id: 'music',
      emoji: '🎧',
      title: 'Музыкальный куратор',
      description: 'Сформирована большая музыкальная полка.',
      requirement: 'Добавить 6+ треков',
      tier: 'pro',
      unlocked: tracksCount >= 6
    },
    {
      id: 'showcase',
      emoji: '✨',
      title: 'Showcase Pro',
      description: 'Оформление профиля выведено на высокий уровень.',
      requirement: 'Headline + 4 навыка + 3 бейджа + ссылка',
      tier: 'pro',
      unlocked: hasShowcaseHeadline && showcaseSkills >= 4 && showcaseBadges >= 3 && showcaseLinks >= 1
    },
    {
      id: 'consistency',
      emoji: '🛡️',
      title: 'Стабильный автор',
      description: 'Долгая активность подтверждена временем.',
      requirement: '30+ дней в сервисе и 5+ постов (или 3+ треков)',
      tier: 'pro',
      unlocked: accountAgeDays >= 30 && (postsCount >= 5 || tracksCount >= 3)
    },
    {
      id: 'legend',
      emoji: '👑',
      title: 'Легенда профиля',
      description: 'Топовый уровень оформления и вклада в платформу.',
      requirement: 'Баннер + bio 80+ + 20+ постов + 8+ треков + 60+ подписчиков',
      tier: 'legend',
      unlocked: hasBanner && bioLength >= 80 && postsCount >= 20 && tracksCount >= 8 && followers >= 60
    }
  ]

  const unlocked = achievementRules.filter((item) => item.unlocked)
  const locked = achievementRules.filter((item) => !item.unlocked)

  return {
    unlocked,
    locked,
    total: achievementRules.length
  }
}
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

function isIosPlatform() {
  if (typeof navigator === 'undefined') return false
  const ua = String(navigator.userAgent || '')
  const platform = String(navigator.platform || '')
  const touchPoints = Number(navigator.maxTouchPoints || 0)
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1)
}

function clampAvatarZoom(value) {
  return Math.min(AVATAR_ZOOM_MAX, Math.max(AVATAR_ZOOM_MIN, value))
}

function clampBannerZoom(value) {
  return Math.min(BANNER_ZOOM_MAX, Math.max(BANNER_ZOOM_MIN, value))
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

function normalizeForwardedFrom(value) {
  if (!value || typeof value !== 'object') return null
  return {
    sourceMessageId: value.sourceMessageId || null,
    sourceSenderId: value.sourceSenderId || null,
    sourceSenderUsername: value.sourceSenderUsername || null,
    sourceSenderDisplayName: value.sourceSenderDisplayName || null,
    sourceConversationId: value.sourceConversationId || null
  }
}

function normalizeChatMessage(message) {
  if (!message || typeof message !== 'object') return message
  return {
    ...message,
    replyTo: normalizeReplyMessage(message.replyTo),
    forwardedFrom: normalizeForwardedFrom(message.forwardedFrom),
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
  const [twoFactorLogin, setTwoFactorLogin] = useState({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })
  const [profileForm, setProfileForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    statusText: '',
    statusEmoji: '',
    role: 'student',
    themeColor: '#7a1f1d'
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [settingsSection, setSettingsSection] = useState('general')
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
  const [uiPreferences, setUiPreferences] = useState(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_UI_PREFERENCES }
    try {
      const parsed = JSON.parse(localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) || '{}')
      return normalizeUiPreferences(parsed)
    } catch (err) {
      return { ...DEFAULT_UI_PREFERENCES }
    }
  })
  const [profileShowcaseByUserId, setProfileShowcaseByUserId] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILE_SHOWCASE_STORAGE_KEY) || '{}')
      return normalizeProfileShowcaseMap(parsed)
    } catch (err) {
      return {}
    }
  })
  const [profileShowcaseForm, setProfileShowcaseForm] = useState(() => mapShowcaseToForm(DEFAULT_PROFILE_SHOWCASE))
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [replyMessage, setReplyMessage] = useState(null)
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false)
  const [bookmarkPanelLoading, setBookmarkPanelLoading] = useState(false)
  const [conversationBookmarks, setConversationBookmarks] = useState([])
  const [bookmarkedMessageIdsByConversation, setBookmarkedMessageIdsByConversation] = useState({})
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false)
  const [forwardSourceMessage, setForwardSourceMessage] = useState(null)
  const [forwardConversationId, setForwardConversationId] = useState('')
  const [forwardQuery, setForwardQuery] = useState('')
  const [forwardComment, setForwardComment] = useState('')
  const [forwardLoading, setForwardLoading] = useState(false)
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
  const [feedAuthorFilter, setFeedAuthorFilter] = useState('')
  const [isFeedToolboxOpen, setIsFeedToolboxOpen] = useState(false)
  const [isFeedInsightsOpen, setIsFeedInsightsOpen] = useState(false)
  const [dashboardFeedQuery, setDashboardFeedQuery] = useState('')
  const [dashboardRefreshLoading, setDashboardRefreshLoading] = useState(false)
  const [dashboardCommandInput, setDashboardCommandInput] = useState('')
  const [globalPaletteOpen, setGlobalPaletteOpen] = useState(false)
  const [globalPaletteQuery, setGlobalPaletteQuery] = useState('')
  const [globalPaletteUsers, setGlobalPaletteUsers] = useState([])
  const [globalPaletteLoading, setGlobalPaletteLoading] = useState(false)
  const [dashboardCommandHistory, setDashboardCommandHistory] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const parsed = JSON.parse(localStorage.getItem(DASHBOARD_COMMAND_HISTORY_STORAGE_KEY) || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 10)
    } catch (err) {
      return []
    }
  })
  const [dashboardPreferences, setDashboardPreferences] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        focusMode: false,
        autoRefresh: false
      }
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) || '{}')
      return {
        focusMode: parsed && parsed.focusMode === true,
        autoRefresh: parsed && parsed.autoRefresh === true
      }
    } catch (err) {
      return {
        focusMode: false,
        autoRefresh: false
      }
    }
  })
  const [dashboardLastRefreshAt, setDashboardLastRefreshAt] = useState(null)
  const [feedExplorer, setFeedExplorer] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(FEED_EXPLORER_STORAGE_KEY) || '{}')
      return normalizeFeedExplorerSettings(parsed)
    } catch (err) {
      return { ...DEFAULT_FEED_EXPLORER_SETTINGS }
    }
  })
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
  const [bannerModalOpen, setBannerModalOpen] = useState(false)
  const [bannerSource, setBannerSource] = useState('')
  const [bannerZoom, setBannerZoom] = useState(BANNER_ZOOM_MIN)
  const [bannerOffset, setBannerOffset] = useState({ x: 0, y: 0 })
  const [bannerDragStart, setBannerDragStart] = useState(null)
  const [profileView, setProfileView] = useState(null)
  const [profileBackView, setProfileBackView] = useState('feed')
  const [profilePrivacy, setProfilePrivacy] = useState({ ...DEFAULT_PRIVACY_RELATION })
  const [profilePosts, setProfilePosts] = useState([])
  const [profileTracks, setProfileTracks] = useState([])
  const [profilePostFilter, setProfilePostFilter] = useState('all')
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
  const [chatExplorerOpen, setChatExplorerOpen] = useState(false)
  const [chatExplorerTab, setChatExplorerTab] = useState(CHAT_EXPLORER_TABS.overview)
  const [chatExplorerQuery, setChatExplorerQuery] = useState('')
  const [chatMobilePane, setChatMobilePane] = useState('list')
  const [pinnedByConversation, setPinnedByConversation] = useState({})
  const [privacyByUsername, setPrivacyByUsername] = useState({})
  const [privacyControls, setPrivacyControls] = useState([])
  const [privacyControlsLoading, setPrivacyControlsLoading] = useState(false)
  const [privacyQuickUsername, setPrivacyQuickUsername] = useState('')
  const [privacyQuickUsers, setPrivacyQuickUsers] = useState([])
  const [privacyQuickLoading, setPrivacyQuickLoading] = useState(false)
  const [privacyQuickSearchLoading, setPrivacyQuickSearchLoading] = useState(false)
  const [privacyQuickFlags, setPrivacyQuickFlags] = useState({
    isMuted: false,
    isBlocked: false,
    hideProfileContent: false,
    denyDm: true
  })
  const [blockedUsers, setBlockedUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState({ ...DEFAULT_TWO_FACTOR_STATUS })
  const [twoFactorSetup, setTwoFactorSetup] = useState(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorBackupCode, setTwoFactorBackupCode] = useState('')
  const [freshBackupCodes, setFreshBackupCodes] = useState([])
  const [callState, setCallState] = useState({ status: 'idle', withUserId: null, direction: null, startedAt: null })
  const [callDuration, setCallDuration] = useState(0)
  const [remoteStream, setRemoteStream] = useState(null)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingPostText, setEditingPostText] = useState('')
  const [adminQuery, setAdminQuery] = useState('')
  const [adminUsers, setAdminUsers] = useState([])
  const [adminWarnReason, setAdminWarnReason] = useState({})
  const [adminResetPasswordByUser, setAdminResetPasswordByUser] = useState({})
  const [adminRoleDraft, setAdminRoleDraft] = useState({ value: '', label: '' })
  const [adminRoleByUser, setAdminRoleByUser] = useState({})
  const [adminVerificationRequests, setAdminVerificationRequests] = useState([])
  const [adminVerificationFilter, setAdminVerificationFilter] = useState('pending')
  const [adminVerificationLoading, setAdminVerificationLoading] = useState(false)
  const [adminVerificationNoteByRequest, setAdminVerificationNoteByRequest] = useState({})
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [verificationForm, setVerificationForm] = useState({ ...initialVerificationForm })
  const [verificationSubmitting, setVerificationSubmitting] = useState(false)
  const [lightboxImage, setLightboxImage] = useState('')
  const [miniProfileCard, setMiniProfileCard] = useState(INITIAL_MINI_PROFILE_CARD_STATE)
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
  const dashboardRefreshLoadingRef = useRef(false)
  const callStateRef = useRef(callState)
  const blockedUsersRef = useRef(blockedUsers)
  const privacyByUsernameRef = useRef(privacyByUsername)
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
  const feedQueryInputRef = useRef(null)
  const composerInputRef = useRef(null)
  const globalPaletteInputRef = useRef(null)
  const globalPaletteSearchSeqRef = useRef(0)
  const privacyQuickSearchSeqRef = useRef(0)
  const contextMenuRef = useRef(null)
  const postMenuRef = useRef(null)
  const chatMenuRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const bannerPreviewRef = useRef(null)
  const previousMessageMetaRef = useRef({ conversationId: null, count: 0, lastMessageId: null })
  const previousViewRef = useRef(view)
  const profileThemeWheelRef = useRef(null)
  const profileThemeWheelPointerRef = useRef(null)
  const miniProfileOpenTimerRef = useRef(null)
  const miniProfileCloseTimerRef = useRef(null)
  const miniProfileCacheRef = useRef(new Map())
  const miniProfileLoadingRef = useRef(new Set())
  const touchContextMenuRef = useRef({
    timer: null,
    startX: 0,
    startY: 0,
    target: null,
    currentTarget: null,
    onTrigger: null,
    triggered: false
  })

  const setCallStateSync = (nextState) => {
    callStateRef.current = nextState
    setCallState(nextState)
  }

  const roleOptions = useMemo(() => (roles.length ? roles : fallbackRoles), [roles])
  const roleLabelByValue = useMemo(() => (
    new Map(roleOptions.map((item) => [String(item.value || ''), item.label]))
  ), [roleOptions])
  const pinnedMessage = useMemo(() => {
    if (!activeConversation) return null
    return pinnedByConversation[activeConversation.id] || null
  }, [activeConversation, pinnedByConversation])
  const activeConversationPrivacy = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup || !activeConversation.other) {
      return { ...DEFAULT_PRIVACY_RELATION }
    }
    const username = String(activeConversation.other.username || '').trim().toLowerCase()
    if (!username) return { ...DEFAULT_PRIVACY_RELATION }
    const cached = privacyByUsername[username]
    return normalizePrivacyRelation(cached)
  }, [activeConversation, privacyByUsername])
  const isChatBlocked = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup) return false
    return activeConversationPrivacy.isBlocked || activeConversationPrivacy.blockedByTarget || activeConversationPrivacy.dmBlocked
  }, [activeConversation, activeConversationPrivacy])
  const filteredMessages = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase()
    if (!query) return messages
    return messages.filter((msg) => (msg.body || '').toLowerCase().includes(query))
  }, [messages, chatSearchQuery])
  const chatExplorerQueryNormalized = chatExplorerQuery.trim().toLowerCase()
  const chatExplorerMediaItems = useMemo(() => {
    return messages
      .filter((msg) => Boolean(msg && msg.id && msg.attachmentUrl))
      .map((msg) => {
        const family = getMessageAttachmentFamily(msg)
        return {
          id: `media-${msg.id}`,
          messageId: msg.id,
          url: resolveMediaUrl(msg.attachmentUrl),
          family,
          preview: getMessagePreviewLabel(msg, 'Медиа'),
          body: String(msg.body || '').trim(),
          createdAt: msg.createdAt || null,
          senderId: msg.senderId || null,
          senderUsername: msg.senderUsername || '',
          senderDisplayName: msg.senderDisplayName || ''
        }
      })
      .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
  }, [messages])
  const chatExplorerLinkItems = useMemo(() => {
    const rows = []
    messages.forEach((msg) => {
      const urls = extractUrls(msg && msg.body)
      if (!urls.length) return
      urls.forEach((url, index) => {
        rows.push({
          id: `link-${msg.id}-${index}`,
          messageId: msg.id,
          url,
          hostname: getUrlHostname(url),
          preview: String(msg.body || '').trim(),
          createdAt: msg.createdAt || null,
          senderId: msg.senderId || null,
          senderUsername: msg.senderUsername || '',
          senderDisplayName: msg.senderDisplayName || ''
        })
      })
    })
    return rows.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
  }, [messages])
  const chatExplorerTopSenders = useMemo(() => {
    const map = new Map()
    messages.forEach((msg) => {
      if (!msg || !msg.id || !msg.senderId) return
      const key = msg.senderId
      const current = map.get(key) || {
        id: key,
        senderId: key,
        label: (user && msg.senderId === user.id) ? 'Вы' : (msg.senderDisplayName || msg.senderUsername || 'Пользователь'),
        username: msg.senderUsername || '',
        count: 0,
        mediaCount: 0,
        reactionScore: 0
      }
      current.count += 1
      if (msg.attachmentUrl) current.mediaCount += 1
      current.reactionScore += getMessageReactionScore(msg)
      map.set(key, current)
    })
    return Array.from(map.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        if (b.reactionScore !== a.reactionScore) return b.reactionScore - a.reactionScore
        return a.label.localeCompare(b.label)
      })
      .slice(0, 6)
  }, [messages, user])
  const chatExplorerReactionSummary = useMemo(() => {
    const totals = new Map()
    messages.forEach((msg) => {
      if (!Array.isArray(msg.reactions)) return
      msg.reactions.forEach((item) => {
        const emoji = String(item.emoji || '')
        if (!emoji) return
        const count = Math.max(0, Number(item.count || 0))
        totals.set(emoji, (totals.get(emoji) || 0) + count)
      })
    })
    return Array.from(totals.entries())
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.emoji.localeCompare(b.emoji)
      })
      .slice(0, 12)
  }, [messages])
  const chatExplorerTimelineDays = useMemo(() => {
    const dayMap = new Map()
    messages.forEach((msg) => {
      const createdMs = Date.parse(msg.createdAt || '') || 0
      if (!createdMs) return
      const dateKey = new Date(createdMs).toISOString().slice(0, 10)
      const current = dayMap.get(dateKey) || {
        key: dateKey,
        dateLabel: formatDate(msg.createdAt),
        count: 0,
        firstMessageId: msg.id,
        lastMessageId: msg.id,
        firstMs: createdMs,
        lastMs: createdMs
      }
      current.count += 1
      if (createdMs < current.firstMs) {
        current.firstMs = createdMs
        current.firstMessageId = msg.id
      }
      if (createdMs > current.lastMs) {
        current.lastMs = createdMs
        current.lastMessageId = msg.id
      }
      dayMap.set(dateKey, current)
    })
    return Array.from(dayMap.values())
      .sort((a, b) => b.lastMs - a.lastMs)
      .slice(0, 8)
  }, [messages])
  const chatExplorerHighlights = useMemo(() => {
    const explorerBookmarkedMessageIds = activeConversation && activeConversation.id
      ? new Set(bookmarkedMessageIdsByConversation[activeConversation.id] || [])
      : new Set()
    const entries = []
    const pushEntry = (entry) => {
      if (!entry || !entry.id || !entry.messageId) return
      entries.push(entry)
    }
    if (pinnedMessage && pinnedMessage.id) {
      pushEntry({
        id: `highlight-pinned-${pinnedMessage.id}`,
        messageId: pinnedMessage.id,
        kind: 'pinned',
        title: 'Закрепленное сообщение',
        subtitle: pinnedMessage.senderUsername ? `@${pinnedMessage.senderUsername}` : '',
        preview: getMessagePreviewLabel(pinnedMessage, 'Сообщение'),
        score: 1000000,
        createdAt: pinnedMessage.createdAt || null
      })
    }
    messages.forEach((msg) => {
      if (!msg || !msg.id) return
      const reactionScore = getMessageReactionScore(msg)
      const bookmarked = explorerBookmarkedMessageIds.has(msg.id)
      if (msg.poll) {
        pushEntry({
          id: `highlight-poll-${msg.id}`,
          messageId: msg.id,
          kind: 'poll',
          title: 'Опрос',
          subtitle: (user && msg.senderId === user.id) ? 'Вы' : (msg.senderDisplayName || msg.senderUsername || 'Пользователь'),
          preview: getMessagePreviewLabel(msg, 'Опрос'),
          score: 300 + reactionScore + Math.max(0, Number(msg.poll.totalVotes || 0)),
          createdAt: msg.createdAt || null
        })
      }
      if (bookmarked) {
        pushEntry({
          id: `highlight-bookmark-${msg.id}`,
          messageId: msg.id,
          kind: 'bookmark',
          title: 'Сохраненное',
          subtitle: (user && msg.senderId === user.id) ? 'Вы' : (msg.senderDisplayName || msg.senderUsername || 'Пользователь'),
          preview: getMessagePreviewLabel(msg, 'Сообщение'),
          score: 220 + reactionScore,
          createdAt: msg.createdAt || null
        })
      }
      if (reactionScore > 0) {
        pushEntry({
          id: `highlight-react-${msg.id}`,
          messageId: msg.id,
          kind: 'reaction',
          title: `Реакции • ${reactionScore}`,
          subtitle: (user && msg.senderId === user.id) ? 'Вы' : (msg.senderDisplayName || msg.senderUsername || 'Пользователь'),
          preview: getMessagePreviewLabel(msg, 'Сообщение'),
          score: 100 + reactionScore,
          createdAt: msg.createdAt || null
        })
      }
      if (msg.forwardedFrom) {
        pushEntry({
          id: `highlight-fwd-${msg.id}`,
          messageId: msg.id,
          kind: 'forward',
          title: 'Переслано',
          subtitle: msg.forwardedFrom.sourceSenderUsername ? `@${msg.forwardedFrom.sourceSenderUsername}` : '',
          preview: getMessagePreviewLabel(msg, 'Сообщение'),
          score: 70 + reactionScore,
          createdAt: msg.createdAt || null
        })
      }
      if (msg.replyTo) {
        pushEntry({
          id: `highlight-reply-${msg.id}`,
          messageId: msg.id,
          kind: 'reply',
          title: 'Ответ',
          subtitle: (user && msg.senderId === user.id) ? 'Вы' : (msg.senderDisplayName || msg.senderUsername || 'Пользователь'),
          preview: getMessagePreviewLabel(msg, 'Сообщение'),
          score: 60 + reactionScore,
          createdAt: msg.createdAt || null
        })
      }
    })
    const dedupByMessage = new Map()
    entries.forEach((entry) => {
      const existing = dedupByMessage.get(entry.messageId)
      if (!existing || entry.score > existing.score) {
        dedupByMessage.set(entry.messageId, entry)
      }
    })
    return Array.from(dedupByMessage.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)
      })
      .slice(0, 24)
  }, [messages, pinnedMessage, activeConversation, bookmarkedMessageIdsByConversation, user])
  const chatExplorerStats = useMemo(() => {
    const mediaCount = chatExplorerMediaItems.length
    const linksCount = chatExplorerLinkItems.length
    const pollsCount = messages.reduce((acc, msg) => acc + (msg && msg.poll ? 1 : 0), 0)
    const reactionMessages = messages.reduce((acc, msg) => acc + (getMessageReactionScore(msg) > 0 ? 1 : 0), 0)
    const replyCount = messages.reduce((acc, msg) => acc + (msg && msg.replyTo ? 1 : 0), 0)
    const uniqueSenders = new Set(messages.map((msg) => msg && msg.senderId).filter(Boolean)).size
    return {
      messages: messages.length,
      media: mediaCount,
      links: linksCount,
      polls: pollsCount,
      reactionMessages,
      replies: replyCount,
      uniqueSenders
    }
  }, [messages, chatExplorerMediaItems.length, chatExplorerLinkItems.length])
  const chatExplorerLatestPollMessage = useMemo(() => (
    [...messages].reverse().find((msg) => msg && msg.poll) || null
  ), [messages])
  const chatExplorerTopReactedMessage = useMemo(() => (
    [...messages]
      .filter((msg) => getMessageReactionScore(msg) > 0)
      .sort((a, b) => {
        const scoreDiff = getMessageReactionScore(b) - getMessageReactionScore(a)
        if (scoreDiff !== 0) return scoreDiff
        return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)
      })[0] || null
  ), [messages])
  const chatExplorerFirstMessage = messages.length > 0 ? messages[0] : null
  const filteredChatExplorerMediaItems = useMemo(() => {
    if (!chatExplorerQueryNormalized) return chatExplorerMediaItems
    return chatExplorerMediaItems.filter((item) => (
      item.family.includes(chatExplorerQueryNormalized) ||
      item.preview.toLowerCase().includes(chatExplorerQueryNormalized) ||
      item.body.toLowerCase().includes(chatExplorerQueryNormalized) ||
      String(item.senderDisplayName || item.senderUsername || '').toLowerCase().includes(chatExplorerQueryNormalized)
    ))
  }, [chatExplorerMediaItems, chatExplorerQueryNormalized])
  const filteredChatExplorerLinkItems = useMemo(() => {
    if (!chatExplorerQueryNormalized) return chatExplorerLinkItems
    return chatExplorerLinkItems.filter((item) => (
      item.url.toLowerCase().includes(chatExplorerQueryNormalized) ||
      item.hostname.toLowerCase().includes(chatExplorerQueryNormalized) ||
      item.preview.toLowerCase().includes(chatExplorerQueryNormalized) ||
      String(item.senderDisplayName || item.senderUsername || '').toLowerCase().includes(chatExplorerQueryNormalized)
    ))
  }, [chatExplorerLinkItems, chatExplorerQueryNormalized])
  const filteredChatExplorerHighlights = useMemo(() => {
    if (!chatExplorerQueryNormalized) return chatExplorerHighlights
    return chatExplorerHighlights.filter((item) => (
      String(item.kind || '').toLowerCase().includes(chatExplorerQueryNormalized) ||
      String(item.title || '').toLowerCase().includes(chatExplorerQueryNormalized) ||
      String(item.subtitle || '').toLowerCase().includes(chatExplorerQueryNormalized) ||
      String(item.preview || '').toLowerCase().includes(chatExplorerQueryNormalized)
    ))
  }, [chatExplorerHighlights, chatExplorerQueryNormalized])
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
      const aPersonalFavorites = a.isPersonalFavorites === true
      const bPersonalFavorites = b.isPersonalFavorites === true
      if (aPersonalFavorites !== bPersonalFavorites) return aPersonalFavorites ? -1 : 1
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
  const forwardQueryNormalized = forwardQuery.trim().toLowerCase()
  const forwardConversationOptions = useMemo(() => {
    const base = [...conversations].sort((a, b) => {
      const aTime = Date.parse(a.lastAt || '') || 0
      const bTime = Date.parse(b.lastAt || '') || 0
      return bTime - aTime
    })
    if (!forwardQueryNormalized) return base
    return base.filter((conversation) => {
      const title = getConversationDisplayName(conversation, chatAliasByConversation).toLowerCase()
      const username = String(conversation && conversation.other && conversation.other.username || '').toLowerCase()
      return title.includes(forwardQueryNormalized) || username.includes(forwardQueryNormalized)
    })
  }, [conversations, chatAliasByConversation, forwardQueryNormalized])
  const userMoodLabel = useMemo(() => getProfileMoodLabel(user), [user])
  const profileViewMoodLabel = useMemo(() => getProfileMoodLabel(profileView), [profileView])
  const myPostsCount = useMemo(() => {
    if (!user || !user.id) return 0
    return posts.reduce((count, post) => (
      post && post.author && post.author.id === user.id ? count + 1 : count
    ), 0)
  }, [posts, user ? user.id : null])
  const currentUserShowcase = useMemo(() => {
    if (!user || !user.id) return normalizeProfileShowcase(DEFAULT_PROFILE_SHOWCASE)
    return normalizeProfileShowcase(profileShowcaseByUserId[user.id])
  }, [profileShowcaseByUserId, user ? user.id : null])
  const profileShowcase = useMemo(() => {
    if (!profileView || !profileView.id) return normalizeProfileShowcase(DEFAULT_PROFILE_SHOWCASE)
    return normalizeProfileShowcase(profileShowcaseByUserId[profileView.id])
  }, [profileShowcaseByUserId, profileView ? profileView.id : null])
  const profileEditorChecklist = useMemo(() => {
    const showcaseDraft = mapFormToShowcase(profileShowcaseForm)
    return [
      { id: 'avatar', label: 'Аватар установлен', done: Boolean(user && user.avatarUrl) },
      { id: 'banner', label: 'Обложка добавлена', done: Boolean(user && user.bannerUrl) },
      { id: 'name', label: 'Есть отображаемое имя', done: String(profileForm.displayName || '').trim().length >= 2 },
      { id: 'status', label: 'Заполнен статус', done: String(profileForm.statusText || '').trim().length >= 3 },
      { id: 'bio', label: 'Bio 40+ символов', done: String(profileForm.bio || '').trim().length >= 40 },
      { id: 'theme', label: 'Выбрана тема профиля', done: Boolean(profileForm.themeColor) },
      { id: 'tracks', label: 'Есть музыка в профиле', done: myTracks.length > 0 },
      { id: 'posts', label: 'Опубликованы посты', done: myPostsCount > 0 },
      { id: 'dev-stack', label: 'Заполнен dev-стек (3+ skills)', done: showcaseDraft.skills.length >= 3 },
      { id: 'showcase', label: 'Настроен Showcase', done: Boolean(showcaseDraft.headline || showcaseDraft.skills.length || showcaseDraft.badges.length || showcaseDraft.links.length) }
    ]
  }, [profileShowcaseForm, profileForm, myTracks.length, myPostsCount, user])
  const profileEditorScore = useMemo(() => {
    if (profileEditorChecklist.length === 0) return 0
    const done = profileEditorChecklist.filter((item) => item.done).length
    return Math.round((done / profileEditorChecklist.length) * 100)
  }, [profileEditorChecklist])
  const profileEditorDoneCount = useMemo(() => (
    profileEditorChecklist.filter((item) => item.done).length
  ), [profileEditorChecklist])
  const profileEditorPendingChecklist = useMemo(() => (
    profileEditorChecklist.filter((item) => !item.done)
  ), [profileEditorChecklist])
  const normalizedThemeColor = normalizeHexColor(profileForm.themeColor, '#7a1f1d')
  const profileThemeHsl = useMemo(() => (
    rgbToHsl(hexToRgb(normalizedThemeColor))
  ), [normalizedThemeColor])
  const profileThemeWheelStyle = useMemo(() => ({
    '--theme-wheel-lightness': `${clampNumber(profileThemeHsl.l, 0, 100)}%`
  }), [profileThemeHsl.l])
  const profileThemeWheelThumbStyle = useMemo(() => {
    const angle = (profileThemeHsl.h * Math.PI) / 180
    const distance = (clampNumber(profileThemeHsl.s, 0, 100) / 100) * 50
    return {
      left: `${50 + Math.cos(angle) * distance}%`,
      top: `${50 + Math.sin(angle) * distance}%`,
      backgroundColor: normalizedThemeColor
    }
  }, [profileThemeHsl.h, profileThemeHsl.s, normalizedThemeColor])
  const visibleProfilePosts = useMemo(() => {
    if (profilePostFilter === 'media') {
      return profilePosts.filter((post) => Boolean(post.imageUrl))
    }
    if (profilePostFilter === 'text') {
      return profilePosts.filter((post) => !post.imageUrl && !post.repostOf)
    }
    if (profilePostFilter === 'reposts') {
      return profilePosts.filter((post) => Boolean(post.repostOf))
    }
    return profilePosts
  }, [profilePosts, profilePostFilter])
  const profilePowerScore = useMemo(() => {
    return calculateProfilePowerScore(profileView, profilePosts.length, profileTracks.length, profileShowcase)
  }, [profileView, profilePosts.length, profileTracks.length, profileShowcase])
  const profileAchievements = useMemo(() => {
    return buildProfileAchievements(profileView, profilePosts.length, profileTracks.length, profileShowcase)
  }, [profileView, profilePosts.length, profileTracks.length, profileShowcase])
  const unlockedProfileAchievements = profileAchievements.unlocked || []
  const lockedProfileAchievements = profileAchievements.locked || []
  const visibleUnlockedProfileAchievements = unlockedProfileAchievements.slice(0, PROFILE_ACHIEVEMENTS_UNLOCKED_PREVIEW_LIMIT)
  const visibleLockedProfileAchievements = lockedProfileAchievements.slice(0, PROFILE_ACHIEVEMENTS_LOCKED_PREVIEW_LIMIT)
  const hiddenProfileAchievementsCount = Math.max(
    0,
    unlockedProfileAchievements.length - visibleUnlockedProfileAchievements.length
  ) + Math.max(0, lockedProfileAchievements.length - visibleLockedProfileAchievements.length)
  const profileAchievementsTotal = Number(profileAchievements.total || 0)
  const profileAchievementsProgress = profileAchievementsTotal > 0
    ? Math.round((unlockedProfileAchievements.length / profileAchievementsTotal) * 100)
    : 0
  const profileDeveloperSnapshot = useMemo(() => (
    buildDeveloperSnapshot(profileShowcase, profileView && profileView.role, profilePosts.length)
  ), [profileShowcase, profileView ? profileView.role : '', profilePosts.length])
  const profileDevSummary = useMemo(() => {
    if (!profileDeveloperSnapshot) return 'Снимок не готов'
    return `${profileDeveloperSnapshot.score}% • ${profileDeveloperSnapshot.primaryTrack} • ${profileDeveloperSnapshot.level}`
  }, [profileDeveloperSnapshot])
  const profileShowcaseSummary = useMemo(() => {
    if (profileShowcase && String(profileShowcase.headline || '').trim()) {
      return String(profileShowcase.headline).trim()
    }
    const skillCount = Array.isArray(profileShowcase && profileShowcase.skills) ? profileShowcase.skills.length : 0
    const badgeCount = Array.isArray(profileShowcase && profileShowcase.badges) ? profileShowcase.badges.length : 0
    const linkCount = Array.isArray(profileShowcase && profileShowcase.links) ? profileShowcase.links.length : 0
    if (skillCount || badgeCount || linkCount) {
      return `${skillCount} skills • ${badgeCount} badges • ${linkCount} links`
    }
    return 'Showcase не заполнен'
  }, [profileShowcase])
  const editorDeveloperSnapshot = useMemo(() => {
    const draftShowcase = mapFormToShowcase(profileShowcaseForm)
    return buildDeveloperSnapshot(draftShowcase, profileForm.role, myPostsCount)
  }, [profileShowcaseForm, profileForm.role, myPostsCount])
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
  const activeConversationBookmarkedMessageIds = useMemo(() => {
    if (!activeConversation) return new Set()
    const list = bookmarkedMessageIdsByConversation[activeConversation.id] || []
    return new Set(list)
  }, [activeConversation, bookmarkedMessageIdsByConversation])
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
  const composerHashtags = useMemo(() => {
    const seen = new Set()
    return extractHashtags(postText).filter((tag) => {
      if (seen.has(tag)) return false
      seen.add(tag)
      return true
    })
  }, [postText])
  const feedComposerInsights = useMemo(() => {
    const raw = String(postText || '')
    const trimmed = raw.trim()
    const mentionCount = (raw.match(/@[a-zA-Z0-9_]+/g) || []).length
    const exclamations = (raw.match(/!/g) || []).length
    const questions = (raw.match(/\?/g) || []).length
    let tone = 'нейтральный'
    if (exclamations >= 2) tone = 'энергичный'
    if (questions >= 2 && exclamations === 0) tone = 'дискуссионный'
    if (trimmed.length > 220) tone = 'лонгрид'
    return {
      chars: raw.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      hashtags: composerHashtags.length,
      mentions: mentionCount,
      tone,
      hasMedia: Boolean(postFile)
    }
  }, [postText, composerHashtags, postFile])
  const feedTimeWindowStartMs = useMemo(() => {
    const now = Date.now()
    if (feedExplorer.timeWindow === FEED_TIME_WINDOWS.day) return now - (24 * 60 * 60 * 1000)
    if (feedExplorer.timeWindow === FEED_TIME_WINDOWS.week) return now - (7 * 24 * 60 * 60 * 1000)
    if (feedExplorer.timeWindow === FEED_TIME_WINDOWS.month) return now - (30 * 24 * 60 * 60 * 1000)
    return 0
  }, [feedExplorer.timeWindow])
  const effectiveFeedSortMode = feedFilter === FEED_FILTERS.popular
    ? FEED_SORT_MODES.engagement
    : feedExplorer.sortMode
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
  const topFeedAuthors = useMemo(() => {
    const authorStats = new Map()
    posts.forEach((post) => {
      const author = post && post.author ? post.author : null
      if (!author || !author.id) return
      const existing = authorStats.get(author.id) || {
        id: author.id,
        username: author.username || '',
        displayName: author.displayName || '',
        avatarUrl: author.avatarUrl || '',
        posts: 0,
        engagement: 0
      }
      const engagement = getFeedPostEngagementScore(post)
      existing.posts += 1
      existing.engagement += engagement
      authorStats.set(author.id, existing)
    })
    return Array.from(authorStats.values())
      .sort((a, b) => {
        if (b.engagement !== a.engagement) return b.engagement - a.engagement
        if (b.posts !== a.posts) return b.posts - a.posts
        return (a.username || '').localeCompare(b.username || '')
      })
      .slice(0, 5)
  }, [posts])
  const hotFeedPosts = useMemo(() => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    return posts
      .map((post) => {
        const createdAt = Date.parse(post.createdAt || '') || 0
        const ageMs = createdAt ? Math.max(0, now - createdAt) : Number.POSITIVE_INFINITY
        const recentBoost = ageMs <= oneDayMs ? 1 : 0
        const score = getFeedPostEngagementScore(post) + (recentBoost ? 8 : 0)
        return { post, score, ageMs }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.ageMs - b.ageMs
      })
      .slice(0, 5)
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
    if (feedTimeWindowStartMs) {
      list = list.filter((post) => {
        const createdAtMs = Date.parse(post.createdAt || '') || 0
        return createdAtMs >= feedTimeWindowStartMs
      })
    }
    if (feedExplorer.mediaOnly) {
      list = list.filter((post) => Boolean(post.imageUrl || post.repostOf?.imageUrl))
    }
    if (tagFilter) {
      list = list.filter((post) => extractHashtags(post.body).includes(tagFilter))
    }
    if (feedAuthorFilter) {
      list = list.filter((post) => post.author && post.author.id === feedAuthorFilter)
    }
    if (feedQueryNormalized) {
      list = list.filter((post) => {
        const body = String(post.body || '').toLowerCase()
        const authorName = String(post.author?.displayName || post.author?.username || '').toLowerCase()
        return body.includes(feedQueryNormalized) || authorName.includes(feedQueryNormalized)
      })
    }
    const now = Date.now()
    list.sort((a, b) => {
      const createdAtA = Date.parse(a.createdAt || '') || 0
      const createdAtB = Date.parse(b.createdAt || '') || 0
      const engagementA = getFeedPostEngagementScore(a)
      const engagementB = getFeedPostEngagementScore(b)

      if (effectiveFeedSortMode === FEED_SORT_MODES.engagement) {
        if (engagementB !== engagementA) return engagementB - engagementA
        return createdAtB - createdAtA
      }

      if (effectiveFeedSortMode === FEED_SORT_MODES.discussed) {
        const commentsA = Number(a.commentsCount || 0)
        const commentsB = Number(b.commentsCount || 0)
        if (commentsB !== commentsA) return commentsB - commentsA
        if (engagementB !== engagementA) return engagementB - engagementA
        return createdAtB - createdAtA
      }

      if (effectiveFeedSortMode === FEED_SORT_MODES.smart) {
        const ageHoursA = createdAtA ? Math.max(0, now - createdAtA) / 3600000 : 9999
        const ageHoursB = createdAtB ? Math.max(0, now - createdAtB) / 3600000 : 9999
        const freshnessA = Math.max(0, 18 - Math.min(ageHoursA, 18))
        const freshnessB = Math.max(0, 18 - Math.min(ageHoursB, 18))
        const mediaBoostA = (a.imageUrl || a.repostOf?.imageUrl) ? 2 : 0
        const mediaBoostB = (b.imageUrl || b.repostOf?.imageUrl) ? 2 : 0
        const bookmarkedBoostA = bookmarkedPostIds.has(a.id) ? 3 : 0
        const bookmarkedBoostB = bookmarkedPostIds.has(b.id) ? 3 : 0
        const smartScoreA = engagementA + freshnessA + mediaBoostA + bookmarkedBoostA
        const smartScoreB = engagementB + freshnessB + mediaBoostB + bookmarkedBoostB
        if (smartScoreB !== smartScoreA) return smartScoreB - smartScoreA
        return createdAtB - createdAtA
      }

      return createdAtB - createdAtA
    })
    return list
  }, [
    posts,
    feedFilter,
    user,
    bookmarkedPostIds,
    feedTimeWindowStartMs,
    feedExplorer.mediaOnly,
    activeFeedTag,
    feedAuthorFilter,
    feedQueryNormalized,
    effectiveFeedSortMode
  ])
  const feedDigest = useMemo(() => {
    const list = visibleFeedPosts
    if (list.length === 0) {
      return {
        visible: 0,
        mediaShare: 0,
        avgEngagement: 0,
        activeAuthors: 0,
        freshCount: 0,
        hottestTag: '',
        momentum: 0
      }
    }
    const tagCounts = new Map()
    const authors = new Set()
    let mediaCount = 0
    let totalEngagement = 0
    let freshCount = 0
    let momentum = 0
    const now = Date.now()
    list.forEach((post) => {
      const engagement = getFeedPostEngagementScore(post)
      const createdAt = Date.parse(post.createdAt || '') || 0
      const ageHours = createdAt ? Math.max(0, now - createdAt) / 3600000 : 999
      const freshnessWeight = Math.max(0.25, 1.8 - Math.min(ageHours / 12, 1.4))
      totalEngagement += engagement
      momentum += engagement * freshnessWeight
      if (post.author?.id) authors.add(post.author.id)
      if (post.imageUrl || post.repostOf?.imageUrl) mediaCount += 1
      if (ageHours <= 6) freshCount += 1
      extractHashtags(post.body).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    const hottestTagEntry = Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0])
      })[0]
    return {
      visible: list.length,
      mediaShare: Math.round((mediaCount / list.length) * 100),
      avgEngagement: Math.round(totalEngagement / list.length),
      activeAuthors: authors.size,
      freshCount,
      hottestTag: hottestTagEntry ? hottestTagEntry[0] : '',
      momentum: Math.round(momentum)
    }
  }, [visibleFeedPosts])
  const feedQuickPresets = useMemo(() => {
    const presets = []
    if (trendingTags[0]) {
      presets.push({
        id: `tag-${trendingTags[0].tag}`,
        label: `Тег ${trendingTags[0].tag}`,
        hint: `${trendingTags[0].count} постов`,
        action: 'tag',
        value: trendingTags[0].tag
      })
    }
    if (topFeedAuthors[0]) {
      presets.push({
        id: `author-${topFeedAuthors[0].id}`,
        label: `Автор @${topFeedAuthors[0].username}`,
        hint: `${topFeedAuthors[0].engagement} pts`,
        action: 'author',
        value: topFeedAuthors[0].id
      })
    }
    if (bookmarkedPostIds.size > 0) {
      presets.push({
        id: 'bookmarks',
        label: 'Закладки',
        hint: `${bookmarkedPostIds.size} шт`,
        action: 'filter',
        value: FEED_FILTERS.bookmarks
      })
    }
    if (feedMetrics.mine > 0) {
      presets.push({
        id: 'mine',
        label: 'Мои посты',
        hint: `${feedMetrics.mine} шт`,
        action: 'filter',
        value: FEED_FILTERS.mine
      })
    }
    if (hotFeedPosts[0]?.post?.author?.id) {
      presets.push({
        id: `hot-author-${hotFeedPosts[0].post.author.id}`,
        label: 'Хайп автор',
        hint: `@${hotFeedPosts[0].post.author.username}`,
        action: 'author',
        value: hotFeedPosts[0].post.author.id
      })
    }
    return presets.slice(0, 5)
  }, [trendingTags, topFeedAuthors, hotFeedPosts, bookmarkedPostIds.size, feedMetrics.mine])
  const feedActiveFilterCount = (
    Number(Boolean(feedQueryNormalized)) +
    Number(Boolean(activeFeedTag)) +
    Number(Boolean(feedAuthorFilter)) +
    Number(feedFilter !== FEED_FILTERS.all) +
    Number(feedExplorer.mediaOnly) +
    Number(feedExplorer.timeWindow !== DEFAULT_FEED_EXPLORER_SETTINGS.timeWindow) +
    Number(feedFilter !== FEED_FILTERS.popular && feedExplorer.sortMode !== DEFAULT_FEED_EXPLORER_SETTINGS.sortMode)
  )
  const feedTimeWindowLabel = feedExplorer.timeWindow === FEED_TIME_WINDOWS.day
    ? '24 часа'
    : feedExplorer.timeWindow === FEED_TIME_WINDOWS.week
      ? '7 дней'
      : feedExplorer.timeWindow === FEED_TIME_WINDOWS.month
        ? '30 дней'
        : 'все время'
  const feedSortModeLabel = effectiveFeedSortMode === FEED_SORT_MODES.latest
    ? 'новые'
    : effectiveFeedSortMode === FEED_SORT_MODES.engagement
      ? 'по вовлечению'
      : effectiveFeedSortMode === FEED_SORT_MODES.discussed
        ? 'по обсуждениям'
        : 'умный'
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
  const dashboardTopConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => {
        const aUnread = Math.max(0, Number(a.unreadCount || 0))
        const bUnread = Math.max(0, Number(b.unreadCount || 0))
        if (bUnread !== aUnread) return bUnread - aUnread
        const aTime = Date.parse(a.lastAt || '') || 0
        const bTime = Date.parse(b.lastAt || '') || 0
        return bTime - aTime
      })
      .slice(0, 5)
      .map((conv) => {
        const draftText = String(draftsByConversation[conv.id] || '').trim()
        const title = getConversationDisplayName(conv, chatAliasByConversation)
        return {
          ...conv,
          title,
          unreadCount: Math.max(0, Number(conv.unreadCount || 0)),
          draftText,
          hasDraft: draftText.length > 0,
          isFavorite: favoriteConversationSet.has(conv.id),
          online: !conv.isGroup && conv.other && onlineUsers.includes(conv.other.id)
        }
      })
  }, [conversations, draftsByConversation, chatAliasByConversation, favoriteConversationSet, onlineUsers])
  const dashboardDraftQueue = useMemo(() => {
    return dashboardTopConversations
      .filter((item) => item.hasDraft)
      .sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount
        return (Date.parse(b.lastAt || '') || 0) - (Date.parse(a.lastAt || '') || 0)
      })
      .slice(0, 4)
  }, [dashboardTopConversations])
  const dashboardWorkspaceScore = useMemo(() => {
    const profileScore = Number(profileEditorScore || 0)
    const chatResponsiveness = conversations.length === 0
      ? 100
      : Math.max(0, 100 - Math.min(80, unreadMessagesCount * 4))
    const feedActivity = Math.min(100, (feedDigest.freshCount * 12) + Math.min(40, feedMetrics.engagement))
    const infraScore = (
      (socketConnection === 'connected' ? 40 : socketConnection === 'connecting' ? 24 : 10) +
      (pushState.enabled ? 30 : pushState.supported ? 18 : 8) +
      (callState.status === 'idle' ? 20 : 14) +
      (health && health.ok ? 10 : 5)
    )
    return Math.round((profileScore * 0.35) + (chatResponsiveness * 0.25) + (feedActivity * 0.2) + (infraScore * 0.2))
  }, [
    profileEditorScore,
    conversations.length,
    unreadMessagesCount,
    feedDigest.freshCount,
    feedMetrics.engagement,
    socketConnection,
    pushState.enabled,
    pushState.supported,
    callState.status,
    health && health.ok
  ])
  const dashboardQuickActions = useMemo(() => {
    return [
      {
        id: 'unread-chats',
        title: 'Непрочитанные чаты',
        subtitle: unreadConversationCount > 0 ? `${unreadConversationCount} диалогов` : 'Чисто',
        icon: '💬',
        accent: unreadConversationCount > 0 ? 'warn' : 'ok'
      },
      {
        id: 'hot-feed',
        title: 'Горячая лента',
        subtitle: hotFeedPosts[0] ? `${hotFeedPosts.length} постов в радаре` : 'Пока тихо',
        icon: '🔥',
        accent: hotFeedPosts[0] ? 'hot' : 'neutral'
      },
      {
        id: 'resume-chat',
        title: 'Вернуться в чат',
        subtitle: activeConversation ? getConversationDisplayName(activeConversation, chatAliasByConversation) : 'Выбери диалог',
        icon: '🧭',
        accent: activeConversation ? 'accent' : 'neutral'
      },
      {
        id: 'profile-lab',
        title: 'Профиль',
        subtitle: `${profileEditorScore}% готовности`,
        icon: '🛠️',
        accent: profileEditorScore >= 80 ? 'ok' : 'neutral'
      }
    ]
  }, [unreadConversationCount, hotFeedPosts, profileEditorScore, activeConversation, chatAliasByConversation])
  const dashboardSystemAlerts = useMemo(() => {
    const items = []
    if (socketConnection !== 'connected') {
      items.push({
        id: 'socket',
        level: socketConnection === 'connecting' ? 'warn' : 'danger',
        title: 'Realtime-соединение',
        text: socketConnection === 'connecting' ? 'Подключение к сокету...' : 'Сокет офлайн. Чат может не обновляться мгновенно.'
      })
    }
    if (pushState.error) {
      items.push({
        id: 'push-error',
        level: 'warn',
        title: 'Push-уведомления',
        text: pushState.error
      })
    } else if (webPushFeatureEnabled && pushState.supported && !pushState.enabled) {
      items.push({
        id: 'push-off',
        level: 'neutral',
        title: 'Push-уведомления',
        text: 'Отключены. Можно включить в верхней панели.'
      })
    }
    if (callState.status !== 'idle') {
      items.push({
        id: 'call',
        level: 'accent',
        title: 'Звонок',
        text: callStatusText || 'Активен звонок'
      })
    }
    if (blockedUsers.length > 0) {
      items.push({
        id: 'blocked',
        level: 'neutral',
        title: 'Блокировки',
        text: `Заблокировано пользователей: ${blockedUsers.length}`
      })
    }
    if (unreadMessagesCount > 0) {
      items.push({
        id: 'unread',
        level: unreadMessagesCount > 8 ? 'warn' : 'neutral',
        title: 'Непрочитанные сообщения',
        text: `${unreadMessagesCount} сообщений в ${unreadConversationCount} чатах`
      })
    }
    return items.slice(0, 4)
  }, [
    socketConnection,
    pushState.error,
    pushState.supported,
    pushState.enabled,
    callState.status,
    callStatusText,
    blockedUsers.length,
    unreadMessagesCount,
    unreadConversationCount
  ])
  const dashboardFocusQueue = useMemo(() => {
    const queue = []
    if (dashboardDraftQueue.length > 0) {
      queue.push({
        id: 'drafts',
        title: 'Завершить черновики',
        text: `${dashboardDraftQueue.length} чатов с набранным текстом`,
        action: 'drafts'
      })
    }
    if (unreadConversationCount > 0) {
      queue.push({
        id: 'replies',
        title: 'Ответить в чатах',
        text: `${unreadConversationCount} диалогов требуют внимания`,
        action: 'unread'
      })
    }
    if (feedDigest.freshCount > 0) {
      queue.push({
        id: 'feed-fresh',
        title: 'Проверить свежую ленту',
        text: `${feedDigest.freshCount} свежих постов в выборке`,
        action: 'feed-hot'
      })
    }
    if (profileEditorScore < 100) {
      const nextChecklistItem = profileEditorChecklist.find((item) => !item.done)
      if (nextChecklistItem) {
        queue.push({
          id: 'profile-next',
          title: 'Прокачать профиль',
          text: nextChecklistItem.label,
          action: 'profile'
        })
      }
    }
    if (trendingTags[0]) {
      queue.push({
        id: 'trend',
        title: 'Поймать тренд',
        text: `Открыть ${trendingTags[0].tag} (${trendingTags[0].count})`,
        action: 'trend'
      })
    }
    return queue.slice(0, 4)
  }, [
    dashboardDraftQueue,
    unreadConversationCount,
    feedDigest.freshCount,
    profileEditorScore,
    profileEditorChecklist,
    trendingTags
  ])
  const dashboardTimelineSnapshot = useMemo(() => {
    const latestConversation = [...conversations]
      .sort((a, b) => (Date.parse(b.lastAt || '') || 0) - (Date.parse(a.lastAt || '') || 0))[0] || null
    const latestPost = [...posts]
      .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))[0] || null
    const latestChatMessage = messages.length > 0 ? messages[messages.length - 1] : null
    const entries = []
    if (latestConversation) {
      entries.push({
        id: 'latest-conv',
        kind: 'chat',
        title: `Чат: ${getConversationDisplayName(latestConversation, chatAliasByConversation)}`,
        subtitle: latestConversation.lastMessage || 'Последнее сообщение',
        at: latestConversation.lastAt || null,
        targetId: latestConversation.id
      })
    }
    if (latestPost) {
      entries.push({
        id: 'latest-post',
        kind: 'feed',
        title: `Лента: ${latestPost.author?.displayName || latestPost.author?.username || 'Автор'}`,
        subtitle: String(latestPost.body || '').trim() || (latestPost.imageUrl ? 'Пост с изображением' : 'Пост'),
        at: latestPost.createdAt || null,
        postId: latestPost.id
      })
    }
    if (activeConversation && latestChatMessage) {
      entries.push({
        id: 'latest-active-chat',
        kind: 'active-chat',
        title: `Активный чат: ${getConversationDisplayName(activeConversation, chatAliasByConversation)}`,
        subtitle: getMessagePreviewLabel(latestChatMessage, 'Сообщение'),
        at: latestChatMessage.createdAt || null,
        messageId: latestChatMessage.id
      })
    }
    return entries
      .sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0))
      .slice(0, 4)
  }, [conversations, posts, messages, activeConversation, chatAliasByConversation])
  const dashboardThemeMood = useMemo(() => {
    if (feedDigest.momentum >= 80) return 'surge'
    if (unreadMessagesCount >= 8) return 'attention'
    if (dashboardWorkspaceScore >= 75) return 'steady'
    return 'focus'
  }, [feedDigest.momentum, unreadMessagesCount, dashboardWorkspaceScore])
  const dashboardNow = useMemo(() => {
    const now = new Date()
    return {
      date: now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
  }, [messages.length, posts.length, conversations.length, unreadMessagesCount, socketConnection, view])
  const dashboardFocusMode = dashboardPreferences.focusMode === true
  const dashboardAutoRefresh = dashboardPreferences.autoRefresh === true
  const dashboardLastRefreshLabel = dashboardLastRefreshAt
    ? `${formatTime(dashboardLastRefreshAt)}`
    : 'еще не обновлялось'
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

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isIosPlatform()) {
      root.dataset.platform = 'ios'
    } else if (root.dataset.platform === 'ios') {
      delete root.dataset.platform
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const normalized = normalizeUiPreferences(uiPreferences)
    const radius = Math.round(normalized.radius)
    const ambientOpacity = (0.04 + (normalized.ambient / 100) * 0.2).toFixed(3)
    root.dataset.uiStyle = normalized.style
    root.dataset.uiDensity = normalized.density
    root.style.setProperty('--ambient-opacity', ambientOpacity)
    root.style.setProperty('--surface-radius', `${radius}px`)
    root.style.setProperty('--surface-radius-md', `${Math.max(12, radius - 4)}px`)
    root.style.setProperty('--surface-radius-sm', `${Math.max(10, radius - 8)}px`)
    root.style.setProperty('--bubble-radius', `${Math.max(14, radius - 3)}px`)

    const accentSource = normalized.syncAccent
      ? normalizeHexColor(profileForm.themeColor || (user && user.themeColor) || '#7a1f1d')
      : '#7a1f1d'
    const accentRgb = hexToRgb(accentSource)
    const accent2Rgb = mixRgbColor(accentRgb, { r: 255, g: 255, b: 255 }, theme === 'light' ? 0.05 : 0.16)
    const accent3Rgb = mixRgbColor(accentRgb, { r: 255, g: 255, b: 255 }, theme === 'light' ? 0.12 : 0.3)

    root.style.setProperty('--accent', accentSource)
    root.style.setProperty('--accent-2', rgbToHex(accent2Rgb))
    root.style.setProperty('--accent-3', rgbToHex(accent3Rgb))
    root.style.setProperty('--accent-rgb', rgbToCssTriplet(accentRgb))
    root.style.setProperty('--accent-2-rgb', rgbToCssTriplet(accent2Rgb))

    try {
      localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
    } catch (err) {
      // ignore storage errors
    }
  }, [uiPreferences, profileForm.themeColor, user ? user.themeColor : null, theme])

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_SHOWCASE_STORAGE_KEY, JSON.stringify(profileShowcaseByUserId))
    } catch (err) {
      // ignore storage errors
    }
  }, [profileShowcaseByUserId])

  useEffect(() => {
    if (!user || !user.id) {
      setProfileShowcaseForm(mapShowcaseToForm(DEFAULT_PROFILE_SHOWCASE))
      return
    }
    const saved = profileShowcaseByUserId[user.id] || DEFAULT_PROFILE_SHOWCASE
    setProfileShowcaseForm(mapShowcaseToForm(saved))
  }, [user ? user.id : null, profileShowcaseByUserId])

  useEffect(() => {
    return () => {
      if (avatarSource && avatarSource.startsWith('blob:')) {
        URL.revokeObjectURL(avatarSource)
      }
    }
  }, [avatarSource])

  useEffect(() => {
    return () => {
      if (bannerSource && bannerSource.startsWith('blob:')) {
        URL.revokeObjectURL(bannerSource)
      }
    }
  }, [bannerSource])

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
      const allowed = ['dashboard', 'feed', 'chats', 'profile', 'settings']
      if (isAdmin) allowed.push('admin')
      return stored && allowed.includes(stored) ? stored : 'feed'
    } catch (err) {
      return 'feed'
    }
  }

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ ok: false }))
    loadRolesCatalog().catch(() => setRoles([]))
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
          role: data.user.role || 'student',
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
    if (!user || !user.id) return
    let cancelled = false
    const loadMyShowcase = async () => {
      try {
        const data = await getMyProfileShowcase()
        if (cancelled) return
        const showcase = normalizeProfileShowcase(data && data.showcase)
        setProfileShowcaseByUserId((prev) => ({
          ...prev,
          [user.id]: showcase
        }))
        setProfileShowcaseForm(mapShowcaseToForm(showcase))
      } catch (err) {
        if (cancelled) return
        const known = profileShowcaseByUserId[user.id]
        if (known) {
          setProfileShowcaseForm(mapShowcaseToForm(known))
        }
      }
    }
    loadMyShowcase()
    return () => {
      cancelled = true
    }
  }, [user ? user.id : null])

  useEffect(() => {
    if (!user || !user.id) {
      setVerificationRequest(null)
      setVerificationForm({ ...initialVerificationForm })
      return
    }

    let cancelled = false
    const loadMyVerificationRequest = async () => {
      try {
        const data = await getMyVerificationRequest()
        if (cancelled) return
        setVerificationRequest(normalizeVerificationRequest(data && data.request))
      } catch (_err) {
        if (cancelled) return
        setVerificationRequest(null)
      } finally {
        if (!cancelled) {
          setVerificationForm((prev) => ({
            ...prev,
            fullName: prev.fullName || user.displayName || user.username || ''
          }))
        }
      }
    }

    loadMyVerificationRequest()
    return () => {
      cancelled = true
    }
  }, [user ? user.id : null, user ? user.displayName : '', user ? user.username : ''])

  useEffect(() => {
    if (!user || !user.id) {
      setPrivacyByUsername({})
      setPrivacyControls([])
      setBlockedUsers([])
      setSessions([])
      setTwoFactorStatus({ ...DEFAULT_TWO_FACTOR_STATUS })
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setTwoFactorBackupCode('')
      setFreshBackupCodes([])
      return
    }
    loadMyPrivacy({ silent: true })
    loadSecurityStatus({ silent: true })
    loadUserSessions({ silent: true })
  }, [user ? user.id : null])

  useEffect(() => {
    if (!user) return
    const allowed = ['dashboard', 'feed', 'chats', 'profile', 'settings']
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
    if (!user || !user.isAdmin || view !== 'admin') return
    loadAdminUsers(adminQuery)
    loadAdminVerificationRequests(adminVerificationFilter, adminQuery)
  }, [view, user ? user.id : null, user ? user.isAdmin : false])

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
    setChatMobilePane('chat')
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
          setChatMobilePane('list')
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
      setChatMobilePane('list')
    }
  }, [activeConversation ? activeConversation.id : null])

  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      setPollVoteLoadingByMessage({})
      setConversationBookmarks([])
      setBookmarkPanelOpen(false)
      return
    }
    setPollVoteLoadingByMessage({})
    setPollComposerOpen(false)
    setPollDraft(INITIAL_POLL_DRAFT)
    setBookmarkPanelOpen(false)
    const loadMessages = async () => {
      try {
        const data = await getMessages(activeConversation.id)
        setMessages((data.messages || []).map(normalizeChatMessage))
        await clearConversationUnread(activeConversation.id)
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      }
    }
    loadConversationBookmarks(activeConversation.id, { silent: true })
    loadMessages()
  }, [activeConversation])

  useEffect(() => {
    if (!user || !activeConversation || activeConversation.isGroup || !activeConversation.other || !activeConversation.other.username) return
    loadUserPrivacyRelation(activeConversation.other.username, { silent: true })
  }, [user ? user.id : null, activeConversation ? activeConversation.id : null, activeConversation && activeConversation.other ? activeConversation.other.username : ''])

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
      localStorage.setItem(FEED_EXPLORER_STORAGE_KEY, JSON.stringify(feedExplorer))
    } catch (err) {
      // ignore storage errors
    }
  }, [feedExplorer])

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_PREFERENCES_STORAGE_KEY, JSON.stringify({
        focusMode: dashboardFocusMode,
        autoRefresh: dashboardAutoRefresh
      }))
    } catch (err) {
      // ignore storage errors
    }
  }, [dashboardFocusMode, dashboardAutoRefresh])

  useEffect(() => {
    try {
      localStorage.setItem(
        DASHBOARD_COMMAND_HISTORY_STORAGE_KEY,
        JSON.stringify(dashboardCommandHistory.slice(0, 10))
      )
    } catch (err) {
      // ignore storage errors
    }
  }, [dashboardCommandHistory])

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
    return () => {
      if (miniProfileOpenTimerRef.current) {
        window.clearTimeout(miniProfileOpenTimerRef.current)
      }
      if (miniProfileCloseTimerRef.current) {
        window.clearTimeout(miniProfileCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setMiniProfileCard(INITIAL_MINI_PROFILE_CARD_STATE)
  }, [view, user ? user.id : null])

  useEffect(() => {
    if (!user || view !== 'dashboard' || !dashboardAutoRefresh) return
    const timer = window.setInterval(() => {
      refreshWorkspaceSnapshot()
    }, 60000)
    return () => window.clearInterval(timer)
  }, [user ? user.id : null, view, dashboardAutoRefresh])

  useEffect(() => {
    const handleHotkey = (event) => {
      if (!user || event.defaultPrevented) return
      const key = String(event.key || '').toLowerCase()
      const target = event.target
      const tagName = target && target.tagName ? target.tagName.toLowerCase() : ''
      const isTextInput = tagName === 'input' || tagName === 'textarea' || (target && target.isContentEditable)

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        if (isTextInput && !event.shiftKey && !globalPaletteOpen) return
        event.preventDefault()
        if (event.shiftKey) {
          if (isTextInput) return
          setView('chats')
          window.requestAnimationFrame(() => {
            if (chatSearchInputRef.current) {
              chatSearchInputRef.current.focus()
              chatSearchInputRef.current.select()
            }
          })
          return
        }
        setGlobalPaletteOpen(true)
        return
      }

      if (key === 'escape' && globalPaletteOpen) {
        event.preventDefault()
        setGlobalPaletteOpen(false)
        return
      }

      if (globalPaletteOpen) {
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

      if (key === '/' && view === 'feed') {
        if (isTextInput) return
        event.preventDefault()
        setIsFeedToolboxOpen(true)
        window.requestAnimationFrame(() => {
          if (feedQueryInputRef.current) {
            feedQueryInputRef.current.focus()
            feedQueryInputRef.current.select()
          }
        })
        return
      }

      if (key === 'escape' && mediaPanelOpen) {
        event.preventDefault()
        setMediaPanelOpen(false)
      }
    }
    window.addEventListener('keydown', handleHotkey)
    return () => window.removeEventListener('keydown', handleHotkey)
  }, [user, view, activeConversation, mediaPanelOpen, globalPaletteOpen])

  useEffect(() => {
    if (!globalPaletteOpen) return
    window.requestAnimationFrame(() => {
      if (globalPaletteInputRef.current) {
        globalPaletteInputRef.current.focus()
        globalPaletteInputRef.current.select()
      }
    })
  }, [globalPaletteOpen])

  useEffect(() => {
    if (!globalPaletteOpen) {
      globalPaletteSearchSeqRef.current += 1
      setGlobalPaletteLoading(false)
      setGlobalPaletteUsers([])
      return
    }

    const raw = String(globalPaletteQuery || '').trim()
    const query = raw.startsWith('@') ? raw.slice(1).trim() : raw
    if (query.length < 3 || raw.startsWith('#')) {
      globalPaletteSearchSeqRef.current += 1
      setGlobalPaletteLoading(false)
      setGlobalPaletteUsers([])
      return
    }

    const seq = globalPaletteSearchSeqRef.current + 1
    globalPaletteSearchSeqRef.current = seq
    setGlobalPaletteLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchUsers(query)
        if (globalPaletteSearchSeqRef.current !== seq) return
        const users = Array.isArray(data && data.users) ? data.users : []
        setGlobalPaletteUsers(users.slice(0, 6))
      } catch (err) {
        if (globalPaletteSearchSeqRef.current !== seq) return
        setGlobalPaletteUsers([])
      } finally {
        if (globalPaletteSearchSeqRef.current === seq) {
          setGlobalPaletteLoading(false)
        }
      }
    }, 160)

    return () => window.clearTimeout(timer)
  }, [globalPaletteOpen, globalPaletteQuery])

  useEffect(() => {
    if (!user || settingsSection !== 'privacy') {
      privacyQuickSearchSeqRef.current += 1
      setPrivacyQuickSearchLoading(false)
      setPrivacyQuickUsers([])
      return
    }

    const query = String(privacyQuickUsername || '').trim().replace(/^@+/, '')
    if (query.length < 2) {
      privacyQuickSearchSeqRef.current += 1
      setPrivacyQuickSearchLoading(false)
      setPrivacyQuickUsers([])
      return
    }

    const seq = privacyQuickSearchSeqRef.current + 1
    privacyQuickSearchSeqRef.current = seq
    setPrivacyQuickSearchLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchUsers(query)
        if (privacyQuickSearchSeqRef.current !== seq) return
        const rows = Array.isArray(data && data.users) ? data.users : []
        const selfUsername = String(user.username || '').trim().toLowerCase()
        const filtered = rows.filter((item) => {
          const username = String(item && item.username ? item.username : '').trim().toLowerCase()
          return username && username !== selfUsername
        })
        setPrivacyQuickUsers(filtered.slice(0, 6))
      } catch (err) {
        if (privacyQuickSearchSeqRef.current !== seq) return
        setPrivacyQuickUsers([])
      } finally {
        if (privacyQuickSearchSeqRef.current === seq) {
          setPrivacyQuickSearchLoading(false)
        }
      }
    }, 170)

    return () => window.clearTimeout(timer)
  }, [user, settingsSection, privacyQuickUsername])

  useEffect(() => {
    socketConnectionRef.current = socketConnection
  }, [socketConnection])

  useEffect(() => {
    if (user) return
    stopTyping()
    setSocketConnection('offline')
    setTypingByConversation({})
    setGlobalPaletteOpen(false)
    setGlobalPaletteQuery('')
    setGlobalPaletteUsers([])
    setGlobalPaletteLoading(false)
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
    blockedUsersRef.current = blockedUsers
  }, [blockedUsers])

  useEffect(() => {
    privacyByUsernameRef.current = privacyByUsername
  }, [privacyByUsername])

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
    if (!remoteAudioRef.current) return
    remoteAudioRef.current.srcObject = remoteStream || null
    if (remoteStream && typeof remoteAudioRef.current.play === 'function') {
      remoteAudioRef.current.play().catch(() => {})
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
    setChatExplorerQuery('')
    setChatExplorerTab(CHAT_EXPLORER_TABS.overview)
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
      setCallStateSync({ status: 'incoming', withUserId: fromUserId, direction: 'incoming', startedAt: null })
    }

    const handleCallAnswer = async ({ fromUserId, answer }) => {
      if (callStateRef.current.withUserId !== fromUserId || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        await flushPendingIceCandidates()
        setCallStateSync({ status: 'in-call', withUserId: fromUserId, direction: 'outgoing', startedAt: Date.now() })
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
      setTwoFactorLogin({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })
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
      if (data && data.requiresTwoFactor === true && data.twoFactorToken) {
        setTwoFactorLogin({
          pending: true,
          token: String(data.twoFactorToken || ''),
          code: '',
          backupCode: ''
        })
        setStatus({ type: 'info', message: 'Enter 2FA code to complete login.' })
        return
      }
      setToken(data.token)
      setUser(data.user)
      setTwoFactorLogin({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || 'student',
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      setView('feed')
      setStatus({
        type: 'success',
        message: data && data.twoFactorSetupRecommended
          ? 'Welcome back. We recommend enabling 2FA in profile security.'
          : 'Login successful.'
      })
      setLoginForm(initialLogin)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTwoFactorLogin = async (event) => {
    event.preventDefault()
    if (!twoFactorLogin.pending || !twoFactorLogin.token) return
    const code = String(twoFactorLogin.code || '').trim()
    const backupCode = String(twoFactorLogin.backupCode || '').trim()
    if (!code && !backupCode) {
      setStatus({ type: 'error', message: 'Enter TOTP code or backup code.' })
      return
    }
    setLoading(true)
    setStatus({ type: 'info', message: '' })
    try {
      const data = await verifyTwoFactorLogin({
        twoFactorToken: twoFactorLogin.token,
        code,
        backupCode
      })
      setToken(data.token)
      setUser(data.user)
      setTwoFactorLogin({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || 'student',
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      setView('feed')
      setStatus({ type: 'success', message: 'Signed in with 2FA.' })
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
      const showcaseSnapshot = mapFormToShowcase(profileShowcaseForm)
      let savedShowcase = showcaseSnapshot
      let showcaseSaveError = ''
      try {
        const showcaseResponse = await saveMyProfileShowcase(showcaseSnapshot)
        savedShowcase = normalizeProfileShowcase(showcaseResponse && showcaseResponse.showcase)
      } catch (showcaseErr) {
        showcaseSaveError = showcaseErr.message
      }
      setUser(data.user)
      setProfileForm({
        username: data.user.username || '',
        displayName: data.user.displayName || '',
        bio: data.user.bio || '',
        statusText: data.user.statusText || '',
        statusEmoji: data.user.statusEmoji || '',
        role: data.user.role || 'student',
        themeColor: data.user.themeColor || '#7a1f1d'
      })
      if (data.user && data.user.id) {
        setProfileShowcaseByUserId((prev) => ({
          ...prev,
          [data.user.id]: savedShowcase
        }))
      }
      if (showcaseSaveError) {
        setStatus({ type: 'info', message: `Профиль обновлен, но Showcase не сохранен: ${showcaseSaveError}` })
      } else {
        setStatus({ type: 'success', message: 'Профиль и оформление обновлены.' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    const currentPassword = String(passwordForm.currentPassword || '')
    const newPassword = String(passwordForm.newPassword || '')
    const confirmPassword = String(passwordForm.confirmPassword || '')

    if (currentPassword.length < 6) {
      setStatus({ type: 'error', message: 'Введите текущий пароль (минимум 6 символов).' })
      return
    }
    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Новый пароль должен быть минимум 6 символов.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Подтверждение пароля не совпадает.' })
      return
    }
    if (currentPassword === newPassword) {
      setStatus({ type: 'error', message: 'Новый пароль должен отличаться от текущего.' })
      return
    }

    setLoading(true)
    try {
      const data = await changeMyPassword(currentPassword, newPassword)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      const revokedCount = Math.max(0, Number(data && data.revokedCount ? data.revokedCount : 0))
      setStatus({
        type: 'success',
        message: revokedCount > 0
          ? `Пароль изменён. Другие сессии завершены: ${revokedCount}.`
          : 'Пароль изменён.'
      })
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

  const closeAvatarEditor = () => {
    if (avatarSource && avatarSource.startsWith('blob:')) {
      URL.revokeObjectURL(avatarSource)
    }
    setAvatarModalOpen(false)
    setAvatarSource('')
    setAvatarZoom(AVATAR_ZOOM_MIN)
    setAvatarOffset({ x: 0, y: 0 })
    setDragStart(null)
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
      closeAvatarEditor()
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

  const closeBannerEditor = () => {
    if (bannerSource && bannerSource.startsWith('blob:')) {
      URL.revokeObjectURL(bannerSource)
    }
    setBannerModalOpen(false)
    setBannerSource('')
    setBannerZoom(BANNER_ZOOM_MIN)
    setBannerOffset({ x: 0, y: 0 })
    setBannerDragStart(null)
  }

  const clampBannerOffsetByZoom = (offset, zoomValue) => {
    const zoom = clampBannerZoom(zoomValue)
    const rect = bannerPreviewRef.current ? bannerPreviewRef.current.getBoundingClientRect() : null
    const frameWidth = rect && rect.width ? rect.width : 340
    const frameHeight = rect && rect.height ? rect.height : 160
    const maxX = Math.max(0, ((zoom - 1) * frameWidth) / 2)
    const maxY = Math.max(0, ((zoom - 1) * frameHeight) / 2)
    return {
      x: clampNumber(offset && offset.x, -maxX, maxX),
      y: clampNumber(offset && offset.y, -maxY, maxY)
    }
  }

  const handleBannerDragStart = (event) => {
    if (!bannerSource) return
    event.preventDefault()
    if (event.currentTarget && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setBannerDragStart({
      x: event.clientX,
      y: event.clientY,
      offsetX: bannerOffset.x,
      offsetY: bannerOffset.y
    })
  }

  const handleBannerDragMove = (event) => {
    if (!bannerDragStart) return
    event.preventDefault()
    const nextX = bannerDragStart.offsetX + (event.clientX - bannerDragStart.x)
    const nextY = bannerDragStart.offsetY + (event.clientY - bannerDragStart.y)
    setBannerOffset(clampBannerOffsetByZoom({ x: nextX, y: nextY }, bannerZoom))
  }

  const handleBannerDragEnd = () => {
    if (bannerDragStart) setBannerDragStart(null)
  }

  const handleBannerZoomChange = (event) => {
    const nextZoom = clampBannerZoom(Number(event.target.value))
    setBannerZoom(nextZoom)
    setBannerOffset((prev) => clampBannerOffsetByZoom(prev, nextZoom))
  }

  const handleBannerSave = async () => {
    if (!bannerSource) return
    setLoading(true)
    try {
      const image = new Image()
      image.src = bannerSource
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () => reject(new Error('Не удалось загрузить изображение для обложки.'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = BANNER_EXPORT_WIDTH
      canvas.height = BANNER_EXPORT_HEIGHT
      const ctx = canvas.getContext('2d')
      const scale = Math.max(
        BANNER_EXPORT_WIDTH / image.width,
        BANNER_EXPORT_HEIGHT / image.height
      ) * clampBannerZoom(bannerZoom)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const rect = bannerPreviewRef.current ? bannerPreviewRef.current.getBoundingClientRect() : null
      const previewWidth = rect && rect.width ? rect.width : 340
      const previewHeight = rect && rect.height ? rect.height : 160
      const offsetX = bannerOffset.x * (BANNER_EXPORT_WIDTH / previewWidth)
      const offsetY = bannerOffset.y * (BANNER_EXPORT_HEIGHT / previewHeight)
      const dx = (BANNER_EXPORT_WIDTH - drawWidth) / 2 + offsetX
      const dy = (BANNER_EXPORT_HEIGHT - drawHeight) / 2 + offsetY
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight)

      let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92))
      if (!blob) {
        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      }
      if (!blob) throw new Error('Не удалось подготовить обложку к загрузке.')

      const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const file = new File([blob], `banner.${extension}`, { type: blob.type || 'image/jpeg' })
      const data = await uploadBanner(file)
      setUser(data.user)
      closeBannerEditor()
      setStatus({ type: 'success', message: 'Обложка обновлена и аккуратно подогнана.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBannerChange = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const fileName = String(file.name || '').toLowerCase()
    const isGif = String(file.type || '').toLowerCase() === 'image/gif' || fileName.endsWith('.gif')
    if (isGif) {
      setLoading(true)
      try {
        const data = await uploadBanner(file)
        setUser(data.user)
        setStatus({ type: 'success', message: 'GIF-обложка обновлена. Для GIF используется оригинал без кадрирования.' })
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
      event.target.value = ''
      return
    }

    if (bannerSource && bannerSource.startsWith('blob:')) {
      URL.revokeObjectURL(bannerSource)
    }
    const url = URL.createObjectURL(file)
    setBannerSource(url)
    setBannerZoom(BANNER_ZOOM_MIN)
    setBannerOffset({ x: 0, y: 0 })
    setBannerDragStart(null)
    setBannerModalOpen(true)
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
    setProfilePostFilter('all')
    setActiveTrackId(null)
    setView('profile-view')
    setProfileLoading(true)
    try {
      const [data, postsData, tracksData, showcaseData] = await Promise.all([
        getProfile(username),
        getProfilePosts(username),
        getProfileTracks(username),
        getProfileShowcase(username).catch(() => ({ showcase: null }))
      ])
      setProfileView(data.user)
      setProfilePrivacy(normalizePrivacyRelation(data && data.user ? data.user.viewerPrivacy : null))
      setProfilePosts(postsData.posts || [])
      setProfileTracks(tracksData.tracks || [])
      if (data.user && data.user.id) {
        const showcase = normalizeProfileShowcase(showcaseData && showcaseData.showcase)
        setProfileShowcaseByUserId((prev) => ({
          ...prev,
          [data.user.id]: showcase
        }))
      }
      setActiveTrackId(null)
      if (data && data.user && user && data.user.id !== user.id && data.user.username) {
        loadUserPrivacyRelation(data.user.username, { silent: true })
      }
    } catch (err) {
      setProfilePrivacy({ ...DEFAULT_PRIVACY_RELATION })
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

  async function loadRolesCatalog() {
    const data = await getRoles()
    setRoles(data.roles || [])
    return data.roles || []
  }

  const getUserRoleList = (targetUser) => {
    if (!targetUser || typeof targetUser !== 'object') return []
    const byArray = Array.isArray(targetUser.roles)
      ? targetUser.roles.map((item) => String(item || '').trim()).filter(Boolean)
      : []
    if (byArray.length > 0) return Array.from(new Set(byArray))
    const single = String(targetUser.role || '').trim()
    return single ? [single] : []
  }

  const loadMyPrivacy = async ({ silent = false } = {}) => {
    if (!user) return []
    if (!silent) setPrivacyControlsLoading(true)
    try {
      const data = await getMyPrivacyControls()
      const controls = Array.isArray(data && data.controls) ? data.controls : []
      setPrivacyControls(controls)
      setBlockedUsers(
        controls
          .filter((item) => item && item.isBlocked === true && item.targetUserId)
          .map((item) => String(item.targetUserId))
      )
      setPrivacyByUsername((prev) => {
        const next = { ...prev }
        controls.forEach((item) => {
          const username = String(item && item.targetUsername ? item.targetUsername : '').trim().toLowerCase()
          if (!username) return
          next[username] = normalizePrivacyRelation({
            ...(prev[username] || {}),
            isMuted: item.isMuted === true,
            isBlocked: item.isBlocked === true,
            hideProfileContent: item.hideProfileContent === true,
            denyDm: item.denyDm === true
          })
        })
        return next
      })
      return controls
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
      return []
    } finally {
      if (!silent) setPrivacyControlsLoading(false)
    }
  }

  const loadUserPrivacyRelation = async (username, { silent = false } = {}) => {
    const normalizedUsername = String(username || '').trim().toLowerCase()
    if (!user || !normalizedUsername) return { ...DEFAULT_PRIVACY_RELATION }
    try {
      const data = await getUserPrivacy(normalizedUsername)
      const relation = normalizePrivacyRelation(data && data.privacy)
      setPrivacyByUsername((prev) => ({ ...prev, [normalizedUsername]: relation }))
      return relation
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
      return { ...DEFAULT_PRIVACY_RELATION }
    }
  }

  const updateUserPrivacyRelation = async (username, patch, { silent = false } = {}) => {
    const normalizedUsername = String(username || '').trim().toLowerCase()
    if (!normalizedUsername) return { ...DEFAULT_PRIVACY_RELATION }
    try {
      const data = await setUserPrivacy(normalizedUsername, patch)
      const relation = normalizePrivacyRelation(data && data.privacy)
      setPrivacyByUsername((prev) => ({ ...prev, [normalizedUsername]: relation }))
      await loadMyPrivacy({ silent: true })
      return relation
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
      throw err
    }
  }

  const loadSecurityStatus = async ({ silent = false } = {}) => {
    if (!user) return { ...DEFAULT_TWO_FACTOR_STATUS }
    try {
      const data = await getTwoFactorStatus()
      const next = data && data.twoFactor ? {
        eligible: data.twoFactor.eligible === true,
        enabled: data.twoFactor.enabled === true,
        pendingSetup: data.twoFactor.pendingSetup === true,
        backupCodesCount: Math.max(0, Number(data.twoFactor.backupCodesCount || 0))
      } : { ...DEFAULT_TWO_FACTOR_STATUS }
      setTwoFactorStatus(next)
      return next
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
      return { ...DEFAULT_TWO_FACTOR_STATUS }
    }
  }

  const loadUserSessions = async ({ silent = false } = {}) => {
    if (!user) return []
    if (!silent) setSessionsLoading(true)
    try {
      const data = await getMySessions()
      const nextSessions = Array.isArray(data && data.sessions) ? data.sessions : []
      setSessions(nextSessions)
      return nextSessions
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
      return []
    } finally {
      if (!silent) setSessionsLoading(false)
    }
  }

  const applyPrivacyPatchForUser = async (username, patch, successMessage = 'Privacy updated.') => {
    if (!username) return
    try {
      const relation = await updateUserPrivacyRelation(username, patch, { silent: true })
      if (profileView && profileView.username === username) {
        setProfilePrivacy(relation)
      }
      setStatus({ type: 'info', message: successMessage })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const togglePrivacyQuickFlag = (key) => {
    if (!key) return
    setPrivacyQuickFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const applyPrivacyQuickRule = async () => {
    if (!user) return
    const username = String(privacyQuickUsername || '').trim().replace(/^@+/, '').toLowerCase()
    if (!username) {
      setStatus({ type: 'error', message: 'Enter @username.' })
      return
    }
    const selfUsername = String(user.username || '').trim().toLowerCase()
    if (username === selfUsername) {
      setStatus({ type: 'error', message: 'Cannot configure privacy rules for yourself.' })
      return
    }
    const patch = {
      isMuted: privacyQuickFlags.isMuted === true,
      isBlocked: privacyQuickFlags.isBlocked === true,
      hideProfileContent: privacyQuickFlags.hideProfileContent === true,
      denyDm: privacyQuickFlags.denyDm === true
    }
    if (!Object.values(patch).some(Boolean)) {
      setStatus({ type: 'error', message: 'Enable at least one privacy flag.' })
      return
    }

    setPrivacyQuickLoading(true)
    try {
      const relation = await updateUserPrivacyRelation(username, patch, { silent: true })
      if (profileView && String(profileView.username || '').trim().toLowerCase() === username) {
        setProfilePrivacy(relation)
      }
      setStatus({ type: 'success', message: `Privacy rule saved for @${username}.` })
      setPrivacyQuickUsers([])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setPrivacyQuickLoading(false)
    }
  }

  const applyPrivacyBatchPreset = async (preset) => {
    if (!user || privacyQuickLoading) return
    const usernames = Array.from(new Set(
      (privacyControls || [])
        .map((item) => String(item && item.targetUsername ? item.targetUsername : '').trim().toLowerCase())
        .filter(Boolean)
    ))
    if (usernames.length === 0) {
      setStatus({ type: 'info', message: 'No privacy rules to apply preset.' })
      return
    }

    let patch = null
    let title = ''
    if (preset === 'shield-all') {
      patch = { denyDm: true, hideProfileContent: true }
      title = 'Shield mode'
    } else if (preset === 'mute-all') {
      patch = { isMuted: true }
      title = 'Mute mode'
    } else if (preset === 'clear-all') {
      patch = {
        isMuted: false,
        isBlocked: false,
        hideProfileContent: false,
        denyDm: false
      }
      title = 'Clear mode'
    } else {
      return
    }

    setPrivacyQuickLoading(true)
    let successCount = 0
    let failedCount = 0
    try {
      for (const username of usernames) {
        try {
          const data = await setUserPrivacy(username, patch)
          const relation = normalizePrivacyRelation(data && data.privacy)
          setPrivacyByUsername((prev) => ({ ...prev, [username]: relation }))
          if (profileView && String(profileView.username || '').trim().toLowerCase() === username) {
            setProfilePrivacy(relation)
          }
          successCount += 1
        } catch (err) {
          failedCount += 1
        }
      }
      await loadMyPrivacy({ silent: true })
      if (failedCount > 0) {
        setStatus({ type: 'info', message: `${title}: updated ${successCount}, failed ${failedCount}.` })
      } else {
        setStatus({ type: 'success', message: `${title}: updated ${successCount}.` })
      }
    } finally {
      setPrivacyQuickLoading(false)
    }
  }

  const loadAdminUsers = async (query) => {
    try {
      const data = await adminListUsers(query || '')
      const users = data.users || []
      setAdminUsers(users)
      setAdminRoleByUser((prev) => {
        const next = { ...prev }
        users.forEach((item) => {
          next[item.id] = getUserRoleList(item)
        })
        return next
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const loadAdminVerificationRequests = async (status = adminVerificationFilter, query = adminQuery) => {
    setAdminVerificationLoading(true)
    try {
      const data = await adminListVerificationRequests(status || 'pending', query || '')
      setAdminVerificationRequests(
        Array.isArray(data && data.requests)
          ? data.requests.map((item) => normalizeVerificationRequest(item)).filter(Boolean)
          : []
      )
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setAdminVerificationLoading(false)
    }
  }

  const handleCreateVerificationRequest = async () => {
    if (!user) return
    const payload = {
      fullName: String(verificationForm.fullName || '').trim(),
      reason: String(verificationForm.reason || '').trim(),
      evidence: String(verificationForm.evidence || '').trim()
    }

    if (payload.fullName.length < 2) {
      setStatus({ type: 'error', message: 'Укажи имя минимум из 2 символов.' })
      return
    }
    if (payload.reason.length < 12) {
      setStatus({ type: 'error', message: 'Опиши причину минимум в 12 символов.' })
      return
    }

    setVerificationSubmitting(true)
    try {
      const data = await createMyVerificationRequest(payload)
      setVerificationRequest(normalizeVerificationRequest(data && data.request))
      setStatus({ type: 'success', message: 'Заявка на верификацию отправлена.' })
      if (view === 'admin' && user.isAdmin) {
        loadAdminVerificationRequests(adminVerificationFilter, adminQuery)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setVerificationSubmitting(false)
    }
  }

  const handleCancelVerificationRequest = async () => {
    setVerificationSubmitting(true)
    try {
      const data = await cancelMyVerificationRequest()
      setVerificationRequest(normalizeVerificationRequest(data && data.request))
      setStatus({ type: 'info', message: 'Заявка отменена.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setVerificationSubmitting(false)
    }
  }

  const handleAdminReviewVerification = async (requestItem, decision) => {
    const requestId = requestItem && requestItem.id ? requestItem.id : ''
    if (!requestId) return
    const adminNote = String(adminVerificationNoteByRequest[requestId] || '').trim()

    try {
      const response = await adminReviewVerificationRequest(requestId, decision, adminNote)
      if (response && response.user && user && response.user.id === user.id) {
        setUser((prev) => (prev ? { ...prev, isVerified: response.user.isVerified === true } : prev))
      }
      setAdminVerificationNoteByRequest((prev) => ({ ...prev, [requestId]: '' }))
      await Promise.all([
        loadAdminVerificationRequests(adminVerificationFilter, adminQuery),
        loadAdminUsers(adminQuery)
      ])
      setStatus({
        type: 'success',
        message: decision === 'approved' ? 'Заявка одобрена.' : 'Заявка отклонена.'
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleAdminCreateRole = async () => {
    const value = String(adminRoleDraft.value || '').trim().toLowerCase()
    const label = String(adminRoleDraft.label || '').trim()
    if (!value || !label) {
      setStatus({ type: 'error', message: 'Заполни code роли и название.' })
      return
    }
    try {
      await adminCreateRole(value, label)
      await loadRolesCatalog()
      setAdminRoleDraft({ value: '', label: '' })
      setStatus({ type: 'success', message: `Роль ${label} добавлена.` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleAdminSetRoleForUser = async (targetUser) => {
    const selectedRoles = Array.isArray(adminRoleByUser[targetUser.id])
      ? adminRoleByUser[targetUser.id].map((item) => String(item || '').trim()).filter(Boolean)
      : getUserRoleList(targetUser)
    if (selectedRoles.length === 0) {
      setStatus({ type: 'error', message: 'Выбери хотя бы одну роль для пользователя.' })
      return
    }
    try {
      await adminSetUserRole(targetUser.id, selectedRoles)
      await loadAdminUsers(adminQuery)
      if (user && targetUser.id === user.id) {
        setUser((prev) => (prev ? { ...prev, role: selectedRoles[0], roles: selectedRoles } : prev))
      }
      setStatus({ type: 'success', message: `Роли @${targetUser.username} обновлены.` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleAdminResetPasswordForUser = async (targetUser) => {
    if (!targetUser || !targetUser.id) return
    const nextPassword = String(adminResetPasswordByUser[targetUser.id] || '').trim()
    if (nextPassword.length < 6) {
      setStatus({ type: 'error', message: 'Новый пароль должен быть минимум 6 символов.' })
      return
    }
    try {
      const data = await adminResetUserPassword(targetUser.id, nextPassword, true)
      setAdminResetPasswordByUser((prev) => ({ ...prev, [targetUser.id]: '' }))
      const revokedCount = Math.max(0, Number(data && data.revokedCount ? data.revokedCount : 0))
      setStatus({
        type: 'success',
        message: `Пароль @${targetUser.username} сброшен. Сессий завершено: ${revokedCount}.`
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const toggleAdminRoleChoice = (userId, roleValue) => {
    if (!userId || !roleValue) return
    setAdminRoleByUser((prev) => {
      const current = Array.isArray(prev[userId]) ? prev[userId] : []
      const hasRole = current.includes(roleValue)
      const nextRoles = hasRole
        ? current.filter((item) => item !== roleValue)
        : [...current, roleValue]
      return { ...prev, [userId]: nextRoles }
    })
  }

  const handleStartTwoFactorSetup = async () => {
    setLoading(true)
    try {
      const data = await setupTwoFactor()
      setTwoFactorSetup(data && data.setup ? data.setup : null)
      setTwoFactorCode('')
      setTwoFactorBackupCode('')
      setFreshBackupCodes([])
      await loadSecurityStatus({ silent: true })
      setStatus({ type: 'info', message: '2FA setup started. Add secret to your authenticator and confirm code.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEnableTwoFactor = async () => {
    const code = String(twoFactorCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      setStatus({ type: 'error', message: 'Enter a valid 6-digit code.' })
      return
    }
    setLoading(true)
    try {
      const data = await enableTwoFactor({ code })
      setFreshBackupCodes(Array.isArray(data && data.backupCodes) ? data.backupCodes : [])
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setTwoFactorBackupCode('')
      await loadSecurityStatus({ silent: true })
      await loadUserSessions({ silent: true })
      setStatus({ type: 'success', message: '2FA enabled. Save backup codes in a safe place.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    const code = String(twoFactorCode || '').trim()
    const backupCode = String(twoFactorBackupCode || '').trim()
    if (!code && !backupCode) {
      setStatus({ type: 'error', message: 'Enter TOTP code or backup code.' })
      return
    }
    setLoading(true)
    try {
      await disableTwoFactor({ code, backupCode })
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setTwoFactorBackupCode('')
      setFreshBackupCodes([])
      await loadSecurityStatus({ silent: true })
      setStatus({ type: 'info', message: '2FA disabled.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    const code = String(twoFactorCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      setStatus({ type: 'error', message: 'Enter current 6-digit TOTP code.' })
      return
    }
    setLoading(true)
    try {
      const data = await regenerateTwoFactorBackupCodes({ code })
      setFreshBackupCodes(Array.isArray(data && data.backupCodes) ? data.backupCodes : [])
      setTwoFactorCode('')
      await loadSecurityStatus({ silent: true })
      setStatus({ type: 'success', message: 'Backup codes regenerated.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    if (!sessionId) return
    try {
      await revokeSession(sessionId, 'manual')
      await loadUserSessions({ silent: true })
      setStatus({ type: 'info', message: 'Session revoked.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleRevokeOtherSessions = async () => {
    try {
      const data = await revokeOtherSessions()
      await loadUserSessions({ silent: true })
      const count = Math.max(0, Number(data && data.revokedCount ? data.revokedCount : 0))
      setStatus({ type: 'info', message: `Other sessions revoked: ${count}.` })
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
    setTwoFactorLogin({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setSettingsSection('general')
    setView('login')
    setActiveConversation(null)
    setChatMobilePane('list')
    setMessages([])
    setMyStickers([])
    setMyGifs([])
    setRecentStickerIds([])
    setRecentGifIds([])
    setMediaPanelOpen(false)
    setMediaPanelTab(MEDIA_PANEL_TABS.emoji)
    setMediaPanelQuery('')
    setBookmarkPanelOpen(false)
    setBookmarkPanelLoading(false)
    setConversationBookmarks([])
    setBookmarkedMessageIdsByConversation({})
    setForwardDialogOpen(false)
    setForwardSourceMessage(null)
    setForwardConversationId('')
    setForwardQuery('')
    setForwardComment('')
    setForwardLoading(false)
    setPollComposerOpen(false)
    setPollDraft(INITIAL_POLL_DRAFT)
    setPollVoteLoadingByMessage({})
    setConversations([])
    setProfileView(null)
    setProfilePrivacy({ ...DEFAULT_PRIVACY_RELATION })
    setProfilePosts([])
    setProfileTracks([])
    setProfilePostFilter('all')
    setMyTracks([])
    setActiveTrackId(null)
    setProfileBackView('feed')
    setTrackTitle('')
    setTrackArtist('')
    setTrackFile(null)
    setVerificationRequest(null)
    setVerificationForm({ ...initialVerificationForm })
    setVerificationSubmitting(false)
    setAdminUsers([])
    setAdminWarnReason({})
    setAdminResetPasswordByUser({})
    setAdminRoleByUser({})
    setAdminVerificationRequests([])
    setAdminVerificationFilter('pending')
    setAdminVerificationLoading(false)
    setAdminVerificationNoteByRequest({})
    setPrivacyByUsername({})
    setPrivacyControls([])
    setPrivacyControlsLoading(false)
    setPrivacyQuickUsername('')
    setPrivacyQuickUsers([])
    setPrivacyQuickLoading(false)
    setPrivacyQuickSearchLoading(false)
    setPrivacyQuickFlags({
      isMuted: false,
      isBlocked: false,
      hideProfileContent: false,
      denyDm: true
    })
    privacyQuickSearchSeqRef.current += 1
    setBlockedUsers([])
    setSessions([])
    setSessionsLoading(false)
    setTwoFactorStatus({ ...DEFAULT_TWO_FACTOR_STATUS })
    setTwoFactorSetup(null)
    setTwoFactorCode('')
    setTwoFactorBackupCode('')
    setFreshBackupCodes([])
    setDashboardFeedQuery('')
    dashboardRefreshLoadingRef.current = false
    setDashboardRefreshLoading(false)
    clearMiniProfileTimers()
    miniProfileCacheRef.current.clear()
    miniProfileLoadingRef.current.clear()
    setMiniProfileCard(INITIAL_MINI_PROFILE_CARD_STATE)
    setDashboardCommandInput('')
    setDashboardLastRefreshAt(null)
    setFeedAuthorFilter('')
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
        setChatMobilePane('chat')
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
        setChatMobilePane('chat')
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

  const handleMessageFromProfile = async () => {
    if (!profileView || !profileView.username) return
    if (user && profileView.id === user.id) {
      setView('chats')
      return
    }
    if (profileMessagingBlocked) {
      setStatus({ type: 'error', message: 'Direct messages are blocked by privacy settings.' })
      return
    }
    setLoading(true)
    try {
      const data = await createConversation(profileView.username)
      const list = await getConversations()
      setConversations(list.conversations || [])
      if (data.conversation) {
        setActiveConversation(data.conversation)
        setChatMobilePane('chat')
      }
      setView('chats')
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSendProfileWave = async () => {
    if (!profileView || !profileView.username || !user || profileView.id === user.id) return
    if (profileMessagingBlocked) {
      setStatus({ type: 'error', message: 'Direct messages are blocked by privacy settings.' })
      return
    }
    setLoading(true)
    try {
      const data = await createConversation(profileView.username)
      const targetConversationId = data && data.conversation ? data.conversation.id : ''
      if (targetConversationId) {
        const waveMessage = PROFILE_WAVE_TEMPLATES[Math.floor(Math.random() * PROFILE_WAVE_TEMPLATES.length)] || PROFILE_WAVE_TEMPLATES[0]
        await sendMessage(targetConversationId, waveMessage)
      }
      const list = await getConversations()
      setConversations(list.conversations || [])
      if (data && data.conversation) {
        setActiveConversation(data.conversation)
        setChatMobilePane('chat')
      }
      setView('chats')
      setStatus({ type: 'success', message: 'Вейв отправлен в чат.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyProfileUsername = async () => {
    if (!profileView || !profileView.username || typeof navigator === 'undefined' || !navigator.clipboard) {
      setStatus({ type: 'info', message: profileView && profileView.username ? `@${profileView.username}` : 'Username недоступен.' })
      return
    }
    try {
      await navigator.clipboard.writeText(`@${profileView.username}`)
      setStatus({ type: 'success', message: 'Username скопирован.' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось скопировать username.' })
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

  const updateFeedExplorer = (patch) => {
    setFeedExplorer((prev) => normalizeFeedExplorerSettings({ ...prev, ...patch }))
  }

  const resetFeedFilters = () => {
    setFeedFilter(FEED_FILTERS.all)
    setFeedQuery('')
    setActiveFeedTag('')
    setFeedAuthorFilter('')
    setFeedExplorer({ ...DEFAULT_FEED_EXPLORER_SETTINGS })
  }

  const focusFeedQueryInput = () => {
    if (!isFeedToolboxOpen) {
      setIsFeedToolboxOpen(true)
    }
    window.requestAnimationFrame(() => {
      if (feedQueryInputRef.current) {
        feedQueryInputRef.current.focus()
        feedQueryInputRef.current.select()
      }
    })
  }

  const cycleFeedSortMode = () => {
    const options = FEED_SORT_TABS.map((item) => item.value)
    const currentIndex = options.indexOf(effectiveFeedSortMode)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length
    const nextSortMode = options[nextIndex]
    if (feedFilter === FEED_FILTERS.popular && nextSortMode !== FEED_SORT_MODES.engagement) {
      setFeedFilter(FEED_FILTERS.all)
    }
    updateFeedExplorer({ sortMode: nextSortMode })
  }

  const toggleFeedAuthorFilter = (authorId) => {
    if (!authorId) return
    setFeedAuthorFilter((prev) => (prev === authorId ? '' : authorId))
  }

  const openConversationFromDashboard = (conversation, { pane = 'chat' } = {}) => {
    if (!conversation || !conversation.id) return
    setActiveConversation(conversation)
    setView('chats')
    setChatMobilePane(pane)
  }

  const openFeedFocus = ({
    filter = FEED_FILTERS.all,
    tag = '',
    authorId = '',
    query = '',
    sortMode = null,
    timeWindow = null
  } = {}) => {
    setView('feed')
    setFeedFilter(normalizeFeedFilterValue(filter))
    setActiveFeedTag(tag || '')
    setFeedAuthorFilter(authorId || '')
    setFeedQuery(normalizeFeedQueryValue(query || ''))
    if (sortMode || timeWindow) {
      updateFeedExplorer({
        ...(sortMode ? { sortMode } : {}),
        ...(timeWindow ? { timeWindow } : {})
      })
    }
  }

  const runDashboardFocusAction = (actionId) => {
    if (actionId === 'drafts') {
      setView('chats')
      setChatListFilter(CHAT_LIST_FILTERS.all)
      setChatMobilePane('list')
      return
    }
    if (actionId === 'unread') {
      setView('chats')
      setChatListFilter(CHAT_LIST_FILTERS.unread)
      setChatMobilePane('list')
      return
    }
    if (actionId === 'feed-hot') {
      openFeedFocus({
        filter: FEED_FILTERS.popular,
        sortMode: FEED_SORT_MODES.engagement,
        timeWindow: FEED_TIME_WINDOWS.week
      })
      return
    }
    if (actionId === 'profile') {
      setView('profile')
      return
    }
    if (actionId === 'trend' && trendingTags[0]) {
      openFeedFocus({
        filter: FEED_FILTERS.all,
        tag: trendingTags[0].tag,
        sortMode: FEED_SORT_MODES.smart
      })
    }
  }

  const openDashboardFeedSearch = () => {
    const normalizedQuery = normalizeFeedQueryValue(dashboardFeedQuery)
    if (!normalizedQuery.trim()) {
      openFeedFocus({ filter: FEED_FILTERS.all, query: '' })
      return
    }
    openFeedFocus({
      filter: FEED_FILTERS.all,
      query: normalizedQuery,
      sortMode: FEED_SORT_MODES.smart
    })
  }

  const refreshWorkspaceSnapshot = async () => {
    if (!user || dashboardRefreshLoadingRef.current) return
    dashboardRefreshLoadingRef.current = true
    setDashboardRefreshLoading(true)
    try {
      const [healthData, postsData, conversationsData, presenceData] = await Promise.all([
        getHealth(),
        getPosts(),
        getConversations(),
        getPresence()
      ])
      setHealth(healthData && typeof healthData === 'object' ? healthData : { ok: false })
      setPosts(Array.isArray(postsData && postsData.posts) ? postsData.posts : [])
      const nextConversations = Array.isArray(conversationsData && conversationsData.conversations)
        ? conversationsData.conversations
        : []
      setConversations(nextConversations)
      if (nextConversations.length === 0) {
        setActiveConversation(null)
        setChatMobilePane('list')
      } else {
        setActiveConversation((prev) => {
          if (prev) {
            return nextConversations.find((item) => item.id === prev.id) || nextConversations[0]
          }
          return nextConversations[0]
        })
      }
      setOnlineUsers(Array.isArray(presenceData && presenceData.onlineUserIds) ? presenceData.onlineUserIds : [])
      setDashboardLastRefreshAt(Date.now())
      setStatus({ type: 'success', message: 'Данные центра управления обновлены.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Не удалось обновить данные центра управления.' })
    } finally {
      dashboardRefreshLoadingRef.current = false
      setDashboardRefreshLoading(false)
    }
  }

  const updateDashboardPreferences = (patch) => {
    if (!patch || typeof patch !== 'object') return
    setDashboardPreferences((prev) => ({
      ...prev,
      ...(patch.focusMode !== undefined ? { focusMode: patch.focusMode === true } : {}),
      ...(patch.autoRefresh !== undefined ? { autoRefresh: patch.autoRefresh === true } : {})
    }))
  }

  const toggleDashboardFocusMode = () => {
    updateDashboardPreferences({ focusMode: !dashboardFocusMode })
  }

  const toggleDashboardAutoRefresh = () => {
    updateDashboardPreferences({ autoRefresh: !dashboardAutoRefresh })
  }

  const pushDashboardCommand = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    setDashboardCommandHistory((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)]
      return next.slice(0, 10)
    })
  }

  const runDashboardCommand = (rawValue) => {
    const source = String(rawValue || '').trim()
    if (!source) {
      setStatus({ type: 'info', message: 'Введите команду или запрос.' })
      return
    }
    const value = source.toLowerCase()
    pushDashboardCommand(source)

    if (value.startsWith('#')) {
      openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.smart, tag: value })
      setDashboardCommandInput('')
      return
    }

    if (value.startsWith('@')) {
      openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.smart, query: value.slice(1) })
      setDashboardCommandInput('')
      return
    }

    if (value === 'unread' || value === 'непрочитанные' || value === 'непроч') {
      runDashboardFocusAction('unread')
      setDashboardCommandInput('')
      return
    }
    if (value === 'drafts' || value === 'черновики') {
      runDashboardFocusAction('drafts')
      setDashboardCommandInput('')
      return
    }
    if (value === 'hot' || value === 'хайп' || value === 'горячее') {
      runDashboardFocusAction('feed-hot')
      setDashboardCommandInput('')
      return
    }
    if (value === 'mine' || value === 'мои') {
      openFeedFocus({ filter: FEED_FILTERS.mine, sortMode: FEED_SORT_MODES.latest })
      setDashboardCommandInput('')
      return
    }
    if (value === 'bookmarks' || value === 'закладки') {
      openFeedFocus({ filter: FEED_FILTERS.bookmarks })
      setDashboardCommandInput('')
      return
    }
    if (value === 'profile' || value === 'профиль') {
      setView('profile')
      setDashboardCommandInput('')
      return
    }
    if (value === 'settings' || value === 'setting' || value === 'настройки' || value === 'настройка') {
      setView('settings')
      setDashboardCommandInput('')
      return
    }
    if (value === 'feed' || value === 'лента') {
      setView('feed')
      setDashboardCommandInput('')
      return
    }
    if (value === 'chats' || value === 'чаты') {
      setView('chats')
      setDashboardCommandInput('')
      return
    }
    if (value === 'refresh' || value === 'обновить') {
      refreshWorkspaceSnapshot()
      setDashboardCommandInput('')
      return
    }
    if (value === 'push') {
      syncPushState({ keepError: true }).catch(() => {})
      setDashboardCommandInput('')
      return
    }
    if (value === 'admin' && user && user.isAdmin) {
      setView('admin')
      setDashboardCommandInput('')
      return
    }

    openFeedFocus({
      filter: FEED_FILTERS.all,
      sortMode: FEED_SORT_MODES.smart,
      query: source
    })
    setDashboardCommandInput('')
  }

  const openGlobalPalette = () => {
    if (!user) return
    setGlobalPaletteOpen(true)
    setGlobalPaletteQuery('')
    setGlobalPaletteUsers([])
    setGlobalPaletteLoading(false)
  }

  const closeGlobalPalette = () => {
    globalPaletteSearchSeqRef.current += 1
    setGlobalPaletteOpen(false)
    setGlobalPaletteQuery('')
    setGlobalPaletteUsers([])
    setGlobalPaletteLoading(false)
  }

  const getGlobalPaletteActions = () => {
    const actions = [
      {
        id: 'go-dashboard',
        title: 'Открыть центр управления',
        hint: 'Панель с быстрыми действиями',
        keywords: 'dashboard панель центр',
        run: () => setView('dashboard')
      },
      {
        id: 'go-feed',
        title: 'Открыть ленту',
        hint: 'Посты и тренды',
        keywords: 'feed лента посты',
        run: () => setView('feed')
      },
      {
        id: 'go-chats',
        title: 'Открыть чаты',
        hint: 'Диалоги и группы',
        keywords: 'chat чаты диалоги',
        run: () => setView('chats')
      },
      {
        id: 'go-profile',
        title: 'Открыть мой профиль',
        hint: 'Редактирование профиля',
        keywords: 'profile профиль',
        run: () => setView('profile')
      },
      {
        id: 'go-settings',
        title: 'Открыть настройки',
        hint: 'Безопасность, сессии, конфиденциальность',
        keywords: 'settings настройки безопасность сессии',
        run: () => setView('settings')
      },
      {
        id: 'focus-unread',
        title: 'Непрочитанные чаты',
        hint: `${unreadConversationCount} в списке`,
        keywords: 'unread непрочитанные',
        run: () => runDashboardFocusAction('unread')
      },
      {
        id: 'focus-hot',
        title: 'Горячая лента',
        hint: `${hotFeedPosts.length} постов`,
        keywords: 'hot хайп горячее',
        run: () => runDashboardFocusAction('feed-hot')
      },
      {
        id: 'focus-bookmarks',
        title: 'Закладки',
        hint: 'Сохраненные посты',
        keywords: 'bookmarks закладки сохраненное',
        run: () => openFeedFocus({ filter: FEED_FILTERS.bookmarks })
      },
      {
        id: 'refresh-workspace',
        title: 'Обновить данные',
        hint: 'Перезагрузка рабочей зоны',
        keywords: 'refresh обновить sync',
        run: () => refreshWorkspaceSnapshot()
      },
      {
        id: 'toggle-focus',
        title: dashboardFocusMode ? 'Отключить фокус-режим' : 'Включить фокус-режим',
        hint: dashboardFocusMode ? 'Сейчас включен' : 'Сейчас выключен',
        keywords: 'focus режим',
        run: () => toggleDashboardFocusMode()
      },
      {
        id: 'toggle-autorefresh',
        title: dashboardAutoRefresh ? 'Выключить автообновление' : 'Включить автообновление',
        hint: dashboardAutoRefresh ? 'Сейчас включено' : 'Сейчас выключено',
        keywords: 'auto refresh автообновление',
        run: () => toggleDashboardAutoRefresh()
      },
      {
        id: 'toggle-theme',
        title: theme === 'dark' ? 'Светлая тема' : 'Темная тема',
        hint: 'Сменить цветовой режим',
        keywords: 'theme тема dark light',
        run: () => toggleTheme()
      }
    ]
    if (pushState.supported) {
      actions.push({
        id: 'toggle-push',
        title: pushState.enabled ? 'Отключить push' : 'Включить push',
        hint: pushState.permission === 'denied' ? 'Разрешите уведомления в браузере' : 'Управление уведомлениями',
        keywords: 'push notifications уведомления',
        run: () => handlePushToggle()
      })
    }
    if (user && user.isAdmin) {
      actions.push({
        id: 'go-admin',
        title: 'Открыть админ-панель',
        hint: 'Управление пользователями и ролями',
        keywords: 'admin модерация роли',
        run: () => setView('admin')
      })
    }
    return actions
  }

  const runGlobalPaletteAction = (action) => {
    if (!action || typeof action.run !== 'function') return
    closeGlobalPalette()
    action.run()
  }

  const runGlobalPaletteSubmit = () => {
    const query = String(globalPaletteQuery || '').trim()
    const normalized = query.toLowerCase()
    const actions = getGlobalPaletteActions()
    const filtered = normalized
      ? actions.filter((item) => `${item.title} ${item.hint} ${item.keywords}`.toLowerCase().includes(normalized))
      : actions

    if (filtered.length > 0) {
      runGlobalPaletteAction(filtered[0])
      return
    }
    if (globalPaletteUsers.length > 0) {
      const firstUser = globalPaletteUsers[0]
      closeGlobalPalette()
      openProfile(firstUser.username)
      return
    }
    if (query) {
      closeGlobalPalette()
      runDashboardCommand(query)
    }
  }

  const clearMiniProfileTimers = () => {
    if (miniProfileOpenTimerRef.current) {
      window.clearTimeout(miniProfileOpenTimerRef.current)
      miniProfileOpenTimerRef.current = null
    }
    if (miniProfileCloseTimerRef.current) {
      window.clearTimeout(miniProfileCloseTimerRef.current)
      miniProfileCloseTimerRef.current = null
    }
  }

  const hideMiniProfileCard = ({ immediate = false } = {}) => {
    if (immediate) {
      clearMiniProfileTimers()
      setMiniProfileCard(INITIAL_MINI_PROFILE_CARD_STATE)
      return
    }
    if (miniProfileCloseTimerRef.current) {
      window.clearTimeout(miniProfileCloseTimerRef.current)
    }
    miniProfileCloseTimerRef.current = window.setTimeout(() => {
      setMiniProfileCard(INITIAL_MINI_PROFILE_CARD_STATE)
      miniProfileCloseTimerRef.current = null
    }, 120)
  }

  const resolveMiniProfilePosition = (clientX, clientY) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return { x: 20, y: 20 }
    return getMenuPosition(
      Number(clientX || 0),
      Number(clientY || 0),
      MINI_PROFILE_CARD_ESTIMATED_WIDTH,
      MINI_PROFILE_CARD_ESTIMATED_HEIGHT,
      { padding: 8, gap: 12 }
    )
  }

  const getMiniProfileCacheKey = (targetUser) => {
    if (!targetUser || typeof targetUser !== 'object') return ''
    const username = String(targetUser.username || '').trim().toLowerCase()
    if (username) return `username:${username}`
    const id = String(targetUser.id || '').trim()
    return id ? `id:${id}` : ''
  }

  const normalizeMiniProfileUser = (rawUser) => {
    if (!rawUser || typeof rawUser !== 'object') return null
    const username = String(rawUser.username || '').trim()
    const id = rawUser.id ? String(rawUser.id) : (username ? `username:${username}` : '')
    if (!id && !username) return null
    const roleValues = getUserRoleList(rawUser)
    const roleLabels = roleValues
      .map((value) => roleLabelByValue.get(value) || value)
      .filter(Boolean)
    const displayName = String(rawUser.displayName || username || 'Пользователь').trim()
    const statusEmoji = String(rawUser.statusEmoji || '').trim()
    const statusText = String(rawUser.statusText || '').trim()
    const isVerified = rawUser.isVerified === true || rawUser.is_verified === true
    const subscriptionKnown = Object.prototype.hasOwnProperty.call(rawUser, 'isSubscribed')
      || Object.prototype.hasOwnProperty.call(rawUser, 'is_subscribed')
    const isSubscribed = subscriptionKnown && (rawUser.isSubscribed === true || rawUser.is_subscribed === true)
    const subscribersCountKnown = Object.prototype.hasOwnProperty.call(rawUser, 'subscribersCount')
      || Object.prototype.hasOwnProperty.call(rawUser, 'subscribers_count')
    const subscribersCountRaw = Number(
      Object.prototype.hasOwnProperty.call(rawUser, 'subscribersCount')
        ? rawUser.subscribersCount
        : rawUser.subscribers_count
    )
    const subscribersCount = Number.isFinite(subscribersCountRaw)
      ? Math.max(0, Math.floor(subscribersCountRaw))
      : 0
    const onlineKnown = Object.prototype.hasOwnProperty.call(rawUser, 'online')
    return {
      id,
      username,
      displayName,
      avatarUrl: rawUser.avatarUrl || '',
      roleLabels: roleLabels.length > 0 ? roleLabels : ['Студент'],
      isVerified,
      statusEmoji,
      statusText,
      isSubscribed,
      subscriptionKnown,
      subscribersCount,
      subscribersCountKnown,
      online: rawUser.online === true,
      onlineKnown
    }
  }

  const mergeMiniProfileUser = (baseUser, extraUser) => {
    if (!baseUser && !extraUser) return null
    if (!baseUser) return extraUser
    if (!extraUser) return baseUser
    const roleLabels = Array.from(new Set([
      ...(Array.isArray(extraUser.roleLabels) ? extraUser.roleLabels : []),
      ...(Array.isArray(baseUser.roleLabels) ? baseUser.roleLabels : [])
    ].filter(Boolean)))
    const onlineKnown = baseUser.onlineKnown === true || extraUser.onlineKnown === true
    const online = baseUser.onlineKnown === true
      ? baseUser.online
      : (extraUser.onlineKnown === true ? extraUser.online : (baseUser.online === true || extraUser.online === true))
    const subscriptionKnown = baseUser.subscriptionKnown === true || extraUser.subscriptionKnown === true
    const isSubscribed = baseUser.subscriptionKnown === true
      ? baseUser.isSubscribed === true
      : (extraUser.subscriptionKnown === true ? extraUser.isSubscribed === true : (baseUser.isSubscribed === true || extraUser.isSubscribed === true))
    const subscribersCountKnown = baseUser.subscribersCountKnown === true || extraUser.subscribersCountKnown === true
    const subscribersCount = extraUser.subscribersCountKnown === true
      ? Math.max(0, Number(extraUser.subscribersCount || 0))
      : (baseUser.subscribersCountKnown === true
        ? Math.max(0, Number(baseUser.subscribersCount || 0))
        : Math.max(0, Number(baseUser.subscribersCount || 0), Number(extraUser.subscribersCount || 0)))
    return {
      ...baseUser,
      ...extraUser,
      roleLabels: roleLabels.length > 0 ? roleLabels : ['Студент'],
      isVerified: baseUser.isVerified === true || extraUser.isVerified === true,
      isSubscribed,
      subscriptionKnown,
      subscribersCount,
      subscribersCountKnown,
      online,
      onlineKnown
    }
  }

  const hydrateMiniProfileUser = async (baseUser) => {
    if (!baseUser || !baseUser.username) return
    const cacheKey = getMiniProfileCacheKey(baseUser)
    if (!cacheKey || miniProfileLoadingRef.current.has(cacheKey)) return
    miniProfileLoadingRef.current.add(cacheKey)
    try {
      const data = await getProfile(baseUser.username)
      const fetchedUser = normalizeMiniProfileUser(data && data.user)
      if (!fetchedUser) return
      const merged = mergeMiniProfileUser(baseUser, fetchedUser)
      miniProfileCacheRef.current.set(cacheKey, merged)
      setMiniProfileCard((prev) => {
        if (!prev.open || !prev.user) return prev
        if (getMiniProfileCacheKey(prev.user) !== cacheKey) return prev
        return {
          ...prev,
          user: mergeMiniProfileUser(prev.user, merged)
        }
      })
    } catch (err) {
      // Profile hydration is opportunistic; ignore transient hover fetch failures.
    } finally {
      miniProfileLoadingRef.current.delete(cacheKey)
    }
  }

  const queueMiniProfileCard = (event, rawUser) => {
    if (!event) return
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
      return
    }
    const normalized = normalizeMiniProfileUser(rawUser)
    if (!normalized) return
    const cacheKey = getMiniProfileCacheKey(normalized)
    const cached = cacheKey ? miniProfileCacheRef.current.get(cacheKey) : null
    const preparedUser = mergeMiniProfileUser(normalized, cached)
    if (user && preparedUser && preparedUser.username && preparedUser.username !== user.username) {
      const privacyKey = String(preparedUser.username || '').trim().toLowerCase()
      if (privacyKey && !privacyByUsernameRef.current[privacyKey]) {
        loadUserPrivacyRelation(preparedUser.username, { silent: true })
      }
    }
    clearMiniProfileTimers()
    const openAtX = Number(event.clientX || 0)
    const openAtY = Number(event.clientY || 0)
    miniProfileOpenTimerRef.current = window.setTimeout(() => {
      const coords = resolveMiniProfilePosition(openAtX, openAtY)
      setMiniProfileCard({
        open: true,
        x: coords.x,
        y: coords.y,
        user: preparedUser
      })
      miniProfileOpenTimerRef.current = null
    }, 110)
    if (preparedUser && preparedUser.username && !cached) {
      hydrateMiniProfileUser(preparedUser)
    }
  }

  const moveMiniProfileCard = (event) => {
    if (!event || !miniProfileCard.open) return
    const coords = resolveMiniProfilePosition(Number(event.clientX || 0), Number(event.clientY || 0))
    setMiniProfileCard((prev) => {
      if (!prev.open || !prev.user) return prev
      if (Math.abs(prev.x - coords.x) < 2 && Math.abs(prev.y - coords.y) < 2) return prev
      return {
        ...prev,
        x: coords.x,
        y: coords.y
      }
    })
  }

  const handleMiniProfileOpen = () => {
    const target = miniProfileCard.user
    if (!target) return
    hideMiniProfileCard({ immediate: true })
    if (target.username) {
      openProfile(target.username)
      return
    }
    if (user && target.id === String(user.id)) {
      setView('profile')
    }
  }

  const handleMiniProfileMessage = () => {
    const target = miniProfileCard.user
    if (!target || !target.username) return
    if (miniProfileDmBlocked) {
      setStatus({ type: 'error', message: 'Direct messages are blocked by privacy settings.' })
      return
    }
    if (user && target.username === user.username) {
      hideMiniProfileCard({ immediate: true })
      setView('chats')
      return
    }
    hideMiniProfileCard({ immediate: true })
    handleStartConversation(target.username)
  }

  const handleMiniProfileOpenPosts = () => {
    const target = miniProfileCard.user
    if (!target) return
    hideMiniProfileCard({ immediate: true })
    if (target.id && !String(target.id).startsWith('username:')) {
      openFeedFocus({
        filter: FEED_FILTERS.all,
        authorId: target.id
      })
      return
    }
    if (target.username) {
      openProfile(target.username)
      setStatus({ type: 'info', message: 'Открыт профиль автора: используй вкладку постов.' })
    }
  }

  const handleMiniProfileCopyUsername = async () => {
    const target = miniProfileCard.user
    if (!target || !target.username) return
    const value = `@${target.username}`
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      setStatus({ type: 'info', message: value })
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setStatus({ type: 'success', message: 'Username скопирован.' })
    } catch (_err) {
      setStatus({ type: 'error', message: 'Не удалось скопировать username.' })
    }
  }

  const handleMiniProfileWave = async () => {
    const target = miniProfileCard.user
    if (!target || !target.username || !user) return
    if (target.username === user.username) return
    if (miniProfileDmBlocked) {
      setStatus({ type: 'error', message: 'Direct messages are blocked by privacy settings.' })
      return
    }
    try {
      const data = await createConversation(target.username)
      const targetConversationId = data && data.conversation ? data.conversation.id : ''
      if (targetConversationId) {
        const waveMessage = PROFILE_WAVE_TEMPLATES[Math.floor(Math.random() * PROFILE_WAVE_TEMPLATES.length)] || PROFILE_WAVE_TEMPLATES[0]
        await sendMessage(targetConversationId, waveMessage)
      }
      const list = await getConversations()
      setConversations(list.conversations || [])
      setStatus({ type: 'success', message: 'Вейв отправлен.' })
      hideMiniProfileCard({ immediate: true })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleMiniProfileToggleSubscription = async () => {
    const target = miniProfileCard.user
    if (!user || !target || !target.username) return
    if (target.username === user.username) return

    try {
      const data = await toggleSubscription(target.username)
      const subscribed = data && data.subscribed === true
      const cacheKey = getMiniProfileCacheKey(target)
      const fetched = normalizeMiniProfileUser(data && data.user)

      setMiniProfileCard((prev) => {
        if (!prev.open || !prev.user || prev.user.username !== target.username) return prev
        const currentFollowers = Math.max(0, Number(prev.user.subscribersCount || 0))
        const fallbackFollowers = Math.max(0, currentFollowers + (subscribed ? 1 : -1))
        const patched = {
          ...prev.user,
          isSubscribed: subscribed,
          subscriptionKnown: true,
          subscribersCount: fetched ? fetched.subscribersCount : fallbackFollowers,
          subscribersCountKnown: true
        }
        return {
          ...prev,
          user: fetched ? mergeMiniProfileUser(patched, fetched) : patched
        }
      })

      if (cacheKey) {
        const cached = miniProfileCacheRef.current.get(cacheKey)
        const currentFollowers = Math.max(0, Number((cached && cached.subscribersCount) || target.subscribersCount || 0))
        const fallbackFollowers = Math.max(0, currentFollowers + (subscribed ? 1 : -1))
        const patched = {
          ...(cached || target),
          isSubscribed: subscribed,
          subscriptionKnown: true,
          subscribersCount: fetched ? fetched.subscribersCount : fallbackFollowers,
          subscribersCountKnown: true
        }
        miniProfileCacheRef.current.set(cacheKey, fetched ? mergeMiniProfileUser(patched, fetched) : patched)
      }

      if (profileView && profileView.username === target.username && data && data.user) {
        setProfileView(data.user)
      }

      setUser((prev) => {
        if (!prev) return prev
        const delta = subscribed ? 1 : -1
        return {
          ...prev,
          subscriptionsCount: Math.max(0, Number(prev.subscriptionsCount || 0) + delta)
        }
      })

      setStatus({
        type: 'success',
        message: subscribed ? 'Подписка оформлена.' : 'Подписка отменена.'
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const applyFeedQuickPreset = (preset) => {
    if (!preset || typeof preset !== 'object') return
    if (preset.action === 'tag') {
      setActiveFeedTag((prev) => (prev === preset.value ? '' : preset.value))
      return
    }
    if (preset.action === 'author') {
      toggleFeedAuthorFilter(preset.value)
      return
    }
    if (preset.action === 'filter' && preset.value) {
      setFeedFilter(normalizeFeedFilterValue(preset.value))
    }
  }

  const insertComposerTag = (tagValue) => {
    const tag = String(tagValue || '').trim().toLowerCase()
    if (!tag.startsWith('#')) return
    setPostText((prev) => {
      const current = String(prev || '')
      if (extractHashtags(current).includes(tag)) return current
      const separator = current.trim().length > 0 && !/\s$/.test(current) ? ' ' : ''
      return `${current}${separator}${tag}`
    })
  }

  const loadConversationBookmarks = async (conversationId, { silent = false } = {}) => {
    if (!conversationId) {
      setConversationBookmarks([])
      return
    }
    if (!silent) {
      setBookmarkPanelLoading(true)
    }
    try {
      const data = await getConversationBookmarks(conversationId)
      const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : []
      const ids = bookmarks
        .map((bookmark) => bookmark && bookmark.messageId)
        .filter(Boolean)
      setBookmarkedMessageIdsByConversation((prev) => ({
        ...prev,
        [conversationId]: ids
      }))
      if (activeConversationRef.current && activeConversationRef.current.id === conversationId) {
        setConversationBookmarks(bookmarks)
      }
    } catch (err) {
      if (!silent) {
        setStatus({ type: 'error', message: err.message })
      }
    } finally {
      if (!silent) {
        setBookmarkPanelLoading(false)
      }
    }
  }

  const isMessageBookmarked = (messageId) => {
    if (!messageId) return false
    return activeConversationBookmarkedMessageIds.has(messageId)
  }

  const jumpToMessage = (messageId) => {
    if (!messageId) return
    const target = document.getElementById(`message-${messageId}`)
    if (!target) {
      setStatus({ type: 'info', message: 'Сообщение не найдено в текущей истории.' })
      return
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('message-jump-highlight')
    window.setTimeout(() => {
      target.classList.remove('message-jump-highlight')
    }, 1300)
  }

  const handleToggleMessageBookmark = async (msg, { closeMenu = false } = {}) => {
    if (!msg || !msg.id || !activeConversation) return
    try {
      const data = await toggleMessageBookmark(msg.id)
      const isActive = data && data.active === true
      const bookmark = data && data.bookmark ? data.bookmark : null
      const conversationId = activeConversation.id
      setBookmarkedMessageIdsByConversation((prev) => {
        const current = new Set(prev[conversationId] || [])
        if (isActive) {
          current.add(msg.id)
        } else {
          current.delete(msg.id)
        }
        return {
          ...prev,
          [conversationId]: Array.from(current)
        }
      })
      setConversationBookmarks((prev) => {
        if (isActive) {
          const source = bookmark || {
            messageId: msg.id,
            savedAt: new Date().toISOString(),
            messageCreatedAt: msg.createdAt,
            senderId: msg.senderId || null,
            senderUsername: msg.senderUsername || null,
            senderDisplayName: msg.senderDisplayName || null,
            preview: getMessagePreview(msg)
          }
          const next = [source, ...prev.filter((item) => item.messageId !== msg.id)]
          return next.slice(0, 200)
        }
        return prev.filter((item) => item.messageId !== msg.id)
      })
      setStatus({
        type: 'info',
        message: isActive ? 'Сообщение добавлено в сохраненные.' : 'Сообщение удалено из сохраненных.'
      })
      if (closeMenu) {
        setContextMenu(INITIAL_MESSAGE_MENU_STATE)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const applyStatusEmojiPreset = (emoji) => {
    setProfileForm((prev) => ({ ...prev, statusEmoji: emoji }))
  }

  const applyRandomStatusEmoji = () => {
    const next = STATUS_EMOJI_PRESETS[Math.floor(Math.random() * STATUS_EMOJI_PRESETS.length)] || ''
    setProfileForm((prev) => ({ ...prev, statusEmoji: next }))
  }

  const setProfileThemeColor = (nextColor) => {
    setProfileForm((prev) => {
      const fallback = normalizeHexColor(prev.themeColor, '#7a1f1d')
      const normalized = normalizeHexColor(nextColor, fallback)
      if (normalized === fallback) return prev
      return {
        ...prev,
        themeColor: normalized
      }
    })
  }

  const applyProfileColorPreset = (color) => {
    setProfileThemeColor(color)
  }

  const applyDeveloperPreset = (presetId) => {
    const preset = DEV_PROFILE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    setProfileShowcaseForm((prev) => {
      const currentBadges = Array.isArray(prev.badges) ? prev.badges : []
      const badgeSet = new Set(currentBadges)
      preset.badges.forEach((badgeId) => badgeSet.add(badgeId))
      return {
        ...prev,
        headline: String(prev.headline || '').trim() ? prev.headline : preset.headline,
        heroTheme: preset.heroTheme || prev.heroTheme,
        skillsInput: mergeSkillsInput(prev.skillsInput, preset.skills),
        badges: Array.from(badgeSet).slice(0, 6)
      }
    })
    setProfileForm((prev) => ({
      ...prev,
      statusEmoji: String(prev.statusEmoji || '').trim() ? prev.statusEmoji : preset.emoji
    }))
    setProfileThemeColor(preset.accent)
    setStatus({ type: 'success', message: `Применен dev-пресет: ${preset.label}.` })
  }

  const updateThemeColorFromWheelPoint = (clientX, clientY) => {
    const wheel = profileThemeWheelRef.current
    if (!wheel) return
    const rect = wheel.getBoundingClientRect()
    const radius = Math.min(rect.width, rect.height) / 2
    if (!radius) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = clientX - centerX
    const dy = clientY - centerY
    const saturation = Math.round((Math.min(Math.hypot(dx, dy), radius) / radius) * 100)
    const hue = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360)

    setProfileForm((prev) => {
      const fallback = normalizeHexColor(prev.themeColor, '#7a1f1d')
      const current = rgbToHsl(hexToRgb(fallback))
      const next = normalizeHexColor(hslToHex(hue, saturation, current.l), fallback)
      if (next === fallback) return prev
      return {
        ...prev,
        themeColor: next
      }
    })
  }

  const handleProfileThemeWheelPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    profileThemeWheelPointerRef.current = event.pointerId
    if (event.currentTarget && event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch (err) {
        // ignore unsupported capture
      }
    }
    updateThemeColorFromWheelPoint(event.clientX, event.clientY)
  }

  const handleProfileThemeWheelPointerMove = (event) => {
    if (profileThemeWheelPointerRef.current !== event.pointerId) return
    event.preventDefault()
    updateThemeColorFromWheelPoint(event.clientX, event.clientY)
  }

  const handleProfileThemeWheelPointerEnd = (event) => {
    if (profileThemeWheelPointerRef.current !== event.pointerId) return
    profileThemeWheelPointerRef.current = null
    if (event.currentTarget && event.currentTarget.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch (err) {
        // ignore unsupported release
      }
    }
  }

  const handleProfileThemeWheelKeyDown = (event) => {
    const key = event.key
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return
    event.preventDefault()
    const hueStep = event.shiftKey ? 10 : 4
    const saturationStep = event.shiftKey ? 10 : 4
    setProfileForm((prev) => {
      const fallback = normalizeHexColor(prev.themeColor, '#7a1f1d')
      const current = rgbToHsl(hexToRgb(fallback))
      let nextHue = current.h
      let nextSaturation = current.s
      if (key === 'ArrowLeft') nextHue = (current.h - hueStep + 360) % 360
      if (key === 'ArrowRight') nextHue = (current.h + hueStep) % 360
      if (key === 'ArrowUp') nextSaturation = clampNumber(current.s + saturationStep, 0, 100)
      if (key === 'ArrowDown') nextSaturation = clampNumber(current.s - saturationStep, 0, 100)
      const next = normalizeHexColor(hslToHex(nextHue, nextSaturation, current.l), fallback)
      if (next === fallback) return prev
      return {
        ...prev,
        themeColor: next
      }
    })
  }

  const handleProfileThemeLightnessChange = (event) => {
    const lightness = clampNumber(event.target.value, 0, 100)
    setProfileForm((prev) => {
      const fallback = normalizeHexColor(prev.themeColor, '#7a1f1d')
      const current = rgbToHsl(hexToRgb(fallback))
      const next = normalizeHexColor(hslToHex(current.h, current.s, lightness), fallback)
      if (next === fallback) return prev
      return {
        ...prev,
        themeColor: next
      }
    })
  }

  const handleProfileThemeHexChange = (event) => {
    setProfileThemeColor(event.target.value)
  }

  const updateUiPreference = (key, value) => {
    setUiPreferences((prev) => normalizeUiPreferences({ ...prev, [key]: value }))
  }

  const resetUiPreferences = () => {
    setUiPreferences({ ...DEFAULT_UI_PREFERENCES })
  }

  const toggleShowcaseBadge = (badgeId) => {
    setProfileShowcaseForm((prev) => {
      const current = Array.isArray(prev.badges) ? prev.badges : []
      const next = current.includes(badgeId)
        ? current.filter((item) => item !== badgeId)
        : [...current, badgeId]
      return {
        ...prev,
        badges: next.slice(0, 6)
      }
    })
  }

  const handleSaveProfileShowcase = async () => {
    if (!user || !user.id) return
    setLoading(true)
    try {
      const normalized = mapFormToShowcase(profileShowcaseForm)
      const data = await saveMyProfileShowcase(normalized)
      const saved = normalizeProfileShowcase(data && data.showcase)
      setProfileShowcaseByUserId((prev) => ({
        ...prev,
        [user.id]: saved
      }))
      setProfileShowcaseForm(mapShowcaseToForm(saved))
      setStatus({ type: 'success', message: 'Оформление профиля сохранено.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleResetProfileShowcase = async () => {
    if (!user || !user.id) return
    setLoading(true)
    try {
      const data = await saveMyProfileShowcase(DEFAULT_PROFILE_SHOWCASE)
      const saved = normalizeProfileShowcase(data && data.showcase)
      setProfileShowcaseByUserId((prev) => ({
        ...prev,
        [user.id]: saved
      }))
      setProfileShowcaseForm(mapShowcaseToForm(saved))
      setStatus({ type: 'info', message: 'Оформление профиля сброшено.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
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

  const clearTouchContextMenuTimer = () => {
    const state = touchContextMenuRef.current
    if (state && state.timer) {
      window.clearTimeout(state.timer)
      state.timer = null
    }
  }

  const resetTouchContextMenuState = ({ keepTriggered = false } = {}) => {
    const state = touchContextMenuRef.current
    if (!state) return
    clearTouchContextMenuTimer()
    state.startX = 0
    state.startY = 0
    state.target = null
    state.currentTarget = null
    state.onTrigger = null
    if (!keepTriggered) {
      state.triggered = false
    }
  }

  const createTouchContextMenuEvent = (state) => ({
    clientX: state.startX,
    clientY: state.startY,
    target: state.target,
    currentTarget: state.currentTarget,
    preventDefault: () => {},
    stopPropagation: () => {}
  })

  const handleTouchContextMenuStart = (event, onTrigger) => {
    if (!event || !event.touches || event.touches.length !== 1 || typeof onTrigger !== 'function') return
    const touch = event.touches[0]
    const state = touchContextMenuRef.current
    resetTouchContextMenuState()
    state.startX = touch.clientX
    state.startY = touch.clientY
    state.target = event.target
    state.currentTarget = event.currentTarget
    state.onTrigger = onTrigger
    state.triggered = false
    state.timer = window.setTimeout(() => {
      const nextState = touchContextMenuRef.current
      if (!nextState || typeof nextState.onTrigger !== 'function') return
      nextState.triggered = true
      nextState.timer = null
      nextState.onTrigger(createTouchContextMenuEvent(nextState))
    }, TOUCH_CONTEXT_MENU_DELAY_MS)
  }

  const handleTouchContextMenuMove = (event) => {
    const state = touchContextMenuRef.current
    if (!state || state.triggered || !state.onTrigger || !event || !event.touches || event.touches.length !== 1) return
    const touch = event.touches[0]
    const deltaX = Math.abs(touch.clientX - state.startX)
    const deltaY = Math.abs(touch.clientY - state.startY)
    if (deltaX > TOUCH_CONTEXT_MENU_MOVE_THRESHOLD || deltaY > TOUCH_CONTEXT_MENU_MOVE_THRESHOLD) {
      resetTouchContextMenuState()
    }
  }

  const handleTouchContextMenuEnd = (event) => {
    const state = touchContextMenuRef.current
    const wasTriggered = Boolean(state && state.triggered)
    resetTouchContextMenuState({ keepTriggered: true })
    if (wasTriggered) {
      if (event && event.cancelable) {
        event.preventDefault()
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation()
      }
    }
    window.setTimeout(() => {
      touchContextMenuRef.current.triggered = false
    }, 0)
  }

  const handleTouchContextMenuCancel = () => {
    resetTouchContextMenuState()
  }

  useEffect(() => () => {
    resetTouchContextMenuState()
  }, [])

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
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
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
        if (activeConversation) {
          setBookmarkedMessageIdsByConversation((prev) => {
            const current = new Set(prev[activeConversation.id] || [])
            if (!current.has(msg.id)) return prev
            current.delete(msg.id)
            return {
              ...prev,
              [activeConversation.id]: Array.from(current)
            }
          })
          setConversationBookmarks((prev) => prev.filter((item) => item.messageId !== msg.id))
        }
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
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
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
    setCallStateSync({ status: 'idle', withUserId: null, direction: null, startedAt: null })
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
      setCallStateSync({ status: 'connecting', withUserId: fromUserId, direction: 'incoming', startedAt: null })
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      const pc = createPeerConnection(fromUserId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current))
      await flushPendingIceCandidates()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef.current.emit('call:answer', { toUserId: fromUserId, answer })
      setCallStateSync({ status: 'in-call', withUserId: fromUserId, direction: 'incoming', startedAt: Date.now() })
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
      setCallStateSync({ status: 'calling', withUserId: targetId, direction: 'outgoing', startedAt: null })
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
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
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

  const updateActiveConversationPrivacy = async (patch, labels = {}) => {
    if (!activeConversation || activeConversation.isGroup || !activeConversation.other || !activeConversation.other.username) return null
    const username = activeConversation.other.username
    try {
      const relation = await updateUserPrivacyRelation(username, patch)
      if (profileView && profileView.username === username) {
        setProfilePrivacy(relation)
      }
      if (labels && labels.key && (labels.enabled || labels.disabled)) {
        const enabled = relation[labels.key] === true
        setStatus({
          type: 'info',
          message: enabled ? (labels.enabled || 'Updated.') : (labels.disabled || 'Updated.')
        })
      }
      return relation
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
      return null
    } finally {
      setChatMenu(INITIAL_CHAT_MENU_STATE)
    }
  }

  const toggleChatBlock = () => updateActiveConversationPrivacy(
    { isBlocked: !activeConversationPrivacy.isBlocked },
    {
      key: 'isBlocked',
      enabled: 'User blocked.',
      disabled: 'User unblocked.'
    }
  )

  const toggleChatMute = () => updateActiveConversationPrivacy(
    { isMuted: !activeConversationPrivacy.isMuted },
    {
      key: 'isMuted',
      enabled: 'Chat muted.',
      disabled: 'Chat unmuted.'
    }
  )

  const toggleChatHideProfile = () => updateActiveConversationPrivacy(
    { hideProfileContent: !activeConversationPrivacy.hideProfileContent },
    {
      key: 'hideProfileContent',
      enabled: 'Profile content hidden for you.',
      disabled: 'Profile content is visible again.'
    }
  )

  const toggleChatDenyDm = () => updateActiveConversationPrivacy(
    { denyDm: !activeConversationPrivacy.denyDm },
    {
      key: 'denyDm',
      enabled: 'Direct messages denied for this user.',
      disabled: 'Direct messages allowed for this user.'
    }
  )

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

  const getForwardSourceLabel = (msg) => {
    if (!msg || !msg.forwardedFrom) return 'Пользователь'
    const source = msg.forwardedFrom
    if (user && source.sourceSenderId && source.sourceSenderId === user.id) return 'Вы'
    return source.sourceSenderDisplayName || source.sourceSenderUsername || 'Пользователь'
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

  const closeForwardDialog = (force = false) => {
    if (forwardLoading && !force) return
    setForwardDialogOpen(false)
    setForwardSourceMessage(null)
    setForwardConversationId('')
    setForwardQuery('')
    setForwardComment('')
  }

  const openForwardDialog = (msg) => {
    if (!msg || !msg.id) return
    const defaultConversation = (
      conversations.find((conversation) => !activeConversation || conversation.id !== activeConversation.id) ||
      activeConversation ||
      conversations[0] ||
      null
    )
    setForwardSourceMessage(msg)
    setForwardConversationId(defaultConversation ? defaultConversation.id : '')
    setForwardQuery('')
    setForwardComment('')
    setForwardDialogOpen(true)
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const handleForwardMessage = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    if (!forwardSourceMessage || !forwardSourceMessage.id) return
    if (!forwardConversationId) {
      setStatus({ type: 'error', message: 'Выберите чат для пересылки.' })
      return
    }
    setForwardLoading(true)
    try {
      const data = await forwardMessageApi(forwardSourceMessage.id, {
        targetConversationId: forwardConversationId,
        comment: forwardComment
      })
      const payloadMessages = [data.commentMessage, data.message]
        .filter(Boolean)
        .map((item) => normalizeChatMessage(item))

      if (activeConversation && activeConversation.id === forwardConversationId && payloadMessages.length > 0) {
        setMessages((prev) => {
          const next = [...prev]
          payloadMessages.forEach((message) => {
            if (message && message.id && !next.some((item) => item.id === message.id)) {
              next.push(message)
            }
          })
          return next
        })
        await clearConversationUnread(forwardConversationId)
      }

      const list = await getConversations()
      setConversations(list.conversations || [])
      closeForwardDialog(true)
      setStatus({ type: 'success', message: 'Сообщение переслано.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setForwardLoading(false)
    }
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
  const profileMessagingBlocked = Boolean(
    user &&
    profileView &&
    user.id !== profileView.id &&
    (
      profilePrivacy.isBlocked ||
      profilePrivacy.blockedByTarget ||
      profilePrivacy.dmBlocked
    )
  )
  const profileFollowers = Number(profileView && profileView.subscribersCount ? profileView.subscribersCount : 0)
  const profileFollowing = Number(profileView && profileView.subscriptionsCount ? profileView.subscriptionsCount : 0)
  const profileTracksCount = Number(profileView && profileView.tracksCount ? profileView.tracksCount : profileTracks.length)
  const profileJoinedAt = profileView ? formatDate(profileView.createdAt) : ''
  const profileHeroThemeClass = profileShowcase && profileShowcase.heroTheme
    ? `profile-theme-${profileShowcase.heroTheme}`
    : 'profile-theme-default'
  const profileHeroHasBanner = Boolean(profileView && profileView.bannerUrl)
  const miniProfilePrivacy = useMemo(() => {
    if (!miniProfileCard || !miniProfileCard.user || !miniProfileCard.user.username) {
      return { ...DEFAULT_PRIVACY_RELATION }
    }
    const username = String(miniProfileCard.user.username || '').trim().toLowerCase()
    return normalizePrivacyRelation(privacyByUsername[username])
  }, [miniProfileCard, privacyByUsername])
  const miniProfileDmBlocked = miniProfilePrivacy.isBlocked || miniProfilePrivacy.blockedByTarget || miniProfilePrivacy.dmBlocked
  const profileViewRoleLabels = useMemo(() => (
    getUserRoleList(profileView).map((value) => roleLabelByValue.get(value) || value)
  ), [profileView, roleLabelByValue])
  const verificationRequestStatus = verificationRequest ? normalizeVerificationStatus(verificationRequest.status) : ''
  const verificationRequestStatusLabel = verificationRequestStatus
    ? (verificationStatusLabelByValue.get(verificationRequestStatus) || 'На проверке')
    : 'Нет заявки'
  const canCreateVerificationRequest = Boolean(user && !user.isVerified && verificationRequestStatus !== 'pending')
  const adminVerificationRows = useMemo(() => (
    (adminVerificationRequests || []).map((item) => {
      const normalized = normalizeVerificationRequest(item)
      if (!normalized) return null
      const targetUser = normalized.user && typeof normalized.user === 'object' ? normalized.user : {}
      const roleLabels = getUserRoleList(targetUser).map((value) => roleLabelByValue.get(value) || value)
      return {
        ...normalized,
        user: {
          ...targetUser,
          roleLabels: roleLabels.length > 0 ? roleLabels : ['Студент']
        }
      }
    }).filter(Boolean)
  ), [adminVerificationRequests, roleLabelByValue])
  const globalPaletteQueryNormalized = String(globalPaletteQuery || '').trim().toLowerCase()
  const globalPaletteActions = getGlobalPaletteActions()
  const globalPaletteVisibleActions = (globalPaletteQueryNormalized
    ? globalPaletteActions.filter((item) => `${item.title} ${item.hint} ${item.keywords}`.toLowerCase().includes(globalPaletteQueryNormalized))
    : globalPaletteActions
  ).slice(0, 8)
  const settingsActiveSessionCount = useMemo(() => (
    (sessions || []).filter((item) => item && !item.revokedAt).length
  ), [sessions])
  const settingsRoleLabels = useMemo(() => (
    getUserRoleList(user).map((value) => roleLabelByValue.get(value) || value)
  ), [user, roleLabelByValue])
  const settingsNavItems = useMemo(() => ([
    { id: 'general', icon: '⚙️', label: 'Общие настройки', badge: '' },
    { id: 'notifications', icon: '🔔', label: 'Уведомления', badge: pushState.enabled ? 'ON' : 'OFF' },
    { id: 'appearance', icon: '🎨', label: 'Оформление', badge: uiPreferences.style },
    { id: 'privacy', icon: '🔒', label: 'Конфиденциальность', badge: privacyControls.length > 0 ? String(privacyControls.length) : '' },
    { id: 'security', icon: '🛡️', label: '2FA и защита', badge: twoFactorStatus.enabled ? '2FA' : '' },
    { id: 'password', icon: '🔑', label: 'Пароль', badge: '' },
    { id: 'sessions', icon: '💻', label: 'Активные сеансы', badge: settingsActiveSessionCount > 0 ? String(settingsActiveSessionCount) : '' },
    { id: 'storage', icon: '🗂️', label: 'Данные и память', badge: '' },
    { id: 'stickers', icon: '😄', label: 'Стикеры и эмодзи', badge: myStickers.length > 0 ? String(myStickers.length) : '' },
    { id: 'language', icon: '🌐', label: 'Язык', badge: 'Русский' },
    { id: 'support', icon: '❓', label: 'Помощь', badge: '' }
  ]), [
    myStickers.length,
    privacyControls.length,
    pushState.enabled,
    settingsActiveSessionCount,
    twoFactorStatus.enabled,
    uiPreferences.style
  ])
  const settingsCurrentItem = useMemo(() => (
    settingsNavItems.find((item) => item.id === settingsSection) || settingsNavItems[0] || null
  ), [settingsNavItems, settingsSection])
  const settingsSectionHint = useMemo(() => {
    const hints = {
      general: 'Базовые параметры аккаунта и быстрые действия.',
      notifications: 'Управление push-уведомлениями и сигналами активности.',
      appearance: 'Тема, плотность и визуальный стиль интерфейса.',
      privacy: 'Персональные ограничения: mute, block, hide profile, deny DM.',
      security: '2FA, резервные коды и защита входа в аккаунт.',
      password: 'Смена пароля с ревокацией остальных сессий.',
      sessions: 'Список устройств и завершение любых входов.',
      storage: 'Локальные данные и черновики в браузере.',
      stickers: 'Наборы стикеров и GIF для чатов.',
      language: 'Текущий язык интерфейса приложения.',
      support: 'Справка, FAQ и полезные ссылки.'
    }
    return hints[settingsSection] || 'Управление настройками аккаунта.'
  }, [settingsSection])
  const settingsSecurityBadge = twoFactorStatus.enabled ? '2FA ON' : '2FA OFF'

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
              <button
                type="button"
                className="command-toggle"
                onClick={openGlobalPalette}
                title="Командная палитра (Ctrl+K)"
              >
                <span>⌘</span>
                Команды
              </button>
            ) : null}
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
                onClick={() => setView('settings')}
                title="Открыть настройки"
              >
                <div
                  className="avatar with-mini-profile"
                  onMouseEnter={(event) => queueMiniProfileCard(event, user)}
                  onMouseMove={moveMiniProfileCard}
                  onMouseLeave={() => hideMiniProfileCard()}
                >
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

        {globalPaletteOpen && (
          <div className="modal-overlay" onClick={closeGlobalPalette}>
            <div className="modal-card global-palette-card" onClick={(event) => event.stopPropagation()}>
              <div className="global-palette-head">
                <div>
                  <strong>Глобальная палитра</strong>
                  <span>Команды, быстрые переходы, поиск пользователей</span>
                </div>
                <button type="button" className="ghost" onClick={closeGlobalPalette}>Esc</button>
              </div>
              <div className="global-palette-input-row">
                <input
                  ref={globalPaletteInputRef}
                  type="text"
                  value={globalPaletteQuery}
                  onChange={(event) => setGlobalPaletteQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      runGlobalPaletteSubmit()
                    }
                  }}
                  placeholder="Введи команду, #тег, @пользователь или имя"
                />
                <button type="button" className="primary" onClick={runGlobalPaletteSubmit}>
                  Выполнить
                </button>
              </div>
              <div className="global-palette-sections">
                <section className="global-palette-section">
                  <div className="global-palette-section-head">
                    <strong>Быстрые действия</strong>
                    <span>Ctrl+Shift+K: быстрый поиск чатов</span>
                  </div>
                  {globalPaletteVisibleActions.length === 0 ? (
                    <div className="global-palette-empty">Ничего не найдено по запросу.</div>
                  ) : (
                    <div className="global-palette-action-list">
                      {globalPaletteVisibleActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className="global-palette-action"
                          onClick={() => runGlobalPaletteAction(action)}
                        >
                          <strong>{action.title}</strong>
                          <span>{action.hint}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                <section className="global-palette-section">
                  <div className="global-palette-section-head">
                    <strong>Пользователи</strong>
                    <span>{globalPaletteLoading ? 'Поиск...' : `${globalPaletteUsers.length} найдено`}</span>
                  </div>
                  {globalPaletteUsers.length === 0 ? (
                    <div className="global-palette-empty">Начни вводить имя или @username (минимум 3 символа).</div>
                  ) : (
                    <div className="global-palette-user-list">
                      {globalPaletteUsers.map((item) => {
                        const roleLabel = item && item.role ? (roleLabelByValue.get(String(item.role)) || item.role) : 'Студент'
                        return (
                          <button
                            key={`global-palette-user-${item.id || item.username}`}
                            type="button"
                            className="global-palette-user"
                            onClick={() => {
                              closeGlobalPalette()
                              openProfile(item.username)
                            }}
                          >
                            <div className="avatar tiny">
                              {item.avatarUrl ? (
                                <img src={resolveMediaUrl(item.avatarUrl)} alt="avatar" />
                              ) : (
                                (item.username || 'U')[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong>{item.displayName || item.username}</strong>
                              <span>@{item.username} • {roleLabel}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div className="icon-rail">
            <button
              type="button"
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => setView('dashboard')}
              title="Панель"
            >
              {icons.dashboard}
            </button>
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
                onClick={() => setView('admin')}
                title="Админ"
              >
                {icons.admin}
              </button>
            )}
            <button
              type="button"
              className={view === 'settings' ? 'active' : ''}
              onClick={() => setView('settings')}
              title="Настройки"
            >
              {icons.settings}
            </button>
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

        {view === 'login' && !user && !twoFactorLogin.pending && (
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

        {view === 'login' && !user && twoFactorLogin.pending && (
          <form className="panel" onSubmit={handleVerifyTwoFactorLogin}>
            <h2>2FA confirmation</h2>
            <p className="subtitle">Enter authenticator code or backup code.</p>
            <label>
              TOTP code
              <input
                type="text"
                inputMode="numeric"
                value={twoFactorLogin.code}
                onChange={(event) => setTwoFactorLogin((prev) => ({ ...prev, code: event.target.value.replace(/\D+/g, '').slice(0, 6) }))}
                placeholder="123456"
                maxLength={6}
              />
            </label>
            <label>
              Backup code
              <input
                type="text"
                value={twoFactorLogin.backupCode}
                onChange={(event) => setTwoFactorLogin((prev) => ({ ...prev, backupCode: event.target.value.trim().toUpperCase().slice(0, 20) }))}
                placeholder="AB12CD34EF"
                maxLength={20}
              />
            </label>
            <div className="profile-verification-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => setTwoFactorLogin({ ...INITIAL_TWO_FACTOR_LOGIN_STATE })}
                disabled={loading}
              >
                Back
              </button>
              <button className="primary" type="submit" disabled={loading}>
                Verify
              </button>
            </div>
          </form>
        )}

        {view === 'register' && !user && (
          <form className="panel" onSubmit={handleRegister}>
            <h2>Создать аккаунт</h2>
            <p className="subtitle">Новый аккаунт создается со стартовой ролью Студент.</p>
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
              Стартовая роль
              <select value="student" disabled>
                <option value="student">Студент</option>
              </select>
            </label>
            <button className="primary" type="submit" disabled={loading}>Зарегистрироваться</button>
          </form>
        )}

        {view === 'dashboard' && user && (
          <div className="dashboard-functional-layout">
            <section className="dashboard-functional-head">
              <div>
                <div className="dashboard-kicker">Центр управления</div>
                <h2>Рабочая панель</h2>
                <p>{dashboardNow.date} • {dashboardNow.time} • обновлено: {dashboardLastRefreshLabel}</p>
              </div>
              <div className="dashboard-functional-head-actions">
                <div className="dashboard-functional-toggle-row">
                  <button
                    type="button"
                    className={`dashboard-mode-toggle ${dashboardFocusMode ? 'active' : ''}`.trim()}
                    onClick={toggleDashboardFocusMode}
                  >
                    {dashboardFocusMode ? 'Фокус: ON' : 'Фокус: OFF'}
                  </button>
                  <button
                    type="button"
                    className={`dashboard-mode-toggle ${dashboardAutoRefresh ? 'active' : ''}`.trim()}
                    onClick={toggleDashboardAutoRefresh}
                  >
                    {dashboardAutoRefresh ? 'Автообновление: ON' : 'Автообновление: OFF'}
                  </button>
                </div>
                <div className="dashboard-functional-status">
                  <span className={`dashboard-functional-chip ${socketConnection === 'connected' ? 'state-ok' : socketConnection === 'connecting' ? 'state-warn' : 'state-danger'}`.trim()}>
                    Realtime: {socketConnection === 'connected' ? 'ON' : socketConnection === 'connecting' ? '...' : 'OFF'}
                  </span>
                  <span className={`dashboard-functional-chip ${pushState.enabled ? 'state-ok' : 'state-warn'}`.trim()}>
                    Push: {pushState.enabled ? 'ON' : pushState.supported ? 'OFF' : 'N/A'}
                  </span>
                  <span className={`dashboard-functional-chip ${health && health.ok ? 'state-ok' : 'state-warn'}`.trim()}>
                    Сервер: {health && health.ok ? 'OK' : 'проверка'}
                  </span>
                </div>
                <button type="button" className="primary" onClick={refreshWorkspaceSnapshot} disabled={dashboardRefreshLoading}>
                  {dashboardRefreshLoading ? 'Обновление...' : 'Обновить данные'}
                </button>
              </div>
            </section>

            <section className="dashboard-command-deck">
              <div className="dashboard-card-head">
                <div>
                  <strong>Командная строка</strong>
                  <span>команды: unread, drafts, hot, mine, bookmarks, profile, chats, feed, refresh, push, #тег, @автор</span>
                </div>
              </div>
              <div className="dashboard-command-row">
                <input
                  type="text"
                  value={dashboardCommandInput}
                  onChange={(event) => setDashboardCommandInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      runDashboardCommand(dashboardCommandInput)
                    }
                  }}
                  placeholder="Введите команду или поисковый запрос..."
                />
                <button type="button" className="primary" onClick={() => runDashboardCommand(dashboardCommandInput)}>
                  Выполнить
                </button>
              </div>
              {dashboardCommandHistory.length > 0 && (
                <div className="dashboard-command-history">
                  {dashboardCommandHistory.map((item) => (
                    <button
                      key={`dashboard-command-${item}`}
                      type="button"
                      className="ghost"
                      onClick={() => runDashboardCommand(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className={`dashboard-functional-grid ${dashboardFocusMode ? 'focus-mode' : ''}`.trim()}>
              <article className="dashboard-functional-card">
                <div className="dashboard-card-head">
                  <div>
                    <strong>Быстрые действия</strong>
                    <span>только полезные переходы</span>
                  </div>
                </div>
                <div className="dashboard-functional-actions">
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => runDashboardFocusAction('unread')}>
                    <strong>Непрочитанные</strong>
                    <span>{unreadConversationCount} чатов</span>
                  </button>
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => runDashboardFocusAction('drafts')}>
                    <strong>Черновики</strong>
                    <span>{dashboardDraftQueue.length} чатов</span>
                  </button>
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => runDashboardFocusAction('feed-hot')}>
                    <strong>Горячая лента</strong>
                    <span>{hotFeedPosts.length} постов</span>
                  </button>
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => openFeedFocus({ filter: FEED_FILTERS.bookmarks })}>
                    <strong>Закладки</strong>
                    <span>{bookmarkedPostIds.size} сохранено</span>
                  </button>
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => setView('profile')}>
                    <strong>Профиль</strong>
                    <span>настройки аккаунта</span>
                  </button>
                  <button type="button" className="dashboard-functional-action-tile" onClick={() => setView('chats')}>
                    <strong>Чаты</strong>
                    <span>{conversations.length} диалогов</span>
                  </button>
                </div>
              </article>

              {!dashboardFocusMode && (
                <article className="dashboard-functional-card">
                  <div className="dashboard-card-head">
                    <div>
                      <strong>Лента</strong>
                      <span>поиск, фильтры и тренды</span>
                    </div>
                  </div>
                  <div className="dashboard-functional-search">
                    <input
                      type="text"
                      value={dashboardFeedQuery}
                      onChange={(event) => setDashboardFeedQuery(normalizeFeedQueryValue(event.target.value))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          openDashboardFeedSearch()
                        }
                      }}
                      placeholder="Поиск по постам, авторам и тегам"
                    />
                    <button type="button" className="primary" onClick={openDashboardFeedSearch}>Искать</button>
                  </div>
                  <div className="dashboard-functional-preset-row">
                    <button type="button" className="ghost" onClick={() => openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.smart })}>
                      Smart
                    </button>
                    <button type="button" className="ghost" onClick={() => openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.latest })}>
                      Новые
                    </button>
                    <button type="button" className="ghost" onClick={() => openFeedFocus({ filter: FEED_FILTERS.popular, sortMode: FEED_SORT_MODES.engagement, timeWindow: FEED_TIME_WINDOWS.week })}>
                      Хайп
                    </button>
                    <button type="button" className="ghost" onClick={() => openFeedFocus({ filter: FEED_FILTERS.mine, sortMode: FEED_SORT_MODES.latest })}>
                      Мои
                    </button>
                    <button type="button" className="ghost" onClick={() => setDashboardFeedQuery('')}>
                      Очистить
                    </button>
                  </div>
                  {trendingTags.length > 0 && (
                    <div className="dashboard-functional-tags">
                      {trendingTags.slice(0, 6).map((tag) => (
                        <button
                          key={`dashboard-tag-${tag.tag}`}
                          type="button"
                          className="dashboard-tag-pill"
                          onClick={() => openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.smart, tag: tag.tag })}
                        >
                          {tag.tag} <span>{tag.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="dashboard-functional-list">
                    {hotFeedPosts.length === 0 ? (
                      <div className="empty small">Горячих постов пока нет.</div>
                    ) : (
                      hotFeedPosts.slice(0, 5).map((item) => (
                        <button
                          key={`dashboard-hot-${item.post.id}`}
                          type="button"
                          className="dashboard-functional-row-main"
                          onClick={() => openFeedFocus({
                            filter: FEED_FILTERS.all,
                            sortMode: FEED_SORT_MODES.engagement,
                            timeWindow: FEED_TIME_WINDOWS.week,
                            query: item.post.author && item.post.author.username ? item.post.author.username : ''
                          })}
                        >
                          <strong>{item.post.author.displayName || item.post.author.username}</strong>
                          <span>{item.score} очк.</span>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              )}

              <article className="dashboard-functional-card">
                <div className="dashboard-card-head">
                  <div>
                    <strong>Чаты</strong>
                    <span>приоритетные диалоги</span>
                  </div>
                </div>
                <div className="dashboard-functional-list">
                  {dashboardTopConversations.length === 0 ? (
                    <div className="empty small">Диалогов пока нет.</div>
                  ) : (
                    dashboardTopConversations.map((conv) => (
                      <div key={`dashboard-conv-${conv.id}`} className="dashboard-functional-row">
                        <button
                          type="button"
                          className="dashboard-functional-row-main"
                          onClick={() => openConversationFromDashboard(conv)}
                        >
                          <strong>{conv.title}</strong>
                          <span>{conv.lastMessage || 'Открыть чат'}</span>
                        </button>
                        <div className="dashboard-functional-row-side">
                          {conv.unreadCount > 0 && <span className="dashboard-functional-badge">{conv.unreadCount}</span>}
                          <button
                            type="button"
                            className={`dashboard-functional-mini ${conv.isFavorite ? 'active' : ''}`.trim()}
                            onClick={() => toggleConversationFavorite(conv.id)}
                            title={conv.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                          >
                            {conv.isFavorite ? '★' : '☆'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {activeConversation && (
                  <div className="dashboard-shortcut-row">
                    <button type="button" className="ghost" onClick={() => {
                      openConversationFromDashboard(activeConversation)
                      setChatSearchOpen(true)
                    }}>
                      Поиск в чате
                    </button>
                    <button type="button" className="ghost" onClick={() => {
                      openConversationFromDashboard(activeConversation)
                      setChatExplorerOpen(true)
                      setChatExplorerTab(CHAT_EXPLORER_TABS.overview)
                    }}>
                      Обзор чата
                    </button>
                  </div>
                )}
              </article>

              {!dashboardFocusMode && (
                <article className="dashboard-functional-card">
                  <div className="dashboard-card-head">
                    <div>
                      <strong>Система</strong>
                      <span>сигналы и сервис</span>
                    </div>
                  </div>
                  <div className="dashboard-system-grid">
                    <article className="dashboard-system-item">
                      <span>Онлайн</span>
                      <strong>{onlineUsers.length}</strong>
                    </article>
                    <article className="dashboard-system-item">
                      <span>Непрочитанные</span>
                      <strong>{unreadMessagesCount}</strong>
                    </article>
                    <article className="dashboard-system-item">
                      <span>Блокировки</span>
                      <strong>{blockedUsers.length}</strong>
                    </article>
                    <article className="dashboard-system-item">
                      <span>Push ошибка</span>
                      <strong>{pushState.error ? 'Есть' : 'Нет'}</strong>
                    </article>
                  </div>
                  <div className="dashboard-shortcut-row">
                    <button type="button" className="ghost" onClick={() => syncPushState({ keepError: true }).catch(() => {})}>
                      Синхронизировать push
                    </button>
                    <button type="button" className="ghost" onClick={() => setView('feed')}>
                      Открыть ленту
                    </button>
                    {activeConversation && (
                      <button type="button" className="ghost" onClick={() => openConversationFromDashboard(activeConversation)}>
                        В текущий чат
                      </button>
                    )}
                  </div>
                  {dashboardSystemAlerts.length > 0 ? (
                    <div className="dashboard-alerts-stack">
                      {dashboardSystemAlerts.slice(0, 3).map((alert) => (
                        <div key={`dashboard-alert-${alert.id}`} className={`dashboard-alert-card level-${alert.level}`.trim()}>
                          <strong>{alert.title}</strong>
                          <span>{alert.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dashboard-functional-note">Система стабильна. Критичных сигналов нет.</div>
                  )}
                </article>
              )}
            </div>
          </div>
        )}

        {view === 'chats' && user && (
          <div className={`chat-layout ${activeConversation && chatMobilePane === 'chat' ? 'chat-layout-mobile-active' : ''}`.trim()}>
            <section className="chat-list">
              <div className="chat-search">
                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Найти по username... (Ctrl+Shift+K)"
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleStartConversation(item.username)}
                      >
                        <span
                          className="avatar with-mini-profile"
                          onMouseEnter={(event) => queueMiniProfileCard(event, item)}
                          onMouseMove={moveMiniProfileCard}
                          onMouseLeave={() => hideMiniProfileCard()}
                        >
                          {item.username[0].toUpperCase()}
                        </span>
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
                      onClick={() => {
                        setActiveConversation(conv)
                        setChatMobilePane('chat')
                      }}
                    >
                      <span
                        className="avatar with-mini-profile"
                        onMouseEnter={(event) => {
                          if (conv.isGroup || !conv.other) return
                          queueMiniProfileCard(event, {
                            ...conv.other,
                            online: isOnline(conv.other.id)
                          })
                        }}
                        onMouseMove={moveMiniProfileCard}
                        onMouseLeave={() => hideMiniProfileCard()}
                      >
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
                      <button
                        type="button"
                        className="chat-mobile-back"
                        onClick={() => setChatMobilePane('list')}
                        title="Назад к списку чатов"
                      >
                        ← Чаты
                      </button>
                      {activeConversation.isGroup ? (
                        <div className="chat-user">
                          <div
                            className="avatar small with-mini-profile"
                            onMouseEnter={(event) => queueMiniProfileCard(event, {
                              ...activeConversation.other,
                              online: isOnline(activeConversation.other.id)
                            })}
                            onMouseMove={moveMiniProfileCard}
                            onMouseLeave={() => hideMiniProfileCard()}
                          >
                            {(activeConversation.title || 'G')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3>{activeConversation.title}</h3>
                            <span>{activeConversation.isPersonalFavorites ? 'Личный чат для заметок и пересылок' : 'Групповой чат'}</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="chat-user chat-header-link"
                          onClick={() => openProfile(activeConversation.other.username)}
                        >
                          <div
                            className="avatar small with-mini-profile"
                            onMouseEnter={(event) => queueMiniProfileCard(event, {
                              ...activeConversation.other,
                              online: isOnline(activeConversation.other.id)
                            })}
                            onMouseMove={moveMiniProfileCard}
                            onMouseLeave={() => hideMiniProfileCard()}
                          >
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
                          className={`chat-action ${bookmarkPanelOpen ? 'favorite' : ''}`.trim()}
                          onClick={() => {
                            const nextOpen = !bookmarkPanelOpen
                            setBookmarkPanelOpen(nextOpen)
                            if (nextOpen && activeConversation) {
                              loadConversationBookmarks(activeConversation.id)
                            }
                          }}
                          title={bookmarkPanelOpen ? 'Скрыть сохраненные' : 'Показать сохраненные'}
                        >
                          🔖
                        </button>
                        <button
                          type="button"
                          className={`chat-action ${chatExplorerOpen ? 'favorite' : ''}`.trim()}
                          onClick={() => {
                            setChatExplorerOpen((prev) => !prev)
                            setChatExplorerTab(CHAT_EXPLORER_TABS.overview)
                            setChatExplorerQuery('')
                          }}
                          title={chatExplorerOpen ? 'Скрыть Chat Explorer' : 'Открыть Chat Explorer'}
                        >
                          🧭
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
                        <button
                          type="button"
                          className="pinned-banner-main"
                          onClick={() => jumpToMessage(pinnedMessage.id)}
                          title="Перейти к сообщению"
                        >
                          <span className="pinned-label">Закрепленное сообщение</span>
                          {pinnedMessage.senderUsername && (
                            <span className="pinned-author">@{pinnedMessage.senderUsername}</span>
                          )}
                          <p>{getMessagePreview(pinnedMessage)}</p>
                        </button>
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
                        <span>
                          {activeConversationPrivacy.isBlocked
                            ? 'You blocked this user.'
                            : (activeConversationPrivacy.blockedByTarget
                              ? 'This user blocked you.'
                              : 'Direct messages are blocked by privacy settings.')}
                        </span>
                        {activeConversationPrivacy.isBlocked && (
                          <button type="button" onClick={toggleChatBlock}>Unblock</button>
                        )}
                      </div>
                    )}
                    {typingLabel && (
                      <div className="chat-typing">{typingLabel}</div>
                    )}
                    {bookmarkPanelOpen && (
                      <div className="chat-bookmarks-panel">
                        <div className="chat-bookmarks-head">
                          <strong>Сохраненные сообщения</strong>
                          <span>{conversationBookmarks.length}</span>
                        </div>
                        {bookmarkPanelLoading ? (
                          <div className="empty small">Загрузка...</div>
                        ) : conversationBookmarks.length === 0 ? (
                          <div className="empty small">Пока ничего не сохранено</div>
                        ) : (
                          <div className="chat-bookmarks-list">
                            {conversationBookmarks.map((bookmark) => (
                              <button
                                key={`bookmark-${bookmark.messageId}`}
                                type="button"
                                className="chat-bookmark-item"
                                onClick={() => jumpToMessage(bookmark.messageId)}
                              >
                                <div>
                                  <strong>{bookmark.senderDisplayName || bookmark.senderUsername || 'Пользователь'}</strong>
                                  <p>{bookmark.preview || 'Сообщение'}</p>
                                </div>
                                <time>{formatTime(bookmark.messageCreatedAt || bookmark.savedAt)}</time>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {chatExplorerOpen && (
                      <div className="chat-explorer-panel">
                        <div className="chat-explorer-head">
                          <div className="chat-explorer-headline">
                            <strong>Chat Explorer</strong>
                            <span>
                              {chatExplorerStats.messages} сообщений • {chatExplorerStats.media} медиа • {chatExplorerStats.links} ссылок
                            </span>
                          </div>
                          <div className="chat-explorer-search">
                            <span>⌕</span>
                            <input
                              type="text"
                              value={chatExplorerQuery}
                              onChange={(event) => setChatExplorerQuery(event.target.value)}
                              placeholder={
                                chatExplorerTab === CHAT_EXPLORER_TABS.media
                                  ? 'Фильтр по медиа и автору'
                                  : chatExplorerTab === CHAT_EXPLORER_TABS.links
                                    ? 'Фильтр по ссылке, домену или тексту'
                                    : chatExplorerTab === CHAT_EXPLORER_TABS.highlights
                                      ? 'Фильтр по хайлайтам'
                                      : 'Быстрый фильтр'
                              }
                            />
                            {chatExplorerQuery && (
                              <button type="button" onClick={() => setChatExplorerQuery('')} title="Очистить">
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="chat-explorer-tabs" role="tablist" aria-label="Chat Explorer">
                          {CHAT_EXPLORER_TAB_OPTIONS.map((tab) => (
                            <button
                              key={tab.value}
                              type="button"
                              role="tab"
                              aria-selected={chatExplorerTab === tab.value}
                              className={chatExplorerTab === tab.value ? 'active' : ''}
                              onClick={() => setChatExplorerTab(tab.value)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {messages.length === 0 ? (
                          <div className="empty small">Здесь появятся медиа, ссылки и хайлайты после сообщений.</div>
                        ) : (
                          <>
                            {chatExplorerTab === CHAT_EXPLORER_TABS.overview && (
                              <div className="chat-explorer-overview">
                                <div className="chat-explorer-stats-grid">
                                  <article>
                                    <span>Сообщения</span>
                                    <strong>{chatExplorerStats.messages}</strong>
                                  </article>
                                  <article>
                                    <span>Участники</span>
                                    <strong>{chatExplorerStats.uniqueSenders}</strong>
                                  </article>
                                  <article>
                                    <span>Медиа</span>
                                    <strong>{chatExplorerStats.media}</strong>
                                  </article>
                                  <article>
                                    <span>Ссылки</span>
                                    <strong>{chatExplorerStats.links}</strong>
                                  </article>
                                  <article>
                                    <span>Опросы</span>
                                    <strong>{chatExplorerStats.polls}</strong>
                                  </article>
                                  <article>
                                    <span>Ответы</span>
                                    <strong>{chatExplorerStats.replies}</strong>
                                  </article>
                                </div>

                                <div className="chat-explorer-overview-grid">
                                  <article className="chat-explorer-card">
                                    <div className="chat-explorer-card-head">
                                      <strong>Топ участники</strong>
                                      <span>{chatExplorerTopSenders.length}</span>
                                    </div>
                                    {chatExplorerTopSenders.length === 0 ? (
                                      <div className="empty small">Пока пусто</div>
                                    ) : (
                                      <div className="chat-explorer-person-list">
                                        {chatExplorerTopSenders.map((item) => (
                                          <button
                                            key={`explorer-sender-${item.senderId}`}
                                            type="button"
                                            className="chat-explorer-person-item"
                                            onClick={() => {
                                              const target = [...messages].reverse().find((msg) => msg.senderId === item.senderId)
                                              if (target) jumpToMessage(target.id)
                                            }}
                                            title="Перейти к последнему сообщению автора"
                                          >
                                            <div>
                                              <strong>{item.label}</strong>
                                              {item.username && <span>@{item.username}</span>}
                                            </div>
                                            <small>{item.count} • media {item.mediaCount}</small>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </article>

                                  <article className="chat-explorer-card">
                                    <div className="chat-explorer-card-head">
                                      <strong>Реакции</strong>
                                      <span>{chatExplorerReactionSummary.reduce((acc, item) => acc + item.count, 0)}</span>
                                    </div>
                                    {chatExplorerReactionSummary.length === 0 ? (
                                      <div className="empty small">Без реакций</div>
                                    ) : (
                                      <div className="chat-explorer-reaction-cloud">
                                        {chatExplorerReactionSummary.map((item) => (
                                          <div key={`explorer-emoji-${item.emoji}`} className="chat-explorer-reaction-chip">
                                            <span>{item.emoji}</span>
                                            <strong>{item.count}</strong>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </article>

                                  <article className="chat-explorer-card">
                                    <div className="chat-explorer-card-head">
                                      <strong>Быстрые переходы</strong>
                                      <span>jump</span>
                                    </div>
                                    <div className="chat-explorer-jump-list">
                                      {chatExplorerFirstMessage && (
                                        <button type="button" onClick={() => jumpToMessage(chatExplorerFirstMessage.id)}>
                                          <span>Начало диалога</span>
                                          <small>{formatDate(chatExplorerFirstMessage.createdAt)} • {getMessagePreview(chatExplorerFirstMessage)}</small>
                                        </button>
                                      )}
                                      {chatExplorerMediaItems[0] && (
                                        <button type="button" onClick={() => jumpToMessage(chatExplorerMediaItems[0].messageId)}>
                                          <span>Последнее медиа</span>
                                          <small>{formatTime(chatExplorerMediaItems[0].createdAt)} • {chatExplorerMediaItems[0].preview}</small>
                                        </button>
                                      )}
                                      {chatExplorerLatestPollMessage && (
                                        <button type="button" onClick={() => jumpToMessage(chatExplorerLatestPollMessage.id)}>
                                          <span>Последний опрос</span>
                                          <small>{formatTime(chatExplorerLatestPollMessage.createdAt)} • {getMessagePreview(chatExplorerLatestPollMessage)}</small>
                                        </button>
                                      )}
                                      {chatExplorerTopReactedMessage && (
                                        <button type="button" onClick={() => jumpToMessage(chatExplorerTopReactedMessage.id)}>
                                          <span>Самое реактивное</span>
                                          <small>✨ {getMessageReactionScore(chatExplorerTopReactedMessage)} • {getMessagePreview(chatExplorerTopReactedMessage)}</small>
                                        </button>
                                      )}
                                      {chatExplorerLinkItems[0] && (
                                        <button type="button" onClick={() => jumpToMessage(chatExplorerLinkItems[0].messageId)}>
                                          <span>Последняя ссылка</span>
                                          <small>{chatExplorerLinkItems[0].hostname || 'ссылка'} • {formatTime(chatExplorerLinkItems[0].createdAt)}</small>
                                        </button>
                                      )}
                                    </div>
                                  </article>

                                  <article className="chat-explorer-card">
                                    <div className="chat-explorer-card-head">
                                      <strong>Таймлайн</strong>
                                      <span>{chatExplorerTimelineDays.length} дней</span>
                                    </div>
                                    {chatExplorerTimelineDays.length === 0 ? (
                                      <div className="empty small">Недостаточно данных</div>
                                    ) : (
                                      <div className="chat-explorer-timeline-list">
                                        {chatExplorerTimelineDays.map((day) => (
                                          <button
                                            key={`explorer-day-${day.key}`}
                                            type="button"
                                            className="chat-explorer-timeline-item"
                                            onClick={() => jumpToMessage(day.lastMessageId)}
                                            title="Перейти к последнему сообщению этого дня"
                                          >
                                            <div>
                                              <strong>{day.dateLabel || day.key}</strong>
                                              <span>{day.count} сообщений</span>
                                            </div>
                                            <small>{formatTime(day.lastMs)}</small>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                </div>
                              </div>
                            )}

                            {chatExplorerTab === CHAT_EXPLORER_TABS.media && (
                              <div className="chat-explorer-media">
                                {filteredChatExplorerMediaItems.length === 0 ? (
                                  <div className="empty small">
                                    {chatExplorerMediaItems.length === 0 ? 'В этом чате пока нет медиа.' : 'По фильтру медиа не найдено.'}
                                  </div>
                                ) : (
                                  <div className="chat-explorer-media-grid">
                                    {filteredChatExplorerMediaItems.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className={`chat-explorer-media-item family-${item.family}`.trim()}
                                        onClick={() => jumpToMessage(item.messageId)}
                                        title="Перейти к сообщению"
                                      >
                                        <div className="chat-explorer-media-preview">
                                          {item.family === 'image' || item.family === 'gif' || item.family === 'sticker' ? (
                                            <img src={item.url} alt={item.preview || 'media'} loading="lazy" />
                                          ) : (
                                            <div className="chat-explorer-media-placeholder">
                                              <span>{item.family === 'video-note' ? '🎥' : '🎬'}</span>
                                              <small>{item.family === 'video-note' ? 'видеосообщение' : 'видео'}</small>
                                            </div>
                                          )}
                                          <span className="chat-explorer-media-badge">{item.family}</span>
                                        </div>
                                        <div className="chat-explorer-media-meta">
                                          <strong>{item.senderDisplayName || item.senderUsername || 'Пользователь'}</strong>
                                          <span>{formatTime(item.createdAt)}</span>
                                          {item.body && <p>{item.body.length > 60 ? `${item.body.slice(0, 57)}...` : item.body}</p>}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {chatExplorerTab === CHAT_EXPLORER_TABS.links && (
                              <div className="chat-explorer-links">
                                {filteredChatExplorerLinkItems.length === 0 ? (
                                  <div className="empty small">
                                    {chatExplorerLinkItems.length === 0 ? 'Ссылок в текущих сообщениях нет.' : 'По фильтру ссылки не найдены.'}
                                  </div>
                                ) : (
                                  <div className="chat-explorer-link-list">
                                    {filteredChatExplorerLinkItems.map((item) => (
                                      <article key={item.id} className="chat-explorer-link-item">
                                        <div className="chat-explorer-link-main">
                                          <div className="chat-explorer-link-host">
                                            <strong>{item.hostname || 'link'}</strong>
                                            <span>{formatDate(item.createdAt)} • {formatTime(item.createdAt)}</span>
                                          </div>
                                          <a href={item.url} target="_blank" rel="noreferrer" title={item.url}>
                                            {item.url}
                                          </a>
                                          <p>{item.preview || 'Сообщение со ссылкой'}</p>
                                          <small>{item.senderDisplayName || item.senderUsername || 'Пользователь'}</small>
                                        </div>
                                        <div className="chat-explorer-link-actions">
                                          <button type="button" className="ghost" onClick={() => jumpToMessage(item.messageId)}>
                                            К сообщению
                                          </button>
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {chatExplorerTab === CHAT_EXPLORER_TABS.highlights && (
                              <div className="chat-explorer-highlights">
                                {filteredChatExplorerHighlights.length === 0 ? (
                                  <div className="empty small">
                                    {chatExplorerHighlights.length === 0 ? 'Хайлайты появятся после реакций, закрепа, опросов и ответов.' : 'По фильтру хайлайты не найдены.'}
                                  </div>
                                ) : (
                                  <div className="chat-explorer-highlight-list">
                                    {filteredChatExplorerHighlights.map((item) => {
                                      const meta = CHAT_HIGHLIGHT_KIND_META[item.kind] || { icon: '•', label: item.kind || 'item' }
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`chat-explorer-highlight-item kind-${item.kind}`.trim()}
                                          onClick={() => jumpToMessage(item.messageId)}
                                        >
                                          <div className="chat-explorer-highlight-badge">
                                            <span>{meta.icon}</span>
                                            <small>{meta.label}</small>
                                          </div>
                                          <div className="chat-explorer-highlight-main">
                                            <div className="chat-explorer-highlight-head">
                                              <strong>{item.title}</strong>
                                              <time>{formatTime(item.createdAt)}</time>
                                            </div>
                                            {item.subtitle && <span className="chat-explorer-highlight-sub">{item.subtitle}</span>}
                                            <p>{item.preview || 'Сообщение'}</p>
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
                        id={`message-${msg.id}`}
                        className={`message-row ${msg.senderId === user.id ? 'mine' : ''}`}
                        onContextMenu={(event) => openMessageMenu(event, msg)}
                        onTouchStart={(event) => handleTouchContextMenuStart(event, (menuEvent) => openMessageMenu(menuEvent, msg))}
                        onTouchMove={handleTouchContextMenuMove}
                        onTouchEnd={handleTouchContextMenuEnd}
                        onTouchCancel={handleTouchContextMenuCancel}
                      >
                        {msg.senderId !== user.id && (
                          <button
                            type="button"
                            className="avatar tiny clickable with-mini-profile"
                            onClick={() => openProfile(msg.senderUsername)}
                            onMouseEnter={(event) => queueMiniProfileCard(event, {
                              id: msg.senderId,
                              username: msg.senderUsername,
                              displayName: msg.senderDisplayName || msg.senderUsername,
                              avatarUrl: msg.senderAvatarUrl || '',
                              role: msg.senderRole || '',
                              statusEmoji: msg.senderStatusEmoji || '',
                              statusText: msg.senderStatusText || ''
                            })}
                            onMouseMove={moveMiniProfileCard}
                            onMouseLeave={() => hideMiniProfileCard()}
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
                            <button
                              type="button"
                              className="message-reply message-reply-link"
                              onClick={() => jumpToMessage(msg.replyTo.id)}
                              title="Перейти к сообщению"
                            >
                              <span className="message-reply-author">
                                {getReplyAuthorLabel(msg.replyTo)}
                              </span>
                              <p className="message-reply-text">
                                {msg.replyTo.deletedAt ? 'Сообщение удалено' : getMessagePreview(msg.replyTo)}
                              </p>
                            </button>
                          )}
                          {msg.forwardedFrom && (
                            <div className="message-forwarded">
                              <span>Переслано</span>
                              <strong>{getForwardSourceLabel(msg)}</strong>
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
                            {isMessageBookmarked(msg.id) && <span className="message-bookmarked">🔖</span>}
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
                            className="avatar tiny clickable with-mini-profile"
                            onClick={() => setView('profile')}
                            onMouseEnter={(event) => queueMiniProfileCard(event, user)}
                            onMouseMove={moveMiniProfileCard}
                            onMouseLeave={() => hideMiniProfileCard()}
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
                      <button
                        type="button"
                        onClick={() => handleToggleMessageBookmark(contextMenu.message, { closeMenu: true })}
                      >
                        {isMessageBookmarked(contextMenu.message.id) ? 'Убрать из сохраненных' : 'Сохранить сообщение'}
                      </button>
                      <button type="button" onClick={() => openForwardDialog(contextMenu.message)}>
                        Переслать
                      </button>
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
                        <button
                          type="button"
                          className="composer-reply-jump"
                          onClick={() => jumpToMessage(replyMessage.id)}
                          title="Перейти к сообщению"
                        >
                          {getMessagePreview(replyMessage)}
                        </button>
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
              <div className="feed-composer-insights">
                <div className="feed-composer-metrics">
                  <span><strong>{feedComposerInsights.chars}</strong> символов</span>
                  <span><strong>{feedComposerInsights.words}</strong> слов</span>
                  <span><strong>{feedComposerInsights.hashtags}</strong> тегов</span>
                  <span><strong>{feedComposerInsights.mentions}</strong> упоминаний</span>
                </div>
                <div className="feed-composer-tone">
                  <span className={`feed-tone-pill ${feedComposerInsights.hasMedia ? 'with-media' : ''}`.trim()}>
                    {feedComposerInsights.hasMedia ? 'медиа' : 'текст'} • {feedComposerInsights.tone}
                  </span>
                </div>
              </div>
              {trendingTags.length > 0 && (
                <div className="feed-composer-tags">
                  <span>Быстро добавить:</span>
                  <div>
                    {trendingTags.slice(0, 5).map((item) => (
                      <button
                        key={`composer-tag-${item.tag}`}
                        type="button"
                        className={`feed-tag-mini ${composerHashtags.includes(item.tag) ? 'active' : ''}`.trim()}
                        onClick={() => insertComposerTag(item.tag)}
                        title={`Добавить ${item.tag}`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

            <section className={`feed-toolbox ${isFeedToolboxOpen ? 'expanded' : 'collapsed'}`.trim()}>
              <div className="feed-control-head">
                <div className="feed-control-main">
                  <span className="feed-control-kicker">control center</span>
                  <strong>Лента</strong>
                  <p>
                    {visibleFeedPosts.length} постов • сортировка {feedSortModeLabel} • окно {feedTimeWindowLabel}
                  </p>
                  <div className="feed-control-summary" role="status" aria-live="polite">
                    <span>{feedActiveFilterCount > 0 ? `${feedActiveFilterCount} фильтров` : 'без фильтров'}</span>
                    <span>{feedExplorer.mediaOnly ? 'медиа only' : 'все посты'}</span>
                    <span>layout: {feedExplorer.layout === FEED_LAYOUTS.compact ? 'compact' : 'cards'}</span>
                  </div>
                </div>
                <div className="feed-control-head-actions">
                  <button
                    type="button"
                    className={`feed-quick-action ${feedExplorer.mediaOnly ? 'active' : ''}`.trim()}
                    onClick={() => updateFeedExplorer({ mediaOnly: !feedExplorer.mediaOnly })}
                  >
                    Медиа
                  </button>
                  <button
                    type="button"
                    className="feed-quick-action"
                    onClick={cycleFeedSortMode}
                  >
                    Сорт: {feedSortModeLabel}
                  </button>
                  <button
                    type="button"
                    className="feed-quick-action"
                    onClick={focusFeedQueryInput}
                  >
                    Поиск /
                  </button>
                  {(feedActiveFilterCount > 0 || feedQuery || activeFeedTag || feedAuthorFilter || feedFilter !== FEED_FILTERS.all) && (
                    <button
                      type="button"
                      className="feed-quick-action subtle"
                      onClick={resetFeedFilters}
                    >
                      Сброс
                    </button>
                  )}
                  <button
                    type="button"
                    className={`feed-toolbox-toggle ${isFeedToolboxOpen ? 'active' : ''}`.trim()}
                    onClick={() => {
                      if (isFeedToolboxOpen) {
                        setIsFeedInsightsOpen(false)
                      }
                      setIsFeedToolboxOpen((prev) => !prev)
                    }}
                    aria-expanded={isFeedToolboxOpen}
                    aria-controls="feed-toolbox-panel"
                  >
                    {isFeedToolboxOpen ? 'Свернуть' : 'Фильтры'}
                  </button>
                </div>
              </div>

              {isFeedToolboxOpen && (
              <div
                id="feed-toolbox-panel"
                className="feed-toolbox-panel open"
              >
              <div className="feed-segment-group" role="toolbar" aria-label="Сортировка ленты">
                <span>Сортировка</span>
                <div className="feed-segmented">
                  {FEED_SORT_TABS.map((item) => (
                    <button
                      key={`feed-sort-${item.value}`}
                      type="button"
                      className={effectiveFeedSortMode === item.value ? 'active' : ''}
                      onClick={() => {
                        if (feedFilter === FEED_FILTERS.popular && item.value !== FEED_SORT_MODES.engagement) {
                          setFeedFilter(FEED_FILTERS.all)
                        }
                        updateFeedExplorer({ sortMode: item.value })
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="feed-control-grid">
                <div className="feed-segment-group" role="toolbar" aria-label="Период ленты">
                  <span>Период</span>
                  <div className="feed-segmented">
                    {FEED_TIME_TABS.map((item) => (
                      <button
                        key={`feed-time-${item.value}`}
                        type="button"
                        className={feedExplorer.timeWindow === item.value ? 'active' : ''}
                        onClick={() => updateFeedExplorer({ timeWindow: item.value })}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="feed-segment-group" role="toolbar" aria-label="Вид карточек">
                  <span>Вид</span>
                  <div className="feed-segmented">
                    {FEED_LAYOUT_TABS.map((item) => (
                      <button
                        key={`feed-layout-${item.value}`}
                        type="button"
                        className={feedExplorer.layout === item.value ? 'active' : ''}
                        onClick={() => updateFeedExplorer({ layout: item.value })}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="feed-toggle-row">
                <button
                  type="button"
                  className={`feed-toggle-pill ${feedExplorer.mediaOnly ? 'active' : ''}`.trim()}
                  onClick={() => updateFeedExplorer({ mediaOnly: !feedExplorer.mediaOnly })}
                >
                  🖼️ Только с медиа
                </button>
                <button
                  type="button"
                  className="feed-toggle-pill ghostish"
                  onClick={() => {
                    setFeedFilter(FEED_FILTERS.all)
                    setFeedQuery('')
                    setActiveFeedTag('')
                    setFeedAuthorFilter('')
                    updateFeedExplorer({ sortMode: FEED_SORT_MODES.smart })
                  }}
                >
                  ⚡ Smart reset scope
                </button>
              </div>

              <div className="feed-filters-row">
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.all ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.all)}
                >
                  Все
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.popular ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.popular)}
                >
                  Популярные
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.mine ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.mine)}
                >
                  Мои
                </button>
                <button
                  type="button"
                  className={`feed-filter-pill ${feedFilter === FEED_FILTERS.bookmarks ? 'active' : ''}`.trim()}
                  onClick={() => setFeedFilter(FEED_FILTERS.bookmarks)}
                >
                  Закладки
                </button>
              </div>

              <div className="feed-query-row">
                <input
                  ref={feedQueryInputRef}
                  type="text"
                  value={feedQuery}
                  onChange={(event) => setFeedQuery(normalizeFeedQueryValue(event.target.value))}
                  placeholder="Поиск по постам, авторам и #тегам..."
                />
                {(feedActiveFilterCount > 0 || feedQuery || activeFeedTag || feedAuthorFilter || feedFilter !== FEED_FILTERS.all) && (
                  <button type="button" className="ghost" onClick={resetFeedFilters}>
                    Сбросить
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

              <button
                type="button"
                className={`feed-insights-toggle ${isFeedInsightsOpen ? 'active' : ''}`.trim()}
                onClick={() => setIsFeedInsightsOpen((prev) => !prev)}
                aria-expanded={isFeedInsightsOpen}
                aria-controls="feed-insights-panel"
              >
                <span>Аналитика и радар</span>
                <small>{isFeedInsightsOpen ? 'Скрыть блок' : 'Показать блок'}</small>
              </button>

              {isFeedInsightsOpen && (
              <div
                id="feed-insights-panel"
                className="feed-insights-panel open"
              >
                <div className="feed-digest-grid">
                  <article className="feed-digest-card">
                    <span>В выборке</span>
                    <strong>{feedDigest.visible}</strong>
                    <small>{feedDigest.activeAuthors} активных авторов</small>
                  </article>
                  <article className="feed-digest-card">
                    <span>Импульс</span>
                    <strong>{feedDigest.momentum}</strong>
                    <small>{feedDigest.freshCount} свежих за ~6ч</small>
                  </article>
                  <article className="feed-digest-card">
                    <span>Средний отклик</span>
                    <strong>{feedDigest.avgEngagement}</strong>
                    <small>{feedDigest.mediaShare}% постов с медиа</small>
                  </article>
                  <article className="feed-digest-card">
                    <span>Лидер темы</span>
                    <strong>{feedDigest.hottestTag || '—'}</strong>
                    <small>{feedDigest.hottestTag ? 'самый частый тег' : 'без доминирующего тега'}</small>
                  </article>
                </div>

                {feedQuickPresets.length > 0 && (
                  <div className="feed-presets-panel">
                    <div className="feed-presets-head">
                      <strong>Быстрые пресеты</strong>
                      <span>один клик для фокуса</span>
                    </div>
                    <div className="feed-presets-list">
                      {feedQuickPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className="feed-preset-item"
                          onClick={() => applyFeedQuickPreset(preset)}
                        >
                          <span>{preset.label}</span>
                          <small>{preset.hint}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="feed-metrics">
                  <article>
                    <span>Всего постов</span>
                    <strong>{feedMetrics.total}</strong>
                  </article>
                  <article>
                    <span>Мои посты</span>
                    <strong>{feedMetrics.mine}</strong>
                  </article>
                  <article>
                    <span>Закладки</span>
                    <strong>{feedMetrics.bookmarked}</strong>
                  </article>
                  <article>
                    <span>Вовлеченность</span>
                    <strong>{feedMetrics.engagement}</strong>
                  </article>
                </div>

                <div className="feed-radar">
                  <div className="feed-radar-card">
                    <div className="feed-radar-head">
                      <strong>Топ авторы</strong>
                      <span>по вовлечению</span>
                    </div>
                    {topFeedAuthors.length === 0 ? (
                      <div className="empty small">Пока нет данных</div>
                    ) : (
                      <div className="feed-author-list">
                        {topFeedAuthors.map((author) => (
                          <button
                            key={`feed-top-author-${author.id}`}
                            type="button"
                            className={`feed-author-item ${feedAuthorFilter === author.id ? 'active' : ''}`.trim()}
                            onClick={() => toggleFeedAuthorFilter(author.id)}
                          >
                            <span>{author.displayName || author.username}</span>
                            <small>{author.engagement} pts</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="feed-radar-card">
                    <div className="feed-radar-head">
                      <strong>Горячие посты</strong>
                      <span>live</span>
                    </div>
                    {hotFeedPosts.length === 0 ? (
                      <div className="empty small">Пока тихо</div>
                    ) : (
                      <div className="feed-hot-list">
                        {hotFeedPosts.map((item) => (
                          <button
                            key={`feed-hot-${item.post.id}`}
                            type="button"
                            className="feed-hot-item"
                            onClick={() => openProfile(item.post.author.username)}
                          >
                            <span>{item.post.author.displayName || item.post.author.username}</span>
                            <small>{item.score} pts</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
              </div>
              )}
            </section>

            <div className={`feed-list ${feedExplorer.layout === FEED_LAYOUTS.compact ? 'feed-list-compact' : ''}`.trim()}>
              {visibleFeedPosts.length === 0 && (
                <div className="empty">
                  {posts.length === 0 ? 'Постов пока нет.' : 'По текущим фильтрам посты не найдены.'}
                </div>
              )}
              {visibleFeedPosts.map((post) => {
                const postEngagementScore = getFeedPostEngagementScore(post)
                const postRelativeAge = formatRelativeFeedAge(post.createdAt)
                const postIsFresh = getFeedPostAgeMs(post) <= (6 * 60 * 60 * 1000)
                const feedCardClasses = [
                  'feed-card',
                  feedExplorer.layout === FEED_LAYOUTS.compact ? 'feed-card-compact' : '',
                  postIsFresh && postEngagementScore >= 8 ? 'feed-card-hot' : ''
                ].filter(Boolean).join(' ')
                return (
                <article
                  key={post.id}
                  className={feedCardClasses}
                  onContextMenu={(event) => openPostMenu(event, post)}
                  onTouchStart={(event) => handleTouchContextMenuStart(event, (menuEvent) => openPostMenu(menuEvent, post))}
                  onTouchMove={handleTouchContextMenuMove}
                  onTouchEnd={handleTouchContextMenuEnd}
                  onTouchCancel={handleTouchContextMenuCancel}
                >
                  {post.repostOf && (
                    <div className="repost-badge">? Репост</div>
                  )}
                  <button
                    type="button"
                    className="feed-header clickable"
                    onClick={() => openProfile(post.author.username)}
                  >
                    <div
                      className="avatar small with-mini-profile"
                      onMouseEnter={(event) => queueMiniProfileCard(event, post.author)}
                      onMouseMove={moveMiniProfileCard}
                      onMouseLeave={() => hideMiniProfileCard()}
                    >
                      {post.author.avatarUrl ? (
                        <img src={resolveMediaUrl(post.author.avatarUrl)} alt="avatar" />
                      ) : (
                        post.author.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="feed-author-meta">
                      <strong>{renderHighlightedText(post.author.displayName || post.author.username, feedQueryNormalized)}</strong>
                      <span>@{post.author.username}</span>
                    </div>
                    <div className="feed-card-head-right">
                      <time title={new Date(post.createdAt).toLocaleString('ru-RU')}>{formatTime(post.createdAt)}</time>
                      {postRelativeAge && <span className="feed-age-chip">{postRelativeAge}</span>}
                    </div>
                  </button>
                  <div className="feed-card-insights">
                    <span className="feed-score-chip">⚡ {postEngagementScore} pts</span>
                    {postIsFresh && <span className="feed-score-chip fresh">new</span>}
                    {post.imageUrl && <span className="feed-score-chip media">media</span>}
                    {post.repostOf && <span className="feed-score-chip repost">repost</span>}
                  </div>
                  {post.body && <p>{renderHighlightedText(post.body, feedQueryNormalized)}</p>}
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
                      {post.repostOf.body && <p>{renderHighlightedText(post.repostOf.body, feedQueryNormalized)}</p>}
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
                            <div
                              className="avatar tiny with-mini-profile"
                              onMouseEnter={(event) => queueMiniProfileCard(event, comment.user)}
                              onMouseMove={moveMiniProfileCard}
                              onMouseLeave={() => hideMiniProfileCard()}
                            >
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
                )
              })}
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
                  className={`profile-hero profile-hero-expanded ${profileHeroThemeClass} ${profileHeroHasBanner ? 'profile-hero-has-banner' : ''}`.trim()}
                  style={{
                    backgroundColor: profileView.themeColor || '#7a1f1d',
                    backgroundImage: profileView.bannerUrl ? `url(${resolveMediaUrl(profileView.bannerUrl)})` : 'none'
                  }}
                >
                  <div
                    className="avatar large with-mini-profile"
                    onMouseEnter={(event) => queueMiniProfileCard(event, profileView)}
                    onMouseMove={moveMiniProfileCard}
                    onMouseLeave={() => hideMiniProfileCard()}
                  >
                    {profileView.avatarUrl ? (
                      <img src={resolveMediaUrl(profileView.avatarUrl)} alt="avatar" />
                    ) : (
                      profileView.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="profile-hero-main">
                    <div>
                      <h2 className="profile-hero-name">
                        {profileView.displayName || profileView.username}
                        {profileView.isVerified && <span className="verified-mark" title="Верифицированный профиль">✓</span>}
                      </h2>
                      <span>@{profileView.username}</span>
                      {profileViewRoleLabels.length > 0 && (
                        <div className="profile-role-row">
                          {profileViewRoleLabels.map((label, index) => (
                            <span key={`profile-role-${profileView.id}-${index}-${label}`} className="profile-role-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {profileViewMoodLabel && <div className="profile-mood-chip profile-mood-profile">{profileViewMoodLabel}</div>}
                    {profileShowcase.headline && <p className="profile-headline">{profileShowcase.headline}</p>}
                    {profileView.bio && <p>{profileView.bio}</p>}
                    <div className="profile-stats">
                      <span><strong>{profileFollowers}</strong> followers</span>
                      <span><strong>{profileFollowing}</strong> following</span>
                      <span><strong>{profileTracksCount}</strong> tracks</span>
                      <span><strong>{profilePosts.length}</strong> posts</span>
                      {profileJoinedAt && <span>since {profileJoinedAt}</span>}
                    </div>
                  </div>
                  <div className="profile-actions-row">
                    {canSubscribeProfile && (
                      <>
                        <button
                          type="button"
                          className={`primary profile-subscribe ${profileView.isSubscribed ? 'subscribed' : ''}`.trim()}
                          onClick={handleToggleSubscription}
                          disabled={loading}
                        >
                          {profileView.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={handleMessageFromProfile}
                          disabled={loading || profileMessagingBlocked}
                          title={profileMessagingBlocked ? 'Direct messages are blocked by privacy settings' : 'Open chat'}
                        >
                          Написать
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={handleSendProfileWave}
                          disabled={loading || profileMessagingBlocked}
                          title={profileMessagingBlocked ? 'Direct messages are blocked by privacy settings' : 'Send wave'}
                        >
                          Wave 👋
                        </button>
                      </>
                    )}
                    {!canSubscribeProfile && (
                      <button type="button" className="ghost" onClick={() => setView('profile')}>
                        Edit profile
                      </button>
                    )}
                    <button type="button" className="ghost" onClick={handleCopyProfileUsername}>
                      Copy @username
                    </button>
                  </div>
                  <div className="profile-power-ribbon">
                    <div className="profile-power-ribbon-meta">
                      <span>Profile Power</span>
                      <strong>{profilePowerScore}%</strong>
                    </div>
                    <div
                      className="profile-power-ribbon-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={profilePowerScore}
                    >
                      <span style={{ width: `${profilePowerScore}%` }}></span>
                    </div>
                  </div>
                </div>
                <section className="profile-mini-summary-row">
                  <article className="profile-mini-summary">
                    <span>Dev Snapshot</span>
                    <strong>{profileDevSummary}</strong>
                  </article>
                  <article className="profile-mini-summary">
                    <span>Showcase</span>
                    <strong>{profileShowcaseSummary}</strong>
                  </article>
                </section>
                <section className="profile-insights-grid">
                  <article className="profile-achievements-card">
                    <div className="profile-achievements-head">
                      <div className="profile-achievements-summary">
                        <h3>Достижения</h3>
                        <p>Реальный прогресс аккаунта.</p>
                      </div>
                      <span>{unlockedProfileAchievements.length}/{profileAchievementsTotal}</span>
                    </div>
                    <div
                      className="profile-achievements-progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={profileAchievementsProgress}
                    >
                      <span style={{ width: `${profileAchievementsProgress}%` }}></span>
                    </div>
                    <div className="profile-achievements-list">
                      {visibleUnlockedProfileAchievements.map((item) => (
                        <article key={item.id} className={`profile-achievement-item unlocked tier-${item.tier}`.trim()}>
                          <div className="profile-achievement-badge">{item.emoji}</div>
                          <div className="profile-achievement-meta">
                            <strong>{item.title}</strong>
                            <span>{item.description}</span>
                          </div>
                        </article>
                      ))}
                      {visibleLockedProfileAchievements.map((item) => (
                        <article key={item.id} className={`profile-achievement-item locked tier-${item.tier}`.trim()}>
                          <div className="profile-achievement-badge">{item.emoji}</div>
                          <div className="profile-achievement-meta">
                            <strong>{item.title}</strong>
                            <span>{item.requirement}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                    {hiddenProfileAchievementsCount > 0 && (
                      <div className="profile-achievements-more">+{hiddenProfileAchievementsCount} еще</div>
                    )}
                  </article>
                </section>
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
                <div className="profile-post-filters">
                  <button
                    type="button"
                    className={profilePostFilter === 'all' ? 'active' : ''}
                    onClick={() => setProfilePostFilter('all')}
                  >
                    Все <span>{profilePosts.length}</span>
                  </button>
                  <button
                    type="button"
                    className={profilePostFilter === 'media' ? 'active' : ''}
                    onClick={() => setProfilePostFilter('media')}
                  >
                    Медиа <span>{profilePosts.filter((post) => Boolean(post.imageUrl)).length}</span>
                  </button>
                  <button
                    type="button"
                    className={profilePostFilter === 'text' ? 'active' : ''}
                    onClick={() => setProfilePostFilter('text')}
                  >
                    Текст <span>{profilePosts.filter((post) => !post.imageUrl && !post.repostOf).length}</span>
                  </button>
                  <button
                    type="button"
                    className={profilePostFilter === 'reposts' ? 'active' : ''}
                    onClick={() => setProfilePostFilter('reposts')}
                  >
                    Репосты <span>{profilePosts.filter((post) => Boolean(post.repostOf)).length}</span>
                  </button>
                </div>
                <div className="feed-list">
                  {visibleProfilePosts.length === 0 && (
                    <div className="empty">No posts yet.</div>
                  )}
                  {visibleProfilePosts.map((post) => (
                    <article
                      key={post.id}
                      className="feed-card"
                      onContextMenu={(event) => openPostMenu(event, post)}
                      onTouchStart={(event) => handleTouchContextMenuStart(event, (menuEvent) => openPostMenu(menuEvent, post))}
                      onTouchMove={handleTouchContextMenuMove}
                      onTouchEnd={handleTouchContextMenuEnd}
                      onTouchCancel={handleTouchContextMenuCancel}
                    >
                      {post.repostOf && (
                        <div className="repost-badge">Repost</div>
                      )}
                      <div className="feed-header">
                        <div
                          className="avatar small with-mini-profile"
                          onMouseEnter={(event) => queueMiniProfileCard(event, profileView)}
                          onMouseMove={moveMiniProfileCard}
                          onMouseLeave={() => hideMiniProfileCard()}
                        >
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
                                <div
                                  className="avatar tiny with-mini-profile"
                                  onMouseEnter={(event) => queueMiniProfileCard(event, comment.user)}
                                  onMouseMove={moveMiniProfileCard}
                                  onMouseLeave={() => hideMiniProfileCard()}
                                >
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
              <button type="button" className="primary" onClick={() => {
                loadAdminUsers(adminQuery)
                loadAdminVerificationRequests(adminVerificationFilter, adminQuery)
              }}>
                Найти
              </button>
            </div>
            <div className="admin-role-manager">
              <strong>Управление ролями</strong>
              <div className="admin-role-grid">
                <input
                  type="text"
                  placeholder="code роли (пример: student)"
                  value={adminRoleDraft.value}
                  onChange={(event) => setAdminRoleDraft((prev) => ({ ...prev, value: event.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Название роли (пример: Студент)"
                  value={adminRoleDraft.label}
                  onChange={(event) => setAdminRoleDraft((prev) => ({ ...prev, label: event.target.value }))}
                />
                <button type="button" className="primary" onClick={handleAdminCreateRole}>
                  Добавить роль
                </button>
              </div>
            </div>
            <section className="admin-verify-section">
              <div className="admin-verify-head">
                <strong>Verification requests</strong>
                <div className="admin-verify-filters">
                  {[
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'all', label: 'All' }
                  ].map((item) => (
                    <button
                      key={`verification-filter-${item.value}`}
                      type="button"
                      className={adminVerificationFilter === item.value ? 'active' : ''}
                      onClick={() => {
                        setAdminVerificationFilter(item.value)
                        loadAdminVerificationRequests(item.value, adminQuery)
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => loadAdminVerificationRequests(adminVerificationFilter, adminQuery)}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {adminVerificationLoading ? (
                <div className="empty small">Loading requests...</div>
              ) : adminVerificationRows.length === 0 ? (
                <div className="empty small">No verification requests.</div>
              ) : (
                <div className="admin-verify-list">
                  {adminVerificationRows.map((item) => (
                    <article key={item.id} className={`admin-verify-item status-${item.status}`.trim()}>
                      <div className="admin-verify-user">
                        <div
                          className="avatar tiny with-mini-profile"
                          onMouseEnter={(event) => queueMiniProfileCard(event, item.user)}
                          onMouseMove={moveMiniProfileCard}
                          onMouseLeave={() => hideMiniProfileCard()}
                        >
                          {item.user.avatarUrl ? (
                            <img src={resolveMediaUrl(item.user.avatarUrl)} alt="avatar" />
                          ) : (
                            (item.user.username || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>
                            {item.user.displayName || item.user.username}
                            {item.user.isVerified ? <span className="verified-mark" title="Verified">✓</span> : null}
                          </strong>
                          <span>@{item.user.username}</span>
                          <div className="admin-badges">
                            {(Array.isArray(item.user.roleLabels) ? item.user.roleLabels : ['Студент']).map((roleLabel, idx) => (
                              <span key={`${item.id}-verify-role-${idx}`} className="badge role">{roleLabel}</span>
                            ))}
                          </div>
                        </div>
                        <span className={`verification-status-badge ${item.status}`.trim()}>
                          {verificationStatusLabelByValue.get(item.status) || item.status}
                        </span>
                      </div>
                      <p className="admin-verify-reason">{item.reason}</p>
                      {item.evidence ? <p className="admin-verify-evidence">Proof: {item.evidence}</p> : null}
                      <div className="admin-verify-meta">
                        <span>Submitted: {formatDateTime(item.createdAt)}</span>
                        {item.reviewedAt ? <span>Reviewed: {formatDateTime(item.reviewedAt)}</span> : null}
                        {item.reviewedByUsername ? <span>Admin: @{item.reviewedByUsername}</span> : null}
                      </div>
                      {item.adminNote ? <div className="admin-verify-note">{item.adminNote}</div> : null}
                      {item.status === 'pending' ? (
                        <div className="admin-verify-actions">
                          <input
                            type="text"
                            value={adminVerificationNoteByRequest[item.id] || ''}
                            onChange={(event) => setAdminVerificationNoteByRequest((prev) => ({
                              ...prev,
                              [item.id]: event.target.value
                            }))}
                            placeholder="Admin note (optional)"
                          />
                          <button
                            type="button"
                            className="primary"
                            onClick={() => handleAdminReviewVerification(item, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleAdminReviewVerification(item, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
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
                      {u.is_verified && <span className="badge verified">VERIFIED</span>}
                      {getUserRoleList(u).map((roleValue) => (
                        <span key={`${u.id}-role-badge-${roleValue}`} className="badge role">
                          {roleLabelByValue.get(roleValue) || roleValue}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="admin-meta">
                    <span>Предупр.: {u.warnings_count}</span>
                    <span>
                      Роли: {getUserRoleList(u).map((roleValue) => (roleLabelByValue.get(roleValue) || roleValue)).join(', ') || 'не заданы'}
                    </span>
                    <span>{u.is_banned ? 'БАН' : 'активен'}</span>
                    <span>{u.is_verified ? 'верифицирован' : 'без верификации'}</span>
                  </div>
                  <div className="admin-actions">
                    <div className="admin-role-picker">
                      {roleOptions.map((role) => {
                        const activeRoles = Array.isArray(adminRoleByUser[u.id]) ? adminRoleByUser[u.id] : getUserRoleList(u)
                        const isActive = activeRoles.includes(role.value)
                        return (
                          <button
                            key={`${u.id}-role-picker-${role.value}`}
                            type="button"
                            className={isActive ? 'active' : ''}
                            onClick={() => toggleAdminRoleChoice(u.id, role.value)}
                          >
                            {role.label}
                          </button>
                        )
                      })}
                    </div>
                    <button type="button" onClick={() => handleAdminSetRoleForUser(u)}>
                      Сохранить роли
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminSetVerified(u.id, !u.is_verified)
                          .then(async () => {
                            await Promise.all([
                              loadAdminUsers(adminQuery),
                              loadAdminVerificationRequests(adminVerificationFilter, adminQuery)
                            ])
                          })
                          .catch((err) => setStatus({ type: 'error', message: err.message }))
                      }
                    >
                      {u.is_verified ? 'Снять верификацию' : 'Верифицировать'}
                    </button>
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
                    <div className="admin-inline-row admin-password-reset">
                      <input
                        type="password"
                        value={adminResetPasswordByUser[u.id] || ''}
                        onChange={(event) =>
                          setAdminResetPasswordByUser((prev) => ({ ...prev, [u.id]: event.target.value }))
                        }
                        placeholder="New password (min 6)"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleAdminResetPasswordForUser(u)}
                      >
                        Reset password
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'settings' && user && (
          <section className="panel settings-panel">
            <div className="settings-shell">
              <aside className="settings-sidebar">
                <div className="settings-account-card">
                  <div className="avatar large with-mini-profile">
                    {user.avatarUrl ? (
                      <img src={resolveMediaUrl(user.avatarUrl)} alt="avatar" />
                    ) : (
                      (user.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="settings-account-meta">
                    <strong>
                      {user.displayName || user.username}
                      {user.isVerified ? <span className="verified-mark" title="Verified">✓</span> : null}
                    </strong>
                    <span>@{user.username}</span>
                    <small>{user.statusEmoji ? `${user.statusEmoji} ` : ''}{user.statusText || 'без статуса'}</small>
                  </div>
                  <div className="settings-role-line">
                    {(settingsRoleLabels.length > 0 ? settingsRoleLabels : ['Студент']).map((label, idx) => (
                      <span key={`settings-role-chip-${idx}`} className="mini-profile-role">{label}</span>
                    ))}
                  </div>
                </div>
                <div className="settings-nav-wrap">
                  <span className="settings-nav-caption">Разделы</span>
                  <nav className="settings-nav">
                    {settingsNavItems.map((item) => (
                      <button
                        key={`settings-nav-${item.id}`}
                        type="button"
                        className={settingsSection === item.id ? 'active' : ''}
                        onClick={() => setSettingsSection(item.id)}
                      >
                        <span className="settings-nav-icon" aria-hidden="true">{item.icon}</span>
                        <span className="settings-nav-label">{item.label}</span>
                        {item.badge ? <span className="settings-nav-badge">{item.badge}</span> : null}
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>
              <div className="settings-content">
                <section className="settings-hero">
                  <div className="settings-hero-main">
                    <span className="settings-hero-overline">Control Center</span>
                    <h2>Настройки аккаунта</h2>
                    <p>{settingsSectionHint}</p>
                    {settingsCurrentItem ? (
                      <span className="settings-hero-chip">
                        <span aria-hidden="true">{settingsCurrentItem.icon}</span>
                        {settingsCurrentItem.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="settings-kpi-grid">
                    <article className="settings-kpi">
                      <span>Безопасность</span>
                      <strong>{settingsSecurityBadge}</strong>
                    </article>
                    <article className="settings-kpi">
                      <span>Сеансы</span>
                      <strong>{settingsActiveSessionCount}</strong>
                    </article>
                    <article className="settings-kpi">
                      <span>Privacy rules</span>
                      <strong>{privacyControls.length}</strong>
                    </article>
                  </div>
                </section>
                {settingsSection === 'general' && (
                  <section className="settings-pane">
                    <h2>Общие настройки</h2>
                    <p className="subtitle">Базовые параметры и быстрые действия.</p>
                    <div className="settings-action-list">
                      <button type="button" className="settings-action-row" onClick={() => setView('profile')}>
                        <strong>Профиль</strong>
                        <span>Изменить аватар, обложку и данные</span>
                      </button>
                      <button type="button" className="settings-action-row" onClick={toggleTheme}>
                        <strong>Тема</strong>
                        <span>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                      </button>
                      <button type="button" className="settings-action-row" onClick={handlePushToggle} disabled={pushButtonDisabled}>
                        <strong>Push-уведомления</strong>
                        <span>{pushButtonLabel}</span>
                      </button>
                    </div>
                  </section>
                )}
                {settingsSection === 'notifications' && (
                  <section className="settings-pane">
                    <h2>Уведомления</h2>
                    <p className="subtitle">Управление push-уведомлениями браузера.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Push</h3>
                        <span className={`verification-status-badge ${pushState.enabled ? 'approved' : 'none'}`.trim()}>
                          {pushState.enabled ? 'Включено' : 'Выключено'}
                        </span>
                      </div>
                      <div className="profile-verification-actions">
                        <button type="button" className="primary" onClick={handlePushToggle} disabled={pushButtonDisabled}>
                          {pushButtonLabel}
                        </button>
                      </div>
                    </section>
                  </section>
                )}
                {settingsSection === 'appearance' && (
                  <section className="settings-pane">
                    <h2>Оформление</h2>
                    <p className="subtitle">Глобальный стиль интерфейса.</p>
                    <section className="ui-studio">
                      <div className="ui-studio-grid">
                        <label>
                          Стиль
                          <select value={uiPreferences.style} onChange={(event) => updateUiPreference('style', event.target.value)}>
                            {UI_STYLE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Плотность
                          <select value={uiPreferences.density} onChange={(event) => updateUiPreference('density', event.target.value)}>
                            {UI_DENSITY_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="ui-studio-actions">
                        <button type="button" className="ghost" onClick={resetUiPreferences}>Сбросить визуал</button>
                      </div>
                    </section>
                  </section>
                )}
                {settingsSection === 'security' && (
                  <section className="settings-pane">
                    <h2>2FA и защита</h2>
                    <p className="subtitle">Подключение TOTP и управление резервными кодами.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>2FA</h3>
                        <span className={`verification-status-badge ${twoFactorStatus.enabled ? 'approved' : 'none'}`.trim()}>
                          {twoFactorStatus.enabled ? '2FA ON' : '2FA OFF'}
                        </span>
                      </div>
                      {!twoFactorStatus.eligible && (
                        <p className="profile-verification-text">2FA доступна для ролей teacher/admin.</p>
                      )}
                      {twoFactorStatus.eligible && !twoFactorStatus.enabled && (
                        <div className="profile-verification-actions">
                          <button type="button" className="primary" onClick={handleStartTwoFactorSetup} disabled={loading}>
                            {twoFactorSetup ? 'Restart setup' : 'Start 2FA setup'}
                          </button>
                        </div>
                      )}
                      {twoFactorSetup && (
                        <div className="profile-verification-form">
                          <input type="text" readOnly value={twoFactorSetup.secret || ''} />
                          <textarea rows={2} readOnly value={twoFactorSetup.otpAuthUrl || ''}></textarea>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={twoFactorCode}
                            onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                          />
                          <div className="profile-verification-actions">
                            <button type="button" className="primary" onClick={handleEnableTwoFactor} disabled={loading}>Enable 2FA</button>
                          </div>
                        </div>
                      )}
                      {twoFactorStatus.enabled && (
                        <div className="profile-verification-form">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={twoFactorCode}
                            onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                            placeholder="Current 6-digit code"
                            maxLength={6}
                          />
                          <input
                            type="text"
                            value={twoFactorBackupCode}
                            onChange={(event) => setTwoFactorBackupCode(event.target.value.trim().toUpperCase().slice(0, 20))}
                            placeholder="Backup code (for disable)"
                            maxLength={20}
                          />
                          <div className="profile-verification-actions">
                            <button type="button" className="ghost" onClick={handleRegenerateBackupCodes} disabled={loading}>Regenerate backup codes</button>
                            <button type="button" className="danger" onClick={handleDisableTwoFactor} disabled={loading}>Disable 2FA</button>
                          </div>
                        </div>
                      )}
                    </section>
                  </section>
                )}
                {settingsSection === 'password' && (
                  <section className="settings-pane">
                    <h2>Пароль</h2>
                    <p className="subtitle">Смена пароля с завершением других сессий.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-form profile-password-form">
                        <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} placeholder="Current password" minLength={6} autoComplete="current-password" />
                        <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} placeholder="New password" minLength={6} autoComplete="new-password" />
                        <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} placeholder="Confirm new password" minLength={6} autoComplete="new-password" />
                        <div className="profile-verification-actions">
                          <button type="button" className="primary" onClick={handleChangePassword} disabled={loading}>Change password</button>
                        </div>
                      </div>
                    </section>
                  </section>
                )}
                {settingsSection === 'sessions' && (
                  <section className="settings-pane">
                    <h2>Активные сеансы</h2>
                    <p className="subtitle">Список входов и завершение любой сессии.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Sessions</h3>
                        <span className="verification-status-badge none">{settingsActiveSessionCount}</span>
                      </div>
                      <div className="profile-verification-actions">
                        <button type="button" className="ghost" onClick={() => loadUserSessions()} disabled={sessionsLoading}>Refresh</button>
                        <button type="button" className="danger" onClick={handleRevokeOtherSessions} disabled={sessionsLoading}>Revoke other sessions</button>
                      </div>
                      {sessionsLoading ? (
                        <div className="empty small">Loading sessions...</div>
                      ) : sessions.length === 0 ? (
                        <div className="empty small">No active sessions.</div>
                      ) : (
                        <div className="admin-list">
                          {sessions.map((sessionItem) => (
                            <div key={sessionItem.id} className="admin-item">
                              <div>
                                <strong>{sessionItem.isCurrent ? 'Current device' : 'Device session'}</strong>
                                <span>{sessionItem.userAgent || 'Unknown user agent'}</span>
                                <div className="admin-meta">
                                  <span>IP: {sessionItem.ipAddress || 'n/a'}</span>
                                  <span>Last: {formatDateTime(sessionItem.lastSeenAt || sessionItem.createdAt) || 'n/a'}</span>
                                </div>
                              </div>
                              {!sessionItem.isCurrent && !sessionItem.revokedAt && (
                                <div className="admin-actions">
                                  <button type="button" className="danger" onClick={() => handleRevokeSession(sessionItem.id)}>Revoke</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </section>
                )}
                {settingsSection === 'privacy' && (
                  <section className="settings-pane">
                    <h2>Конфиденциальность</h2>
                    <p className="subtitle">Mute, block, hide profile content и запрет лички.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Quick rule by @username</h3>
                        <span className={`verification-status-badge ${privacyQuickLoading ? 'pending' : 'none'}`.trim()}>
                          {privacyQuickLoading ? 'Updating...' : 'Manual'}
                        </span>
                      </div>
                      <p className="profile-verification-text">Find a user and apply privacy flags in one click.</p>
                      <div className="profile-verification-form">
                        <input
                          type="text"
                          value={privacyQuickUsername}
                          onChange={(event) => setPrivacyQuickUsername(event.target.value)}
                          placeholder="@username"
                          maxLength={40}
                          autoComplete="off"
                        />
                        {privacyQuickSearchLoading ? (
                          <div className="empty small">Searching users...</div>
                        ) : privacyQuickUsers.length > 0 ? (
                          <div className="privacy-quick-user-list">
                            {privacyQuickUsers.map((item) => (
                              <button
                                key={`privacy-quick-user-${item.id}`}
                                type="button"
                                className="privacy-quick-user"
                                onClick={() => setPrivacyQuickUsername(`@${item.username}`)}
                              >
                                <span>{item.displayName || item.username}</span>
                                <small>@{item.username}</small>
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="privacy-quick-flag-row">
                          <button
                            type="button"
                            className={privacyQuickFlags.isMuted ? 'active' : ''}
                            onClick={() => togglePrivacyQuickFlag('isMuted')}
                          >
                            Mute
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.denyDm ? 'active' : ''}
                            onClick={() => togglePrivacyQuickFlag('denyDm')}
                          >
                            Deny DM
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.hideProfileContent ? 'active' : ''}
                            onClick={() => togglePrivacyQuickFlag('hideProfileContent')}
                          >
                            Hide profile
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.isBlocked ? 'active danger' : 'danger'}
                            onClick={() => togglePrivacyQuickFlag('isBlocked')}
                          >
                            Block
                          </button>
                        </div>
                        <div className="profile-verification-actions">
                          <button type="button" className="primary" onClick={applyPrivacyQuickRule} disabled={privacyQuickLoading}>
                            Apply rule
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Batch actions</h3>
                        <span className="verification-status-badge none">{privacyControls.length}</span>
                      </div>
                      <p className="profile-verification-text">Apply preset actions to all users from your privacy list.</p>
                      <div className="privacy-batch-actions">
                        <button type="button" onClick={() => applyPrivacyBatchPreset('shield-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Shield all (deny DM + hide profile)
                        </button>
                        <button type="button" onClick={() => applyPrivacyBatchPreset('mute-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Mute all
                        </button>
                        <button type="button" className="danger" onClick={() => applyPrivacyBatchPreset('clear-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Clear all rules
                        </button>
                      </div>
                    </section>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Privacy Controls</h3>
                        <span className="verification-status-badge none">{privacyControls.length}</span>
                      </div>
                      <div className="profile-verification-actions">
                        <button type="button" className="ghost" onClick={() => loadMyPrivacy()} disabled={privacyControlsLoading}>Refresh</button>
                      </div>
                      {privacyControlsLoading ? (
                        <div className="empty small">Loading privacy controls...</div>
                      ) : privacyControls.length === 0 ? (
                        <div className="empty small">No custom privacy rules.</div>
                      ) : (
                        <div className="admin-list">
                          {privacyControls.map((item) => (
                            <div key={`settings-privacy-${item.targetUserId}`} className="admin-item">
                              <div>
                                <strong>{item.targetDisplayName || item.targetUsername || 'User'}</strong>
                                <span>@{item.targetUsername || 'unknown'}</span>
                                <div className="admin-badges">
                                  {item.isMuted && <span className="badge role">MUTE</span>}
                                  {item.isBlocked && <span className="badge role">BLOCK</span>}
                                  {item.hideProfileContent && <span className="badge role">HIDE PROFILE</span>}
                                  {item.denyDm && <span className="badge role">DENY DM</span>}
                                </div>
                              </div>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { isMuted: !item.isMuted }, item.isMuted ? 'Mute removed.' : 'User muted.')}
                                >
                                  {item.isMuted ? 'Unmute' : 'Mute'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { denyDm: !item.denyDm }, item.denyDm ? 'DM allowed.' : 'DM denied.')}
                                >
                                  {item.denyDm ? 'Allow DM' : 'Deny DM'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { hideProfileContent: !item.hideProfileContent }, item.hideProfileContent ? 'Profile content visible.' : 'Profile content hidden.')}
                                >
                                  {item.hideProfileContent ? 'Show profile' : 'Hide profile'}
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { isBlocked: !item.isBlocked }, item.isBlocked ? 'User unblocked.' : 'User blocked.')}
                                >
                                  {item.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, {
                                    isMuted: false,
                                    isBlocked: false,
                                    hideProfileContent: false,
                                    denyDm: false
                                  }, 'Privacy rules cleared.')}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </section>
                )}
                {settingsSection === 'storage' && (
                  <section className="settings-pane">
                    <h2>Данные и память</h2>
                    <p className="subtitle">Очистка локальных черновиков.</p>
                    <div className="settings-action-list">
                      <button
                        type="button"
                        className="settings-action-row"
                        onClick={() => {
                          setDraftsByConversation({})
                          setStatus({ type: 'info', message: 'Локальные черновики очищены.' })
                          try { localStorage.removeItem(DRAFT_STORAGE_KEY) } catch (err) {}
                        }}
                      >
                        <strong>Очистить черновики</strong>
                        <span>{Object.keys(draftsByConversation || {}).length} сохранено</span>
                      </button>
                    </div>
                  </section>
                )}
                {settingsSection === 'stickers' && (
                  <section className="settings-pane">
                    <h2>Стикеры и эмодзи</h2>
                    <p className="subtitle">Быстрый переход к медиа-панели.</p>
                    <div className="settings-action-list">
                      <button type="button" className="settings-action-row" onClick={() => { setView('chats'); setMediaPanelOpen(true); setMediaPanelTab(MEDIA_PANEL_TABS.stickers) }}>
                        <strong>Мои стикеры</strong>
                        <span>{myStickers.length} в наборе</span>
                      </button>
                      <button type="button" className="settings-action-row" onClick={() => { setView('chats'); setMediaPanelOpen(true); setMediaPanelTab(MEDIA_PANEL_TABS.gifs) }}>
                        <strong>Мои GIF</strong>
                        <span>{myGifs.length} в наборе</span>
                      </button>
                    </div>
                  </section>
                )}
                {settingsSection === 'language' && (
                  <section className="settings-pane">
                    <h2>Язык</h2>
                    <p className="subtitle">Сейчас интерфейс на русском языке.</p>
                  </section>
                )}
                {settingsSection === 'support' && (
                  <section className="settings-pane">
                    <h2>Помощь</h2>
                    <p className="subtitle">Справочные ссылки.</p>
                    <div className="settings-action-list">
                      <a className="settings-action-row as-link" href="https://telegram.org/faq" target="_blank" rel="noreferrer">
                        <strong>Вопросы о Telegram</strong>
                        <span>Открыть FAQ</span>
                      </a>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'profile' && user && (
          <form className="panel profile-settings-panel" onSubmit={handleProfileSave}>
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
            <p className="profile-banner-tip">
              Для PNG/JPG/WebP откроется редактор: можно двигать и масштабировать обложку. GIF загружается без кадрирования.
            </p>
            <div className="profile-avatar">
              <div
                className="avatar large with-mini-profile"
                onMouseEnter={(event) => queueMiniProfileCard(event, user)}
                onMouseMove={moveMiniProfileCard}
                onMouseLeave={() => hideMiniProfileCard()}
              >
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
            <section className="profile-theme-customizer" aria-label="Кастомизация цвета профиля">
              <div className="profile-theme-customizer-head">
                <strong>Цвет профиля</strong>
                <code>{normalizedThemeColor}</code>
              </div>
              <div className="profile-theme-customizer-grid">
                <div
                  ref={profileThemeWheelRef}
                  className="profile-theme-wheel"
                  style={profileThemeWheelStyle}
                  onPointerDown={handleProfileThemeWheelPointerDown}
                  onPointerMove={handleProfileThemeWheelPointerMove}
                  onPointerUp={handleProfileThemeWheelPointerEnd}
                  onPointerCancel={handleProfileThemeWheelPointerEnd}
                  onLostPointerCapture={handleProfileThemeWheelPointerEnd}
                  onKeyDown={handleProfileThemeWheelKeyDown}
                  role="slider"
                  tabIndex={0}
                  aria-label="Круговая палитра цвета профиля"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={profileThemeHsl.h}
                  aria-valuetext={`Тон ${profileThemeHsl.h}, насыщенность ${profileThemeHsl.s}%`}
                >
                  <span className="profile-theme-wheel-thumb" style={profileThemeWheelThumbStyle}></span>
                </div>
                <div className="profile-theme-controls">
                  <label className="profile-theme-lightness">
                    <span>Яркость: {profileThemeHsl.l}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clampNumber(profileThemeHsl.l, 0, 100)}
                      onChange={handleProfileThemeLightnessChange}
                    />
                  </label>
                  <label className="profile-theme-color-field">
                    <span>Точный цвет</span>
                    <input
                      type="color"
                      value={normalizedThemeColor}
                      onChange={handleProfileThemeHexChange}
                    />
                  </label>
                  <button type="button" className="ghost profile-theme-reset" onClick={() => applyProfileColorPreset('#7a1f1d')}>
                    Сбросить цвет
                  </button>
                </div>
              </div>
            </section>
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
                  <option
                    key={role.value}
                    value={role.value}
                    disabled={role.value === 'teacher' && !(user && user.isAdmin)}
                  >
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <section className="profile-verification-card">
              <div className="profile-verification-head">
                <h3>Verification</h3>
                <span className={`verification-status-badge ${user.isVerified ? 'approved' : (verificationRequestStatus || 'none')}`.trim()}>
                  {user.isVerified ? 'Verified' : verificationRequestStatusLabel}
                </span>
              </div>
              {user.isVerified ? (
                <p className="profile-verification-text">
                  Profile is verified by admins. The checkmark is visible in profile and mini profile.
                </p>
              ) : (
                <>
                  {verificationRequest ? (
                    <div className="profile-verification-meta">
                      <span>Submitted: {formatDateTime(verificationRequest.createdAt) || 'just now'}</span>
                      {verificationRequest.reviewedAt ? (
                        <span>Reviewed: {formatDateTime(verificationRequest.reviewedAt)}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'pending' ? (
                    <p className="profile-verification-text">Request is under review. You can cancel and submit a new one.</p>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'rejected' ? (
                    <p className="profile-verification-text">
                      Request was rejected.
                      {verificationRequest.adminNote ? ` Note: ${verificationRequest.adminNote}` : ' Update details and send again.'}
                    </p>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'cancelled' ? (
                    <p className="profile-verification-text">Previous request was cancelled. You can submit a new one.</p>
                  ) : null}
                  {canCreateVerificationRequest ? (
                    <div className="profile-verification-form">
                      <input
                        type="text"
                        value={verificationForm.fullName}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        placeholder="Real full name"
                        maxLength={80}
                      />
                      <textarea
                        rows={3}
                        value={verificationForm.reason}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, reason: event.target.value }))}
                        placeholder="Why profile should be verified"
                        maxLength={360}
                      />
                      <input
                        type="text"
                        value={verificationForm.evidence}
                        onChange={(event) => setVerificationForm((prev) => ({ ...prev, evidence: event.target.value }))}
                        placeholder="Public link or contact (optional)"
                        maxLength={220}
                      />
                      <div className="profile-verification-actions">
                        <button
                          type="button"
                          className="primary"
                          onClick={handleCreateVerificationRequest}
                          disabled={verificationSubmitting}
                        >
                          {verificationSubmitting ? 'Sending...' : 'Submit verification request'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'pending' ? (
                    <div className="profile-verification-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={handleCancelVerificationRequest}
                        disabled={verificationSubmitting}
                      >
                        {verificationSubmitting ? 'Please wait...' : 'Cancel request'}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
            <label>
              О себе
              <textarea
                rows={4}
                value={profileForm.bio}
                onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                placeholder="Пару слов о себе"
              />
            </label>
            <div className="profile-pro-grid">
              <section className="profile-pro-card">
                <div className="profile-pro-head">
                  <h3>Оформление профиля</h3>
                  <span>{profileEditorScore}% готовности</span>
                </div>
                <div className="profile-progress">
                  <span style={{ width: `${profileEditorScore}%` }}></span>
                </div>
                <div className="profile-preset-group">
                  <strong>Цветовые темы</strong>
                  <div className="profile-color-preset-row">
                    {PROFILE_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={normalizeHexColor(profileForm.themeColor) === normalizeHexColor(preset.value) ? 'active' : ''}
                        onClick={() => applyProfileColorPreset(preset.value)}
                        title={preset.label}
                        style={{ '--swatch-color': preset.value }}
                      >
                        <span></span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <section className="profile-pro-card">
                <div className="profile-pro-head">
                  <h3>Мини-подсказка</h3>
                  <span>{profileEditorDoneCount}/{profileEditorChecklist.length}</span>
                </div>
                <div className="profile-checklist-mini">
                  {profileEditorPendingChecklist.length === 0 ? (
                    <div className="profile-checklist-mini-pill done">
                      <span>✓</span>
                      Профиль заполнен
                    </div>
                  ) : (
                    <>
                      {profileEditorPendingChecklist.slice(0, 2).map((item) => (
                        <div key={item.id} className="profile-checklist-mini-pill">
                          <span>•</span>
                          {item.label}
                        </div>
                      ))}
                      {profileEditorPendingChecklist.length > 2 ? (
                        <div className="profile-checklist-mini-extra">
                          +{profileEditorPendingChecklist.length - 2} ещё
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            </div>
            <section className="profile-dev-lab">
              <div className="profile-dev-head">
                <h3>Developer Mode</h3>
                <span>{editorDeveloperSnapshot.score}% • {editorDeveloperSnapshot.level}</span>
              </div>
              <p>Быстрые пресеты для программистов: скиллы, бейджи, визуал и тематический стиль профиля.</p>
              <div className="profile-dev-preset-grid">
                {DEV_PROFILE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDeveloperPreset(preset.id)}
                  >
                    <strong>{preset.emoji} {preset.label}</strong>
                    <span>{preset.headline}</span>
                  </button>
                ))}
              </div>
              <div className="profile-dev-track-row">
                <strong>Текущее направление: {editorDeveloperSnapshot.primaryTrack}</strong>
                {editorDeveloperSnapshot.activeTracks.length > 0 ? (
                  <div className="profile-dev-track-chips">
                    {editorDeveloperSnapshot.activeTracks.map((track) => (
                      <span key={`editor-dev-track-${track.id}`}>{track.label} · {track.score}</span>
                    ))}
                  </div>
                ) : (
                  <span>Добавь технические скиллы в Showcase, чтобы получить точный dev-срез.</span>
                )}
              </div>
            </section>
            <section className="profile-showcase-editor">
              <div className="profile-showcase-head">
                <h3>Showcase</h3>
                <span>Дополнительное оформление профиля</span>
              </div>
              <label>
                Слоган профиля
                <input
                  type="text"
                  value={profileShowcaseForm.headline}
                  onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, headline: event.target.value }))}
                  placeholder="Frontend dev | Music lover | Team player"
                  maxLength={120}
                />
              </label>
              <label>
                Тема публичной карточки
                <select
                  value={profileShowcaseForm.heroTheme}
                  onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, heroTheme: event.target.value }))}
                >
                  {PROFILE_HERO_THEMES.map((themeOption) => (
                    <option key={themeOption.value} value={themeOption.value}>
                      {themeOption.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Skills (через запятую)
                <input
                  type="text"
                  value={profileShowcaseForm.skillsInput}
                  onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, skillsInput: event.target.value }))}
                  placeholder="React, UI, Motion, PostgreSQL"
                />
              </label>
              <div className="showcase-badge-picker">
                <span>Бейджи</span>
                <div className="showcase-badge-grid">
                  {PROFILE_BADGE_OPTIONS.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      className={(Array.isArray(profileShowcaseForm.badges) && profileShowcaseForm.badges.includes(badge.id)) ? 'active' : ''}
                      onClick={() => toggleShowcaseBadge(badge.id)}
                    >
                      {badge.emoji} {badge.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="showcase-links-grid">
                <label>
                  Ссылка #1 (название)
                  <input
                    type="text"
                    value={profileShowcaseForm.linkPrimaryLabel}
                    onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, linkPrimaryLabel: event.target.value }))}
                    placeholder="Telegram"
                    maxLength={30}
                  />
                </label>
                <label>
                  Ссылка #1 (url)
                  <input
                    type="url"
                    value={profileShowcaseForm.linkPrimaryUrl}
                    onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, linkPrimaryUrl: event.target.value }))}
                    placeholder="t.me/username"
                    maxLength={240}
                  />
                </label>
                <label>
                  Ссылка #2 (название)
                  <input
                    type="text"
                    value={profileShowcaseForm.linkSecondaryLabel}
                    onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, linkSecondaryLabel: event.target.value }))}
                    placeholder="GitHub"
                    maxLength={30}
                  />
                </label>
                <label>
                  Ссылка #2 (url)
                  <input
                    type="url"
                    value={profileShowcaseForm.linkSecondaryUrl}
                    onChange={(event) => setProfileShowcaseForm((prev) => ({ ...prev, linkSecondaryUrl: event.target.value }))}
                    placeholder="github.com/username"
                    maxLength={240}
                  />
                </label>
              </div>
              <div className="showcase-editor-actions">
                <button type="button" className="primary" onClick={handleSaveProfileShowcase}>Сохранить Showcase</button>
                <button type="button" className="ghost" onClick={handleResetProfileShowcase}>Сбросить</button>
              </div>
              {(currentUserShowcase.headline || currentUserShowcase.skills.length || currentUserShowcase.badges.length) && (
                <div className="showcase-saved-preview">
                  <strong>Текущее сохраненное оформление</strong>
                  <p>{currentUserShowcase.headline || 'Слоган не задан'}</p>
                </div>
              )}
            </section>
            <section className="ui-studio">
              <div className="ui-studio-head">
                <h3>UI Studio</h3>
                <span>Глобальный дизайн интерфейса</span>
              </div>
              <div className="ui-studio-grid">
                <label>
                  Стиль
                  <select
                    value={uiPreferences.style}
                    onChange={(event) => updateUiPreference('style', event.target.value)}
                  >
                    {UI_STYLE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Плотность
                  <select
                    value={uiPreferences.density}
                    onChange={(event) => updateUiPreference('density', event.target.value)}
                  >
                    {UI_DENSITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Интенсивность фона: {uiPreferences.ambient}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={uiPreferences.ambient}
                    onChange={(event) => updateUiPreference('ambient', Number(event.target.value))}
                  />
                </label>
                <label>
                  Скругление карточек: {Math.round(uiPreferences.radius)}px
                  <input
                    type="range"
                    min={12}
                    max={36}
                    step={1}
                    value={uiPreferences.radius}
                    onChange={(event) => updateUiPreference('radius', Number(event.target.value))}
                  />
                </label>
              </div>
              <label className="ui-studio-toggle">
                <input
                  type="checkbox"
                  checked={uiPreferences.syncAccent}
                  onChange={(event) => updateUiPreference('syncAccent', event.target.checked)}
                />
                Использовать цвет профиля как акцент интерфейса
              </label>
              <div className="ui-studio-actions">
                <button type="button" className="ghost" onClick={resetUiPreferences}>Сбросить UI Studio</button>
              </div>
            </section>
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
            <button type="button" onClick={toggleChatMute}>
              {activeConversationPrivacy.isMuted ? 'Unmute chat' : 'Mute chat'}
            </button>
            <button type="button" onClick={toggleChatDenyDm}>
              {activeConversationPrivacy.denyDm ? 'Allow DM' : 'Deny DM'}
            </button>
            <button type="button" onClick={toggleChatHideProfile}>
              {activeConversationPrivacy.hideProfileContent ? 'Show profile content' : 'Hide profile content'}
            </button>
            <button type="button" className="danger" onClick={toggleChatBlock}>
              {activeConversationPrivacy.isBlocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>,
          document.body
        )}

        {miniProfileCard.open && miniProfileCard.user && typeof document !== 'undefined' && createPortal(
          <div
            className="mini-profile-card"
            style={{ top: `${miniProfileCard.y}px`, left: `${miniProfileCard.x}px` }}
            onMouseEnter={clearMiniProfileTimers}
            onMouseLeave={() => hideMiniProfileCard()}
          >
            <div className="mini-profile-head">
              <div className="avatar small">
                {miniProfileCard.user.avatarUrl ? (
                  <img src={resolveMediaUrl(miniProfileCard.user.avatarUrl)} alt="avatar" />
                ) : (
                  (miniProfileCard.user.displayName || miniProfileCard.user.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div className="mini-profile-identity">
                <strong>
                  {miniProfileCard.user.displayName || miniProfileCard.user.username || 'Пользователь'}
                  {miniProfileCard.user.isVerified && <span className="verified-mark mini-profile-verified" title="Верифицированный профиль">✓</span>}
                </strong>
                {miniProfileCard.user.username && <span>@{miniProfileCard.user.username}</span>}
              </div>
              <span className={`mini-profile-presence ${miniProfileCard.user.online ? 'online' : ''}`.trim()}>
                {miniProfileCard.user.online ? 'в сети' : 'не в сети'}
              </span>
            </div>
            <div className="mini-profile-meta">
              <div className="mini-profile-role-list">
                {(Array.isArray(miniProfileCard.user.roleLabels) ? miniProfileCard.user.roleLabels : ['Студент']).map((roleLabel, index) => (
                  <span key={`mini-profile-role-${index}-${roleLabel}`} className="mini-profile-role">{roleLabel}</span>
                ))}
              </div>
              {miniProfileCard.user.subscribersCountKnown ? (
                <span className="mini-profile-counter">{miniProfileCard.user.subscribersCount} подписчиков</span>
              ) : null}
              {(miniProfileCard.user.statusEmoji || miniProfileCard.user.statusText) && (
                <span className="mini-profile-status">
                  {miniProfileCard.user.statusEmoji ? `${miniProfileCard.user.statusEmoji} ` : ''}
                  {miniProfileCard.user.statusText || 'без статуса'}
                </span>
              )}
            </div>
            <div className="mini-profile-actions">
              <button type="button" className="ghost" onClick={handleMiniProfileOpen}>Профиль</button>
              <button type="button" className="ghost mini-profile-posts" onClick={handleMiniProfileOpenPosts}>Посты</button>
              {miniProfileCard.user.username && user && miniProfileCard.user.username !== user.username && (
                <button
                  type="button"
                  className={`ghost mini-profile-follow ${miniProfileCard.user.isSubscribed ? 'active' : ''}`.trim()}
                  onClick={handleMiniProfileToggleSubscription}
                >
                  {miniProfileCard.user.isSubscribed ? 'Отписаться' : 'Подписаться'}
                </button>
              )}
              {miniProfileCard.user.username && user && miniProfileCard.user.username !== user.username && (
                <button
                  type="button"
                  className="ghost mini-profile-wave"
                  onClick={handleMiniProfileWave}
                  disabled={miniProfileDmBlocked}
                  title={miniProfileDmBlocked ? 'Direct messages are blocked by privacy settings' : 'Send wave'}
                >
                  Вейв
                </button>
              )}
              {miniProfileCard.user.username && (
                <button type="button" className="ghost mini-profile-copy" onClick={handleMiniProfileCopyUsername}>
                  Копировать @
                </button>
              )}
              {miniProfileCard.user.username && (
                <button
                  type="button"
                  className="primary"
                  onClick={handleMiniProfileMessage}
                  disabled={miniProfileDmBlocked}
                  title={miniProfileDmBlocked ? 'Direct messages are blocked by privacy settings' : 'Open chat'}
                >
                  Message
                </button>
              )}
            </div>
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
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
            title="Панель"
          >
            {icons.dashboard}
          </button>
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
              onClick={() => setView('admin')}
              title="Админ"
            >
              {icons.admin}
            </button>
          )}
          <button
            type="button"
            className={view === 'settings' ? 'active' : ''}
            onClick={() => setView('settings')}
            title="Настройки"
          >
            {icons.settings}
          </button>
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

      {forwardDialogOpen && forwardSourceMessage && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeForwardDialog()
            }
          }}
        >
          <div className="modal-card forward-modal-card">
            <h3>Переслать сообщение</h3>
            <div className="forward-preview">
              <span>Предпросмотр</span>
              <p>{getMessagePreview(forwardSourceMessage)}</p>
            </div>
            <form className="forward-form" onSubmit={handleForwardMessage}>
              <label>
                Поиск чата
                <input
                  type="text"
                  value={forwardQuery}
                  onChange={(event) => setForwardQuery(event.target.value)}
                  placeholder="Найти чат по имени или username"
                />
              </label>
              <div className="forward-list">
                {forwardConversationOptions.length === 0 && (
                  <div className="empty small">Чаты не найдены</div>
                )}
                {forwardConversationOptions.map((conversation) => (
                  <button
                    key={`forward-target-${conversation.id}`}
                    type="button"
                    className={`forward-item ${forwardConversationId === conversation.id ? 'active' : ''}`.trim()}
                    onClick={() => setForwardConversationId(conversation.id)}
                  >
                    <div>
                      <strong>{getConversationDisplayName(conversation, chatAliasByConversation)}</strong>
                      <span>
                        {conversation.isGroup
                          ? 'Групповой чат'
                          : conversation.other && conversation.other.username
                            ? `@${conversation.other.username}`
                            : 'Личный чат'}
                      </span>
                    </div>
                    {conversation.lastAt && <time>{formatTime(conversation.lastAt)}</time>}
                  </button>
                ))}
              </div>
              <label>
                Комментарий (необязательно)
                <input
                  type="text"
                  value={forwardComment}
                  onChange={(event) => setForwardComment(event.target.value)}
                  placeholder="Добавить подпись перед пересланным сообщением"
                  maxLength={1000}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => closeForwardDialog()} disabled={forwardLoading}>
                  Отмена
                </button>
                <button type="submit" className="primary" disabled={forwardLoading || !forwardConversationId}>
                  {forwardLoading ? 'Пересылаю...' : 'Переслать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <button type="button" className="ghost" onClick={closeAvatarEditor}>
                Отмена
              </button>
              <button type="button" className="primary" onClick={handleAvatarSave} disabled={loading}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {bannerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card banner-modal-card">
            <div className="banner-modal-head">
              <h3>Редактор обложки</h3>
              <span>Перетаскивай изображение, чтобы выбрать лучший ракурс.</span>
            </div>
            <div className="banner-editor-stage">
              <div
                ref={bannerPreviewRef}
                className="banner-editor-preview"
                onPointerDown={handleBannerDragStart}
                onPointerMove={handleBannerDragMove}
                onPointerUp={handleBannerDragEnd}
                onPointerCancel={handleBannerDragEnd}
                onPointerLeave={handleBannerDragEnd}
                onLostPointerCapture={handleBannerDragEnd}
              >
                <img
                  src={bannerSource}
                  alt="banner preview"
                  style={{ transform: `translate(${bannerOffset.x}px, ${bannerOffset.y}px) scale(${bannerZoom})` }}
                />
                <span className="banner-editor-guide"></span>
              </div>
            </div>
            <label className="slider">
              Масштаб обложки: {bannerZoom.toFixed(2)}x
              <input
                type="range"
                min={BANNER_ZOOM_MIN}
                max={BANNER_ZOOM_MAX}
                step="0.02"
                value={bannerZoom}
                onChange={handleBannerZoomChange}
              />
            </label>
            <div className="modal-actions banner-modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setBannerZoom(BANNER_ZOOM_MIN)
                  setBannerOffset({ x: 0, y: 0 })
                }}
              >
                Сбросить
              </button>
              <button type="button" className="ghost" onClick={closeBannerEditor}>
                Отмена
              </button>
              <button type="button" className="primary" onClick={handleBannerSave} disabled={loading}>
                Сохранить обложку
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




