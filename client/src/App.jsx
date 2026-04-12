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
  adminSetAdmin,
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
  { value: '*', label: 'Владелец' },
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

function buildProfileFormState(userData = null, fallbackRole = 'student') {
  const source = userData && typeof userData === 'object' ? userData : {}
  return {
    username: source.username || '',
    displayName: source.displayName || '',
    bio: source.bio || '',
    statusText: source.statusText || '',
    statusEmoji: source.statusEmoji || '',
    role: source.role || fallbackRole,
    showRole: source.showRole !== false && source.show_role !== false,
    themeColor: source.themeColor || '#7a1f1d'
  }
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

function extractMentions(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const matches = text.match(/@[a-zA-Z0-9_]+/g) || []
  return matches
    .map((item) => item.toLowerCase())
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

function truncateText(value, maxLength = 120) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function getFeedPostPreview(post, fallback = 'Post') {
  if (!post || typeof post !== 'object') return fallback
  const body = truncateText(post.body, 140)
  if (body) return body
  if (post.repostOf) return 'Repost without comment'
  if (post.imageUrl) return 'Media post'
  return fallback
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
const webPushFeatureFlag = String(import.meta.env.VITE_ENABLE_WEB_PUSH || 'auto').trim().toLowerCase()
const webPushFeatureEnabled = !['false', '0', 'off', 'disabled'].includes(webPushFeatureFlag)
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
const DASHBOARD_SCRATCHPAD_STORAGE_KEY = 'ktk_dashboard_scratchpad_v1'
const FEED_COMPOSER_DRAFT_STORAGE_KEY = 'ktk_feed_composer_draft_v1'
const PULSE_DISMISSED_STORAGE_KEY = 'ktk_pulse_dismissed_v1'
const APP_LANGUAGE_STORAGE_KEY = 'ktk_app_language_v1'
const CHAT_WALLPAPER_STORAGE_KEY = 'ktk_chat_wallpapers'
const CHAT_ALIAS_STORAGE_KEY = 'ktk_chat_aliases'
const RECENT_STICKERS_STORAGE_KEY = 'ktk_recent_stickers'
const RECENT_GIFS_STORAGE_KEY = 'ktk_recent_gifs'
const RECENT_EMOJIS_STORAGE_KEY = 'ktk_recent_emojis'
const UI_PREFERENCES_STORAGE_KEY = 'ktk_ui_preferences_v2'
const UI_CUSTOM_THEME_PRESETS_STORAGE_KEY = 'ktk_ui_custom_theme_presets_v1'
const UI_CUSTOM_THEME_PRESET_LIMIT = 24
const WORKSPACE_STRIP_COLLAPSED_STORAGE_KEY = 'ktk_workspace_strip_collapsed_v1'
const PROFILE_SHOWCASE_STORAGE_KEY = 'ktk_profile_showcase_v1'
const DASHBOARD_WORKBENCH_MODES = {
  focus: 'focus',
  social: 'social',
  studio: 'studio',
  ops: 'ops'
}
const DASHBOARD_WORKBENCH_MODE_OPTIONS = [
  { value: DASHBOARD_WORKBENCH_MODES.focus, label: 'Focus', labelRu: 'Фокус', hint: 'chats + priorities', hintRu: 'чаты + приоритеты' },
  { value: DASHBOARD_WORKBENCH_MODES.social, label: 'Social', labelRu: 'Соцрадар', hint: 'feed + trends', hintRu: 'лента + тренды' },
  { value: DASHBOARD_WORKBENCH_MODES.studio, label: 'Studio', labelRu: 'Студия', hint: 'compose + profile', hintRu: 'посты + профиль' },
  { value: DASHBOARD_WORKBENCH_MODES.ops, label: 'Ops', labelRu: 'Операции', hint: 'signals + sync', hintRu: 'сигналы + синхронизация' }
]

const PULSE_TABS = {
  priority: 'priority',
  chats: 'chats',
  feed: 'feed',
  profile: 'profile',
  system: 'system',
  archived: 'archived'
}

const PULSE_TAB_OPTIONS = [
  { value: PULSE_TABS.priority, label: 'Priority', labelRu: 'Приоритет', hint: 'top actions', hintRu: 'главные действия' },
  { value: PULSE_TABS.chats, label: 'Chats', labelRu: 'Чаты', hint: 'replies + drafts', hintRu: 'ответы + черновики' },
  { value: PULSE_TABS.feed, label: 'Feed', labelRu: 'Лента', hint: 'trends + mentions', hintRu: 'тренды + упоминания' },
  { value: PULSE_TABS.profile, label: 'Profile', labelRu: 'Профиль', hint: 'growth tasks', hintRu: 'рост и задачи' },
  { value: PULSE_TABS.system, label: 'System', labelRu: 'Система', hint: 'health + alerts', hintRu: 'здоровье + сигналы' },
  { value: PULSE_TABS.archived, label: 'Done', labelRu: 'Готово', hint: 'resolved items', hintRu: 'закрытые пункты' }
]
const PULSE_LANE_LABELS = {
  [PULSE_TABS.chats]: 'Чаты',
  [PULSE_TABS.feed]: 'Лента',
  [PULSE_TABS.profile]: 'Профиль',
  [PULSE_TABS.system]: 'Система'
}
const PULSE_PRIORITY_THRESHOLD = 80

function normalizeDashboardWorkbenchMode(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return Object.values(DASHBOARD_WORKBENCH_MODES).includes(normalized)
    ? normalized
    : DASHBOARD_WORKBENCH_MODES.focus
}

function normalizePulseTab(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return Object.values(PULSE_TABS).includes(normalized) ? normalized : PULSE_TABS.priority
}

function normalizeAppLanguage(value) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'ru'
}

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
const MOBILE_CHAT_QUICK_REPLIES = [
  { id: 'hello', ru: 'Привет 👋', en: 'Hey 👋' },
  { id: 'thanks', ru: 'Спасибо', en: 'Thanks' },
  { id: 'review', ru: 'Сейчас посмотрю', en: 'Checking now' },
  { id: 'later', ru: 'Напишу чуть позже', en: 'I will reply a bit later' }
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
  { value: FEED_SORT_MODES.smart, label: 'Умный' },
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
  { value: 'glass', label: 'Glass', labelRu: 'Стекло' },
  { value: 'neo', label: 'Neo', labelRu: 'Нео' },
  { value: 'classic', label: 'Classic', labelRu: 'Классика' }
]
const UI_DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', labelRu: 'Компактно' },
  { value: 'comfortable', label: 'Comfort', labelRu: 'Комфортно' },
  { value: 'spacious', label: 'Spacious', labelRu: 'Свободно' }
]
const UI_BACKDROP_OPTIONS = [
  { value: 'aurora', label: 'Aurora', labelRu: 'Аврора' },
  { value: 'studio', label: 'Studio Grid', labelRu: 'Студийная сетка' },
  { value: 'spotlight', label: 'Spotlight', labelRu: 'Софиты' },
  { value: 'bloom', label: 'Bloom', labelRu: 'Свечение' }
]
const UI_CHROME_OPTIONS = [
  { value: 'soft', label: 'Soft', labelRu: 'Мягкий' },
  { value: 'balanced', label: 'Balanced', labelRu: 'Баланс' },
  { value: 'vivid', label: 'Vivid', labelRu: 'Яркий' }
]
const UI_THEME_COLOR_PRESETS = [
  { id: 'ember', label: 'Ember', accent: '#7a1f1d', accent2: '#b64d45' },
  { id: 'ocean', label: 'Ocean', accent: '#1f4f7a', accent2: '#3f86c4' },
  { id: 'forest', label: 'Forest', accent: '#1f6b45', accent2: '#3da577' },
  { id: 'violet', label: 'Violet', accent: '#5b2d91', accent2: '#8553c6' },
  { id: 'graphite', label: 'Graphite', accent: '#3f4857', accent2: '#69778f' }
]
const UI_THEME_SCENE_PRESETS = [
  {
    id: 'aurora-deck',
    label: 'Палуба Aurora',
    hint: 'Холодные акценты для чатов и контрольных панелей.',
    theme: 'dark',
    preferences: {
      style: 'glass',
      density: 'comfortable',
      backdropMode: 'aurora',
      chrome: 'balanced',
      ambient: 64,
      radius: 20,
      lineStrength: 120,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#090f14',
      panelColor: '#111922',
      panel2Color: '#152130',
      cardColor: '#182636',
      textColor: '#eaf4ff',
      mutedColor: '#9eb4c9',
      outlineColor: '#33a9ff',
      stripeColor: '#57c6ff',
      chatAccentColor: '#33a9ff',
      feedAccentColor: '#6e79ff',
      accentColor: '#2f9dff',
      accent2Color: '#78d2ff'
    }
  },
  {
    id: 'ember-studio',
    label: 'Студия Ember',
    hint: 'Тёплый контрастный вид для сессий с упором на ленту.',
    theme: 'dark',
    preferences: {
      style: 'neo',
      density: 'compact',
      backdropMode: 'spotlight',
      chrome: 'vivid',
      ambient: 56,
      radius: 18,
      lineStrength: 132,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#130c0b',
      panelColor: '#1d1312',
      panel2Color: '#271916',
      cardColor: '#2e1d1a',
      textColor: '#fff2ea',
      mutedColor: '#cab0a4',
      outlineColor: '#ff8c55',
      stripeColor: '#f4a36f',
      chatAccentColor: '#f06f3c',
      feedAccentColor: '#ad5aff',
      accentColor: '#f06f3c',
      accent2Color: '#f7b068'
    }
  },
  {
    id: 'mint-canvas',
    label: 'Мятный холст',
    hint: 'Минималистичная тёмная палитра с чистыми зелёными акцентами.',
    theme: 'dark',
    preferences: {
      style: 'classic',
      density: 'comfortable',
      backdropMode: 'studio',
      chrome: 'soft',
      ambient: 48,
      radius: 16,
      lineStrength: 96,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#0a1110',
      panelColor: '#111a18',
      panel2Color: '#14211f',
      cardColor: '#172825',
      textColor: '#e8fff8',
      mutedColor: '#9dbab1',
      outlineColor: '#2fc090',
      stripeColor: '#30d5a8',
      chatAccentColor: '#2fc090',
      feedAccentColor: '#6a8cff',
      accentColor: '#2fc090',
      accent2Color: '#72e0b8'
    }
  },
  {
    id: 'clean-light',
    label: 'Чистый свет',
    hint: 'Светлый режим со спокойными карточками и чёткими границами.',
    theme: 'light',
    preferences: {
      style: 'glass',
      density: 'spacious',
      backdropMode: 'bloom',
      chrome: 'balanced',
      ambient: 36,
      radius: 20,
      lineStrength: 86,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#f3f6fc',
      panelColor: '#ffffff',
      panel2Color: '#edf2fa',
      cardColor: '#ffffff',
      textColor: '#1a2635',
      mutedColor: '#617186',
      outlineColor: '#2f5dff',
      stripeColor: '#5d8dff',
      chatAccentColor: '#2f5dff',
      feedAccentColor: '#ff6e6b',
      accentColor: '#2f5dff',
      accent2Color: '#5d8dff'
    }
  },
  {
    id: 'night-lounge',
    label: 'Ночной лаунж',
    hint: 'Глубокий тёмный фон с мягким неоном и более премиальным chrome-слоем.',
    theme: 'dark',
    preferences: {
      style: 'glass',
      density: 'spacious',
      backdropMode: 'aurora',
      chrome: 'vivid',
      ambient: 72,
      radius: 24,
      lineStrength: 118,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#070d18',
      panelColor: '#10192a',
      panel2Color: '#15223a',
      cardColor: '#132035',
      textColor: '#f3f8ff',
      mutedColor: '#9db0cf',
      outlineColor: '#68b4ff',
      stripeColor: '#8f6dff',
      chatAccentColor: '#55c7ff',
      feedAccentColor: '#8f6dff',
      accentColor: '#4ba0ff',
      accent2Color: '#8f6dff'
    }
  },
  {
    id: 'editorial-sun',
    label: 'Editorial Sun',
    hint: 'Тёплый светлый режим с мягким bloom-фоном и спокойным chrome-слоем.',
    theme: 'light',
    preferences: {
      style: 'classic',
      density: 'comfortable',
      backdropMode: 'bloom',
      chrome: 'soft',
      ambient: 42,
      radius: 26,
      lineStrength: 82,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      bgColor: '#f6efe6',
      panelColor: '#fffdf8',
      panel2Color: '#f5eee4',
      cardColor: '#fffaf2',
      textColor: '#1d2a38',
      mutedColor: '#7a6e62',
      outlineColor: '#e59f42',
      stripeColor: '#f0bc74',
      chatAccentColor: '#d88e43',
      feedAccentColor: '#d46d6d',
      accentColor: '#d88e43',
      accent2Color: '#f0bc74'
    }
  }
]
const PROFILE_VISUAL_SCENE_PRESETS = [
  {
    id: 'frost-neon',
    label: 'Морозный неон',
    hint: 'Холодный баннер + неон в карточке профиля.',
    themeColor: '#2d68ff',
    heroTheme: 'neon'
  },
  {
    id: 'sunset-warm',
    label: 'Тёплый закат',
    hint: 'Теплый акцент для баннера и мягкий градиент.',
    themeColor: '#d46a2c',
    heroTheme: 'sunset'
  },
  {
    id: 'forest-deep',
    label: 'Глубокий лес',
    hint: 'Сдержанный зеленый стиль с чистой читабельностью.',
    themeColor: '#1b7a4f',
    heroTheme: 'forest'
  },
  {
    id: 'ocean-calm',
    label: 'Спокойный океан',
    hint: 'Спокойный синий стиль для повседневного профиля.',
    themeColor: '#1f4f7a',
    heroTheme: 'ocean'
  },
  {
    id: 'classic-ruby',
    label: 'Классический рубин',
    hint: 'Классический фирменный вид.',
    themeColor: '#7a1f1d',
    heroTheme: 'default'
  }
]
const THEME_PACK_VERSION = 1
const THEME_PACK_KIND = 'ktk-ui-theme'
const DEFAULT_UI_PREFERENCES = {
  style: 'classic',
  density: 'comfortable',
  backdropMode: 'studio',
  chrome: 'soft',
  ambient: 24,
  radius: 16,
  lineStrength: 72,
  syncAccent: false,
  outlineMode: 'auto',
  customPalette: false,
  glowEnabled: false,
  bgColor: '#101418',
  panelColor: '#151a20',
  panel2Color: '#1b2128',
  cardColor: '#1f262e',
  textColor: '#ecf1f7',
  mutedColor: '#9aa6b2',
  outlineColor: '#667281',
  stripeColor: '#4c5969',
  chatAccentColor: '#5f7085',
  feedAccentColor: '#6b7280',
  accentColor: '#4b5563',
  accent2Color: '#6b7280'
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
const MOBILE_CHAT_LAYOUT_BREAKPOINT = 860
const CHAT_ITEM_SWIPE_ACTION_WIDTH = 136
const CHAT_ITEM_SWIPE_OPEN_THRESHOLD = 54
const CHAT_ITEM_SWIPE_ACTIVATE_THRESHOLD = 12
const MOBILE_KEYBOARD_OPEN_THRESHOLD = 72
const INITIAL_CHAT_LIST_SWIPE_STATE = {
  conversationId: '',
  offset: 0,
  dragging: false
}
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

function formatHexColorLabel(value, fallback = '#7a1f1d') {
  return normalizeHexColor(value, fallback).toUpperCase()
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
  const backdropMode = UI_BACKDROP_OPTIONS.some((item) => item.value === source.backdropMode)
    ? source.backdropMode
    : DEFAULT_UI_PREFERENCES.backdropMode
  const chrome = UI_CHROME_OPTIONS.some((item) => item.value === source.chrome)
    ? source.chrome
    : DEFAULT_UI_PREFERENCES.chrome
  const ambient = clampNumber(source.ambient, 0, 100)
  const radius = clampNumber(source.radius, 12, 36)
  const lineStrength = clampNumber(source.lineStrength, 35, 180)
  const syncAccent = source.syncAccent !== false
  const outlineMode = source.outlineMode === 'custom' ? 'custom' : 'auto'
  const customPalette = source.customPalette === true
  const glowEnabled = source.glowEnabled !== false
  const bgColor = normalizeHexColor(source.bgColor, DEFAULT_UI_PREFERENCES.bgColor)
  const panelColor = normalizeHexColor(source.panelColor, DEFAULT_UI_PREFERENCES.panelColor)
  const panel2Color = normalizeHexColor(source.panel2Color, DEFAULT_UI_PREFERENCES.panel2Color)
  const cardColor = normalizeHexColor(source.cardColor, DEFAULT_UI_PREFERENCES.cardColor)
  const textColor = normalizeHexColor(source.textColor, DEFAULT_UI_PREFERENCES.textColor)
  const mutedColor = normalizeHexColor(source.mutedColor, DEFAULT_UI_PREFERENCES.mutedColor)
  const outlineColor = normalizeHexColor(source.outlineColor, DEFAULT_UI_PREFERENCES.outlineColor)
  const stripeColor = normalizeHexColor(source.stripeColor, DEFAULT_UI_PREFERENCES.stripeColor)
  const chatAccentColor = normalizeHexColor(source.chatAccentColor, DEFAULT_UI_PREFERENCES.chatAccentColor)
  const feedAccentColor = normalizeHexColor(source.feedAccentColor, DEFAULT_UI_PREFERENCES.feedAccentColor)
  const accentColor = normalizeHexColor(source.accentColor, DEFAULT_UI_PREFERENCES.accentColor)
  const accent2Color = normalizeHexColor(source.accent2Color, DEFAULT_UI_PREFERENCES.accent2Color)
  return {
    style,
    density,
    backdropMode,
    chrome,
    ambient,
    radius,
    lineStrength,
    syncAccent,
    outlineMode,
    customPalette,
    glowEnabled,
    bgColor,
    panelColor,
    panel2Color,
    cardColor,
    textColor,
    mutedColor,
    outlineColor,
    stripeColor,
    chatAccentColor,
    feedAccentColor,
    accentColor,
    accent2Color
  }
}

function normalizeUiThemePresetName(value, fallback = 'My theme') {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 32)
  return normalized || fallback
}

function normalizeUiCustomThemePresets(value) {
  if (!Array.isArray(value)) return []
  const usedIds = new Set()
  const normalized = []
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    if (!item || typeof item !== 'object') continue
    const rawId = String(item.id || '').trim()
    const id = rawId || `ui-preset-${index + 1}`
    if (usedIds.has(id)) continue
    usedIds.add(id)
    const name = normalizeUiThemePresetName(item.name, `Theme ${normalized.length + 1}`)
    const preferences = normalizeUiPreferences(item.preferences)
    const createdAt = String(item.createdAt || item.created_at || '').trim() || new Date().toISOString()
    const updatedAt = String(item.updatedAt || item.updated_at || '').trim() || createdAt
    normalized.push({ id, name, preferences, createdAt, updatedAt })
    if (normalized.length >= UI_CUSTOM_THEME_PRESET_LIMIT) break
  }
  return normalized
}

function normalizeImportedThemePack(value) {
  if (!value || typeof value !== 'object') return null
  const rawTheme = String(value.theme || '').trim().toLowerCase()
  const theme = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : null
  const uiPreferences = normalizeUiPreferences(value.uiPreferences)
  const customPresets = normalizeUiCustomThemePresets(value.customPresets)
  const rawProfile = value.profile && typeof value.profile === 'object' ? value.profile : null
  const profile = rawProfile
    ? {
      themeColor: normalizeHexColor(rawProfile.themeColor, '#7a1f1d'),
      heroTheme: PROFILE_HERO_THEMES.some((item) => item.value === rawProfile.heroTheme)
        ? rawProfile.heroTheme
        : DEFAULT_PROFILE_SHOWCASE.heroTheme
    }
    : null
  const kind = String(value.kind || '').trim()
  const version = Number(value.version) || 1
  return {
    kind,
    version,
    theme,
    uiPreferences,
    customPresets,
    profile
  }
}

function buildUiThemePackPayload(theme, uiPreferences, customPresets, profile) {
  const safeTheme = theme === 'light' || theme === 'dark' ? theme : 'dark'
  const safeProfile = profile && typeof profile === 'object'
    ? {
      themeColor: normalizeHexColor(profile.themeColor, '#7a1f1d'),
      heroTheme: PROFILE_HERO_THEMES.some((item) => item.value === profile.heroTheme)
        ? profile.heroTheme
        : DEFAULT_PROFILE_SHOWCASE.heroTheme
    }
    : null
  return {
    kind: THEME_PACK_KIND,
    version: THEME_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    theme: safeTheme,
    uiPreferences: normalizeUiPreferences(uiPreferences),
    customPresets: normalizeUiCustomThemePresets(customPresets),
    profile: safeProfile
  }
}

function areUiPreferencesEqual(left, right) {
  const a = normalizeUiPreferences(left)
  const b = normalizeUiPreferences(right)
  return (
    a.style === b.style &&
    a.density === b.density &&
    a.backdropMode === b.backdropMode &&
    a.chrome === b.chrome &&
    a.ambient === b.ambient &&
    a.radius === b.radius &&
    a.lineStrength === b.lineStrength &&
    a.syncAccent === b.syncAccent &&
    a.outlineMode === b.outlineMode &&
    a.customPalette === b.customPalette &&
    a.glowEnabled === b.glowEnabled &&
    a.bgColor === b.bgColor &&
    a.panelColor === b.panelColor &&
    a.panel2Color === b.panel2Color &&
    a.cardColor === b.cardColor &&
    a.textColor === b.textColor &&
    a.mutedColor === b.mutedColor &&
    a.outlineColor === b.outlineColor &&
    a.stripeColor === b.stripeColor &&
    a.chatAccentColor === b.chatAccentColor &&
    a.feedAccentColor === b.feedAccentColor &&
    a.accentColor === b.accentColor &&
    a.accent2Color === b.accent2Color
  )
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
      message: 'Системные уведомления недоступны: у домена некорректный HTTPS-сертификат.'
    }
  }
  if (lower.includes('failed to register a serviceworker') || lower.includes('serviceworker')) {
    return {
      supported: false,
      message: 'Системные уведомления недоступны: не удалось зарегистрировать service worker.'
    }
  }
  return {
    supported: true,
    message: rawMessage || 'Не удалось настроить уведомления.'
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
    ...buildProfileFormState()
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [settingsSection, setSettingsSection] = useState('general')
  const [settingsNavQuery, setSettingsNavQuery] = useState('')
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
  const [appLanguage, setAppLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'ru'
    try {
      return normalizeAppLanguage(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY))
    } catch (err) {
      return 'ru'
    }
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
  const [uiCustomThemePresets, setUiCustomThemePresets] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const parsed = JSON.parse(localStorage.getItem(UI_CUSTOM_THEME_PRESETS_STORAGE_KEY) || '[]')
      return normalizeUiCustomThemePresets(parsed)
    } catch (err) {
      return []
    }
  })
  const [uiCustomPresetName, setUiCustomPresetName] = useState('')
  const [appearanceImportJson, setAppearanceImportJson] = useState('')
  const [workspaceStripCollapsed, setWorkspaceStripCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(WORKSPACE_STRIP_COLLAPSED_STORAGE_KEY) === '1'
    } catch (err) {
      return false
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
  const isEnglishUi = appLanguage === 'en'
  const uiText = (ruText, enText) => (isEnglishUi ? enText : ruText)
  const getUiStyleLabel = (value) => {
    const option = UI_STYLE_OPTIONS.find((item) => item.value === value)
    return option ? (isEnglishUi ? option.label : option.labelRu || option.label) : value
  }
  const getUiDensityLabel = (value) => {
    const option = UI_DENSITY_OPTIONS.find((item) => item.value === value)
    return option ? (isEnglishUi ? option.label : option.labelRu || option.label) : value
  }
  const getUiBackdropLabel = (value) => {
    const option = UI_BACKDROP_OPTIONS.find((item) => item.value === value)
    return option ? (isEnglishUi ? option.label : option.labelRu || option.label) : value
  }
  const getUiChromeLabel = (value) => {
    const option = UI_CHROME_OPTIONS.find((item) => item.value === value)
    return option ? (isEnglishUi ? option.label : option.labelRu || option.label) : value
  }
  const getWorkbenchModeLabel = (item) => (isEnglishUi ? item.label : item.labelRu || item.label)
  const getWorkbenchModeHint = (item) => (isEnglishUi ? item.hint : item.hintRu || item.hint)
  const getPulseTabLabel = (item) => (isEnglishUi ? item.label : item.labelRu || item.label)

  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
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
        autoRefresh: false,
        workbenchMode: DASHBOARD_WORKBENCH_MODES.focus
      }
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY) || '{}')
      return {
        focusMode: parsed && parsed.focusMode === true,
        autoRefresh: parsed && parsed.autoRefresh === true,
        workbenchMode: normalizeDashboardWorkbenchMode(parsed && parsed.workbenchMode)
      }
    } catch (err) {
      return {
        focusMode: false,
        autoRefresh: false,
        workbenchMode: DASHBOARD_WORKBENCH_MODES.focus
      }
    }
  })
  const [dashboardScratchpad, setDashboardScratchpad] = useState(() => {
    if (typeof window === 'undefined') return ''
    try {
      return String(localStorage.getItem(DASHBOARD_SCRATCHPAD_STORAGE_KEY) || '')
    } catch (err) {
      return ''
    }
  })
  const [dashboardLastRefreshAt, setDashboardLastRefreshAt] = useState(null)
  const [pulseTab, setPulseTab] = useState(PULSE_TABS.priority)
  const [pulseDismissedItemIds, setPulseDismissedItemIds] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const parsed = JSON.parse(localStorage.getItem(PULSE_DISMISSED_STORAGE_KEY) || '[]')
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 200)
        : []
    } catch (err) {
      return []
    }
  })
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
  const [postText, setPostText] = useState(() => {
    if (typeof window === 'undefined') return ''
    try {
      const parsed = JSON.parse(localStorage.getItem(FEED_COMPOSER_DRAFT_STORAGE_KEY) || '{}')
      return typeof parsed.text === 'string' ? parsed.text : ''
    } catch (err) {
      return ''
    }
  })
  const [feedComposerDraftSavedAt, setFeedComposerDraftSavedAt] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const parsed = JSON.parse(localStorage.getItem(FEED_COMPOSER_DRAFT_STORAGE_KEY) || '{}')
      return parsed && parsed.savedAt ? parsed.savedAt : null
    } catch (err) {
      return null
    }
  })
  const [postFile, setPostFile] = useState(null)
  const [postPreview, setPostPreview] = useState('')
  const [feedComposerFocusTick, setFeedComposerFocusTick] = useState(0)
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
  const [chatListSwipe, setChatListSwipe] = useState({ ...INITIAL_CHAT_LIST_SWIPE_STATE })
  const [composerFocusWithin, setComposerFocusWithin] = useState(false)
  const [mobileKeyboardInset, setMobileKeyboardInset] = useState(0)
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
  const [adminWorkspaceTab, setAdminWorkspaceTab] = useState('overview')
  const [adminUserFilter, setAdminUserFilter] = useState('all')
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
  const chatListSwipeStateRef = useRef({ ...INITIAL_CHAT_LIST_SWIPE_STATE })
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
  const feedComposerTextareaRef = useRef(null)
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
  const appearanceImportInputRef = useRef(null)
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
  const chatListSwipeGestureRef = useRef({
    conversationId: '',
    startX: 0,
    startY: 0,
    startOffset: 0,
    active: false,
    horizontal: false
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
  const activeProfileVisualSceneId = useMemo(() => {
    const activeHeroTheme = PROFILE_HERO_THEMES.some((item) => item.value === profileShowcaseForm.heroTheme)
      ? profileShowcaseForm.heroTheme
      : DEFAULT_PROFILE_SHOWCASE.heroTheme
    const match = PROFILE_VISUAL_SCENE_PRESETS.find((scene) => (
      normalizeHexColor(scene.themeColor, '#7a1f1d') === normalizedThemeColor &&
      scene.heroTheme === activeHeroTheme
    ))
    return match ? match.id : ''
  }, [normalizedThemeColor, profileShowcaseForm.heroTheme])
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
  const activeConversationEmptyPrompts = useMemo(() => {
    if (!activeConversation) return []
    if (activeConversation.isGroup) {
      return [
        {
          id: 'group-kickoff',
          label: uiText('Старт обсуждения', 'Start thread'),
          template: uiText('Привет! Давайте быстро синхронизируемся по задачам на сегодня.', 'Hey! Let us quickly align on today priorities.')
        },
        {
          id: 'group-plan',
          label: uiText('Собрать план', 'Build plan'),
          template: uiText('Предлагаю коротко зафиксировать план и ответственных.', 'I suggest we briefly lock the plan and owners.')
        },
        {
          id: 'group-time',
          label: uiText('Сверить время', 'Check timing'),
          template: uiText('Когда всем удобно вернуться к этому вопросу?', 'When is a good time for everyone to return to this?')
        }
      ]
    }
    return [
      {
        id: 'dm-hello',
        label: uiText('Поздороваться', 'Say hi'),
        template: uiText('Привет! Как тебе удобно продолжить разговор?', 'Hey! What is the easiest way for you to continue this?')
      },
      {
        id: 'dm-review',
        label: uiText('Дать апдейт', 'Share update'),
        template: uiText('Я посмотрю детали и вернусь с ответом чуть позже.', 'I will check the details and get back to you shortly.')
      },
      {
        id: 'dm-sync',
        label: uiText('Сверить детали', 'Sync details'),
        template: uiText('Давай быстро сверим детали, чтобы не потерять контекст.', 'Let us quickly align on the details so we do not lose context.')
      }
    ]
  }, [activeConversation, isEnglishUi])
  const isMobileComposerDocked = Boolean(
    activeConversation &&
    view === 'chats' &&
    chatMobilePane === 'chat' &&
    composerFocusWithin &&
    mobileKeyboardInset >= MOBILE_KEYBOARD_OPEN_THRESHOLD
  )
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
  const mobileChatQuickReplies = useMemo(() => {
    if (!activeConversation || isChatBlocked || messageFile || pollComposerOpen) return []
    if (String(messageText || '').trim().length > 0) return []
    return MOBILE_CHAT_QUICK_REPLIES.map((item) => ({
      id: item.id,
      label: isEnglishUi ? item.en : item.ru
    }))
  }, [activeConversation, isChatBlocked, isEnglishUi, messageFile, messageText, pollComposerOpen])
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
  const feedComposerProgress = useMemo(() => {
    const target = 280
    const chars = Number(feedComposerInsights.chars || 0)
    return {
      target,
      value: Math.min(100, Math.round((chars / target) * 100)),
      label: chars === 0
        ? 'Черновик пуст'
        : chars <= 120
          ? 'Короткий импульс'
          : chars <= target
            ? 'Комфортная длина'
            : 'Длинный пост'
    }
  }, [feedComposerInsights.chars])
  const feedComposerDraftLabel = useMemo(() => (
    feedComposerDraftSavedAt ? `Черновик сохранён в ${formatTime(feedComposerDraftSavedAt)}` : 'Автосохранение ждёт текст'
  ), [feedComposerDraftSavedAt])
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
  const feedComposerPromptOptions = useMemo(() => {
    const hottestTag = trendingTags[0] ? trendingTags[0].tag : '#campus'
    return [
      { id: 'status', label: 'Статус', text: 'Короткий апдейт дня:\n- что сделал\n- что дальше\n- где нужен фидбек' },
      { id: 'question', label: 'Вопрос', text: `Есть вопрос к сообществу по теме ${hottestTag}:` },
      { id: 'showcase', label: 'Showcase', text: 'Показываю свежий прогресс по проекту:\n- идея\n- результат\n- следующий шаг' },
      { id: 'collab', label: 'Коллаб', text: 'Ищу напарника / команду для задачи:\n- направление\n- стек\n- формат участия' }
    ]
  }, [trendingTags])
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
  const dashboardWorkbenchMode = normalizeDashboardWorkbenchMode(dashboardPreferences.workbenchMode)
  const dashboardQuickActions = useMemo(() => {
    return [
      {
        id: 'unread',
        title: 'Непрочитанные чаты',
        subtitle: unreadConversationCount > 0 ? `${unreadConversationCount} диалогов` : 'Чисто',
        icon: '💬',
        accent: unreadConversationCount > 0 ? 'warn' : 'ok',
        action: 'unread'
      },
      {
        id: 'hot-feed',
        title: 'Горячая лента',
        subtitle: hotFeedPosts[0] ? `${hotFeedPosts.length} постов в радаре` : 'Пока тихо',
        icon: '🔥',
        accent: hotFeedPosts[0] ? 'hot' : 'neutral',
        action: 'feed-hot'
      },
      {
        id: 'compose',
        title: 'Быстрый пост',
        subtitle: String(postText || '').trim() ? 'Есть черновик' : 'Открыть composer',
        icon: '✍️',
        accent: String(postText || '').trim() ? 'accent' : 'neutral',
        action: 'compose'
      },
      {
        id: 'resume-chat',
        title: 'Вернуться в чат',
        subtitle: activeConversation ? getConversationDisplayName(activeConversation, chatAliasByConversation) : 'Выбери диалог',
        icon: '🧭',
        accent: activeConversation ? 'accent' : 'neutral',
        action: 'resume-chat'
      },
      {
        id: 'profile-lab',
        title: 'Профиль',
        subtitle: `${profileEditorScore}% готовности`,
        icon: '🛠️',
        accent: profileEditorScore >= 80 ? 'ok' : 'neutral',
        action: 'profile'
      },
      {
        id: 'refresh',
        title: 'Синхронизировать',
        subtitle: dashboardLastRefreshAt ? `Последнее: ${formatTime(dashboardLastRefreshAt)}` : 'Обновить снимок',
        icon: '↻',
        accent: dashboardRefreshLoading ? 'warn' : 'neutral',
        action: 'refresh'
      }
    ]
  }, [
    unreadConversationCount,
    hotFeedPosts,
    profileEditorScore,
    activeConversation,
    chatAliasByConversation,
    postText,
    dashboardLastRefreshAt,
    dashboardRefreshLoading
  ])
  const dashboardMissionSignals = useMemo(() => ([
    {
      id: 'workspace',
      label: 'Индекс пространства',
      value: `${dashboardWorkspaceScore}%`
    },
    {
      id: 'unread',
      label: 'Непрочитанные',
      value: unreadMessagesCount > 0 ? `${unreadMessagesCount} сообщ.` : 'чисто'
    },
    {
      id: 'feed',
      label: 'Свежая лента',
      value: feedDigest.freshCount > 0 ? `${feedDigest.freshCount} новых` : 'ровно'
    },
    {
      id: 'profile',
      label: 'Профиль',
      value: `${profileEditorScore}%`
    }
  ]), [dashboardWorkspaceScore, unreadMessagesCount, feedDigest.freshCount, profileEditorScore])
  const dashboardScratchpadTemplates = useMemo(() => {
    const hottestTag = trendingTags[0] ? trendingTags[0].tag : '#campus'
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.social) {
      return [
        `Поймать тему ${hottestTag}`,
        'Кого отметить в новом посте?',
        'Что обсудить с сообществом сегодня?'
      ]
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.studio) {
      return [
        'Идея поста: показать прогресс по проекту',
        'Профиль: что ещё не заполнено?',
        'Что вынести в заголовок Showcase?'
      ]
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.ops) {
      return [
        'Проверить realtime и push',
        'Сверить здоровье сервиса и снимок присутствия',
        'Есть ли сигналы, которые нужно закрыть?'
      ]
    }
    return [
      'Кому ответить в первую очередь?',
      'Какой диалог требует продолжения?',
      `Нужен ли быстрый заход в ${hottestTag}?`
    ]
  }, [dashboardWorkbenchMode, trendingTags])
  const dashboardWorkbenchCards = useMemo(() => {
    const hottestTag = trendingTags[0] || null
    const topConversation = dashboardTopConversations[0] || null
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.social) {
      return [
        {
          id: 'social-hot',
          eyebrow: 'Импульс',
          title: hotFeedPosts[0] ? `Открыть хайп: ${hotFeedPosts[0].post.author.displayName || hotFeedPosts[0].post.author.username}` : 'Разогреть ленту',
          text: hotFeedPosts[0] ? `${hotFeedPosts[0].score} очков вовлечения` : 'Сейчас можно зайти в общую ленту и задать темп.',
          action: 'feed-hot'
        },
        {
          id: 'social-tag',
          eyebrow: 'Тренд',
          title: hottestTag ? hottestTag.tag : 'Тренд ещё не сформирован',
          text: hottestTag ? `${hottestTag.count} упоминаний в постах` : 'Подожди пару публикаций или создай тему сам.',
          action: hottestTag ? 'tag' : 'compose',
          payload: hottestTag ? { tag: hottestTag.tag } : { template: 'Есть идея для новой темы в ленте:' }
        },
        {
          id: 'social-bookmarks',
          eyebrow: 'Библиотека',
          title: 'Поднять сохранённые посты',
          text: bookmarkedPostIds.size > 0 ? `${bookmarkedPostIds.size} материалов уже в закладках` : 'Сохрани полезные посты для быстрого возврата.',
          action: 'bookmarks'
        }
      ]
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.studio) {
      return [
        {
          id: 'studio-compose',
          eyebrow: 'Пост',
          title: String(postText || '').trim() ? 'Продолжить черновик поста' : 'Открыть быстрый редактор',
          text: String(postText || '').trim() ? `${String(postText || '').trim().length} символов уже набрано` : 'Собери короткий апдейт или витринный пост.',
          action: 'compose'
        },
        {
          id: 'studio-profile',
          eyebrow: 'Профиль',
          title: 'Прокачать публичный образ',
          text: profileEditorPendingChecklist[0] ? profileEditorPendingChecklist[0].label : 'Профиль выглядит завершённым.',
          action: 'profile'
        },
        {
          id: 'studio-mine',
          eyebrow: 'Архив',
          title: 'Разобрать свои публикации',
          text: feedMetrics.mine > 0 ? `${feedMetrics.mine} постов уже в архиве` : 'Пока нет своих постов. Самое время начать.',
          action: 'mine-posts'
        }
      ]
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.ops) {
      return [
        {
          id: 'ops-health',
          eyebrow: 'Состояние',
          title: health && health.ok ? 'Сервис отвечает стабильно' : 'Проверить состояние сервера',
          text: health && health.ok ? 'Можно обновить снимок и убедиться, что всё синхронизировано.' : 'Есть смысл вручную обновить данные прямо сейчас.',
          action: 'refresh'
        },
        {
          id: 'ops-push',
          eyebrow: 'Уведомления',
          title: pushState.enabled ? 'Push активен' : 'Синхронизировать push',
          text: pushState.enabled ? 'Уведомления готовы к работе.' : (pushState.error || 'Проверь push-состояние и разрешения.'),
          action: 'push'
        },
        {
          id: 'ops-chat',
          eyebrow: 'Очередь',
          title: topConversation ? getConversationDisplayName(topConversation, chatAliasByConversation) : 'Открыть список диалогов',
          text: topConversation ? (topConversation.lastMessage || 'Перейти к приоритетному чату') : 'Нет активного диалога для быстрого возврата.',
          action: topConversation ? 'resume-chat' : 'unread'
        }
      ]
    }
    return [
      {
        id: 'focus-unread',
        eyebrow: 'Входящие',
        title: unreadConversationCount > 0 ? 'Разобрать непрочитанные диалоги' : 'Диалоги под контролем',
        text: unreadConversationCount > 0 ? `${unreadConversationCount} чатов ждут ответа` : 'Можно переключиться на ленту или публикацию.',
        action: 'unread'
      },
      {
        id: 'focus-drafts',
        eyebrow: 'Черновики',
        title: dashboardDraftQueue.length > 0 ? 'Вернуться к черновикам' : 'Новых черновиков нет',
        text: dashboardDraftQueue.length > 0 ? `${dashboardDraftQueue.length} разговоров с набранным текстом` : 'Сейчас можно закрыть другие хвосты.',
        action: dashboardDraftQueue.length > 0 ? 'drafts' : 'compose'
      },
      {
        id: 'focus-chat',
        eyebrow: 'Следующий шаг',
        title: topConversation ? getConversationDisplayName(topConversation, chatAliasByConversation) : 'Открыть активный чат',
        text: topConversation ? (topConversation.lastMessage || 'Открыть диалог') : 'Выбери разговор и продолжи поток.',
        action: topConversation ? 'resume-chat' : 'chats'
      }
    ]
  }, [
    dashboardWorkbenchMode,
    trendingTags,
    hotFeedPosts,
    bookmarkedPostIds.size,
    postText,
    profileEditorPendingChecklist,
    feedMetrics.mine,
    health && health.ok,
    pushState.enabled,
    pushState.error,
    dashboardDraftQueue.length,
    unreadConversationCount,
    dashboardTopConversations,
    chatAliasByConversation
  ])
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
  const dashboardWorkbenchSummary = useMemo(() => {
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.social) {
      return {
        title: 'Соцрадар',
        description: 'Следи за горячей лентой, трендами и вовлечением без лишнего шума.',
        badge: hotFeedPosts[0] ? `${hotFeedPosts.length} горячих постов` : 'спокойный поток'
      }
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.studio) {
      return {
        title: 'Студия',
        description: 'Собирай публикации, докручивай профиль и веди заметки в одном месте.',
        badge: String(postText || '').trim() ? 'черновик в работе' : 'готово к публикации'
      }
    }
    if (dashboardWorkbenchMode === DASHBOARD_WORKBENCH_MODES.ops) {
      return {
        title: 'Операции',
        description: 'Контролируй realtime, push и health, пока сервис держится в тонусе.',
        badge: dashboardSystemAlerts.length > 0 ? `${dashboardSystemAlerts.length} сигналов` : 'всё стабильно'
      }
    }
    return {
      title: 'Фокус',
      description: 'Быстрый доступ к приоритетным чатам, свежим задачам и следующему шагу.',
      badge: unreadConversationCount > 0 ? `${unreadConversationCount} чатов требуют внимания` : 'очередь под контролем'
    }
  }, [dashboardWorkbenchMode, hotFeedPosts, postText, dashboardSystemAlerts.length, unreadConversationCount])
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
  const pulseDismissedIdSet = useMemo(() => (
    new Set(pulseDismissedItemIds.map((item) => String(item || '').trim()).filter(Boolean))
  ), [pulseDismissedItemIds])
  const pulseMentionPosts = useMemo(() => {
    if (!user || !user.username) return []
    const targetMention = `@${String(user.username || '').trim().toLowerCase()}`
    if (!targetMention || targetMention === '@') return []
    return [...posts]
      .filter((post) => {
        if (!post || !post.id) return false
        if (post.author && user.id && post.author.id === user.id) return false
        return extractMentions(post.body).includes(targetMention)
      })
      .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
      .slice(0, 4)
  }, [posts, user ? user.id : null, user ? user.username : ''])
  const pulseRawItems = useMemo(() => {
    const items = []

    dashboardTopConversations
      .filter((conversation) => conversation.unreadCount > 0)
      .slice(0, 5)
      .forEach((conversation, index) => {
        items.push({
          id: `chat-unread-${conversation.id}`,
          lane: PULSE_TABS.chats,
          priority: Math.min(98, 84 + Math.min(12, conversation.unreadCount * 2) - index),
          title: conversation.title,
          text: truncateText(conversation.lastMessage || 'Открой диалог и продолжи переписку.', 120),
          timestamp: conversation.lastAt || null,
          meta: `${conversation.unreadCount} непрочитанных`,
          actionId: 'open-conversation',
          payload: { conversationId: conversation.id },
          cta: 'Открыть чат',
          tone: conversation.unreadCount >= 4 ? 'warn' : 'accent',
          badges: [
            'Непрочитано',
            conversation.online ? 'Онлайн' : '',
            conversation.isFavorite ? 'Избранный чат' : ''
          ].filter(Boolean)
        })
      })

    dashboardDraftQueue.forEach((conversation, index) => {
      items.push({
        id: `chat-draft-${conversation.id}`,
        lane: PULSE_TABS.chats,
        priority: 74 - index,
        title: `Черновик в ${conversation.title}`,
        text: truncateText(conversation.draftText || 'Продолжи сохранённый черновик.', 120),
        timestamp: conversation.lastAt || null,
        meta: 'Локальный черновик',
        actionId: 'open-conversation',
        payload: { conversationId: conversation.id },
        cta: 'Продолжить',
        tone: 'neutral',
        badges: ['Черновик']
      })
    })

    if (String(postText || '').trim()) {
      items.push({
        id: 'feed-composer-draft',
        lane: PULSE_TABS.feed,
        priority: 72,
        title: 'Черновик поста ждёт',
        text: truncateText(postText, 130),
        timestamp: feedComposerDraftSavedAt || null,
        meta: feedComposerDraftSavedAt ? `Сохранено ${formatRelativeFeedAge(feedComposerDraftSavedAt)}` : 'Сохранено локально',
        actionId: 'open-compose',
        payload: null,
        cta: 'Продолжить',
        tone: 'accent',
        badges: [`${String(postText || '').trim().length} симв.`]
      })
    }

    hotFeedPosts.slice(0, 4).forEach((entry, index) => {
      const post = entry && entry.post ? entry.post : null
      if (!post || !post.id) return
      const authorLabel = post.author?.displayName || post.author?.username || 'Автор'
      items.push({
        id: `feed-hot-${post.id}`,
        lane: PULSE_TABS.feed,
        priority: Math.max(68, 86 - (index * 3)),
        title: `Горячая лента: ${authorLabel}`,
        text: getFeedPostPreview(post, 'Открой горячий поток в ленте.'),
        timestamp: post.createdAt || null,
        meta: `${entry.score} очков вовлечения`,
        actionId: 'open-feed-hot',
        payload: { authorId: post.author?.id || '' },
        cta: 'Открыть ленту',
        tone: 'accent',
        badges: [
          (extractHashtags(post.body)[0] || '').trim(),
          post.imageUrl ? 'Медиа' : ''
        ].filter(Boolean)
      })
    })

    pulseMentionPosts.forEach((post, index) => {
      const authorLabel = post.author?.displayName || post.author?.username || 'Автор'
      items.push({
        id: `feed-mention-${post.id}`,
        lane: PULSE_TABS.feed,
        priority: Math.max(70, 83 - (index * 3)),
        title: `Упоминание от ${authorLabel}`,
        text: getFeedPostPreview(post, 'Тебя упомянули в ленте.'),
        timestamp: post.createdAt || null,
        meta: 'Найдено упоминание',
        actionId: 'open-feed-query',
        payload: { query: `@${user.username}` },
        cta: 'Посмотреть',
        tone: 'warn',
        badges: ['Упоминание']
      })
    })

    if (trendingTags[0]) {
      items.push({
        id: `feed-trend-${trendingTags[0].tag}`,
        lane: PULSE_TABS.feed,
        priority: 66,
        title: `Тренд ${trendingTags[0].tag}`,
        text: `${trendingTags[0].count} постов сейчас крутятся вокруг этой темы.`,
        timestamp: posts[0] ? posts[0].createdAt || null : null,
        meta: 'Трендовый тег',
        actionId: 'open-feed-tag',
        payload: { tag: trendingTags[0].tag },
        cta: 'Открыть тренд',
        tone: 'neutral',
        badges: ['Тренд']
      })
    }

    if (bookmarkedPostIds.size > 0) {
      items.push({
        id: 'feed-bookmarks',
        lane: PULSE_TABS.feed,
        priority: 54,
        title: 'Пересмотреть сохранённые посты',
        text: `${bookmarkedPostIds.size} сохранённых постов ждут второго прохода.`,
        timestamp: null,
        meta: 'Закладки',
        actionId: 'open-feed-bookmarks',
        payload: null,
        cta: 'Открыть закладки',
        tone: 'neutral',
        badges: ['Библиотека']
      })
    }

    profileEditorPendingChecklist.slice(0, 3).forEach((item, index) => {
      items.push({
        id: `profile-task-${item.id}`,
        lane: PULSE_TABS.profile,
        priority: Math.max(58, 76 - (index * 3)),
        title: `Профиль: ${item.label}`,
        text: 'Заверши этот шаг, чтобы поднять готовность профиля и улучшить публичную карточку.',
        timestamp: null,
        meta: `${profileEditorScore}% готовности`,
        actionId: 'open-profile',
        payload: null,
        cta: 'Открыть профиль',
        tone: 'accent',
        badges: ['Профиль']
      })
    })

    if (verificationRequest && verificationRequest.status === 'pending') {
      items.push({
        id: 'profile-verification-pending',
        lane: PULSE_TABS.profile,
        priority: 60,
        title: 'Заявка на верификацию на проверке',
        text: verificationRequest.reason || 'Админы проверяют твою заявку на верификацию.',
        timestamp: verificationRequest.updatedAt || verificationRequest.createdAt || null,
        meta: 'Верификация',
        actionId: 'open-profile',
        payload: null,
        cta: 'Открыть профиль',
        tone: 'neutral',
        badges: ['Верификация']
      })
    }

    dashboardSystemAlerts.forEach((item, index) => {
      const mappedAction = item.id === 'unread'
        ? { actionId: 'open-unread', payload: null }
        : item.id === 'blocked'
          ? { actionId: 'open-settings', payload: { section: 'privacy' } }
          : item.id === 'call'
            ? { actionId: 'open-chats', payload: null }
            : item.id === 'push-error' || item.id === 'push-off'
              ? { actionId: 'open-settings', payload: { section: 'notifications' } }
              : { actionId: 'open-dashboard', payload: null }
      items.push({
        id: `system-alert-${item.id}`,
        lane: PULSE_TABS.system,
        priority: item.level === 'danger' ? 95 - index : item.level === 'warn' ? 86 - index : 68 - index,
        title: item.title,
        text: truncateText(item.text, 130),
        timestamp: dashboardLastRefreshAt || null,
        meta: item.level,
        actionId: mappedAction.actionId,
        payload: mappedAction.payload,
        cta: 'Открыть',
        tone: item.level,
        badges: ['Система']
      })
    })

    const snapshotAgeMs = dashboardLastRefreshAt ? Math.max(0, Date.now() - dashboardLastRefreshAt) : Number.POSITIVE_INFINITY
    if (snapshotAgeMs > (15 * 60 * 1000)) {
      items.push({
        id: 'system-refresh-stale',
        lane: PULSE_TABS.system,
        priority: 64,
        title: 'Снимок пространства устарел',
        text: dashboardLastRefreshAt
          ? `Последняя синхронизация была ${formatRelativeFeedAge(dashboardLastRefreshAt)}. Обнови снимок пространства.`
          : 'Это пространство ещё не синхронизировалось.',
        timestamp: dashboardLastRefreshAt || null,
        meta: 'Синхронизация',
        actionId: 'refresh-workspace',
        payload: null,
        cta: 'Обновить',
        tone: 'neutral',
        badges: ['Синхронизация']
      })
    }

    if (health && health.ok === false) {
      items.push({
        id: 'system-health',
        lane: PULSE_TABS.system,
        priority: 93,
        title: 'Состояние backend требует внимания',
        text: 'Проверка состояния не зелёная. Проверь статус сервиса и последние деплои.',
        timestamp: dashboardLastRefreshAt || null,
        meta: 'Состояние',
        actionId: 'open-dashboard',
        payload: null,
        cta: 'Открыть панель',
        tone: 'danger',
        badges: ['Состояние']
      })
    }

    return items.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0)
    })
  }, [
    dashboardTopConversations,
    dashboardDraftQueue,
    postText,
    feedComposerDraftSavedAt,
    hotFeedPosts,
    pulseMentionPosts,
    trendingTags,
    posts,
    bookmarkedPostIds.size,
    profileEditorPendingChecklist,
    profileEditorScore,
    verificationRequest,
    dashboardSystemAlerts,
    dashboardLastRefreshAt,
    health && health.ok,
    user ? user.username : ''
  ])
  const pulseActiveItems = useMemo(() => (
    pulseRawItems.filter((item) => !pulseDismissedIdSet.has(item.id))
  ), [pulseRawItems, pulseDismissedIdSet])
  const pulseArchivedItems = useMemo(() => (
    pulseRawItems.filter((item) => pulseDismissedIdSet.has(item.id))
  ), [pulseRawItems, pulseDismissedIdSet])
  const pulseTabCounts = useMemo(() => ({
    [PULSE_TABS.priority]: pulseActiveItems.filter((item) => item.priority >= PULSE_PRIORITY_THRESHOLD).length,
    [PULSE_TABS.chats]: pulseActiveItems.filter((item) => item.lane === PULSE_TABS.chats).length,
    [PULSE_TABS.feed]: pulseActiveItems.filter((item) => item.lane === PULSE_TABS.feed).length,
    [PULSE_TABS.profile]: pulseActiveItems.filter((item) => item.lane === PULSE_TABS.profile).length,
    [PULSE_TABS.system]: pulseActiveItems.filter((item) => item.lane === PULSE_TABS.system).length,
    [PULSE_TABS.archived]: pulseArchivedItems.length
  }), [pulseActiveItems, pulseArchivedItems.length])
  const pulseVisibleItems = useMemo(() => {
    const source = pulseTab === PULSE_TABS.archived ? pulseArchivedItems : pulseActiveItems
    let nextItems = source
    if (pulseTab === PULSE_TABS.priority) {
      nextItems = source.filter((item) => item.priority >= PULSE_PRIORITY_THRESHOLD)
    } else if (pulseTab !== PULSE_TABS.archived) {
      nextItems = source.filter((item) => item.lane === pulseTab)
    }
    return [...nextItems].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0)
    })
  }, [pulseTab, pulseArchivedItems, pulseActiveItems])
  const pulsePriorityCount = pulseTabCounts[PULSE_TABS.priority] || 0
  const pulseResolvedCount = pulseTabCounts[PULSE_TABS.archived] || 0
  const dashboardPulseVisibleItems = useMemo(() => (
    pulseVisibleItems.slice(0, pulseTab === PULSE_TABS.archived ? 4 : 3)
  ), [pulseTab, pulseVisibleItems])
  const dashboardPulseHealthLabel = useMemo(() => {
    if (pulsePriorityCount > 0) return uiText('Требует внимания', 'Needs attention')
    if (pulseActiveItems.length > 0) return uiText('Стабильно', 'Stable')
    return uiText('Пусто', 'Clear')
  }, [isEnglishUi, pulseActiveItems.length, pulsePriorityCount])
  const dashboardPulseEmptyLabel = useMemo(() => {
    if (pulseTab === PULSE_TABS.archived) {
      return uiText('Здесь появятся скрытые пункты, если ты уберёшь их из входящих.', 'Hidden items will appear here after you remove them from the inbox.')
    }
    if (pulseTab === PULSE_TABS.chats) {
      return uiText('По чатам сейчас тихо. Непрочитанных диалогов и черновиков нет.', 'Chats are quiet right now. No unread threads or drafts.')
    }
    if (pulseTab === PULSE_TABS.feed) {
      return uiText('Лента спокойная. Упоминаний и горячих тем пока нет.', 'Feed is calm. No mentions or hot threads right now.')
    }
    if (pulseTab === PULSE_TABS.profile) {
      return uiText('Профильный блок чистый. Критичных задач сейчас нет.', 'Profile is clear. No critical tasks right now.')
    }
    if (pulseTab === PULSE_TABS.system) {
      return uiText('Система без явных предупреждений.', 'System has no obvious warnings.')
    }
    return uiText('Входящие пусты. Можно переключиться на чаты, ленту или профиль.', 'Inbox is clear. You can switch to chats, feed, or profile.')
  }, [isEnglishUi, pulseTab])
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
    if (typeof document !== 'undefined') {
      document.documentElement.lang = appLanguage
    }
    try {
      localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, appLanguage)
    } catch (err) {
      // ignore storage errors
    }
  }, [appLanguage])

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
    const lineStrengthFactor = clampNumber(normalized.lineStrength / 100, 0.35, 1.8)
    root.dataset.uiStyle = normalized.style
    root.dataset.uiDensity = normalized.density
    root.dataset.uiBackdrop = normalized.backdropMode
    root.dataset.uiChrome = normalized.chrome
    root.style.setProperty('--ambient-opacity', ambientOpacity)
    root.style.setProperty('--surface-radius', `${radius}px`)
    root.style.setProperty('--surface-radius-md', `${Math.max(12, radius - 4)}px`)
    root.style.setProperty('--surface-radius-sm', `${Math.max(10, radius - 8)}px`)
    root.style.setProperty('--bubble-radius', `${Math.max(14, radius - 3)}px`)

    const accentSource = normalized.syncAccent
      ? normalizeHexColor(profileForm.themeColor || (user && user.themeColor) || DEFAULT_UI_PREFERENCES.accentColor)
      : normalizeHexColor(normalized.accentColor, DEFAULT_UI_PREFERENCES.accentColor)
    const accentRgb = hexToRgb(accentSource)
    const accent2Source = normalized.syncAccent
      ? rgbToHex(mixRgbColor(accentRgb, { r: 255, g: 255, b: 255 }, theme === 'light' ? 0.14 : 0.24))
      : normalizeHexColor(normalized.accent2Color, DEFAULT_UI_PREFERENCES.accent2Color)
    const accent2Rgb = hexToRgb(accent2Source)
    const accent3Rgb = mixRgbColor(accent2Rgb, { r: 255, g: 255, b: 255 }, theme === 'light' ? 0.18 : 0.28)
    const autoOutlineSource = (theme === 'light' || normalized.style === 'neo')
      ? accentSource
      : '#ffffff'
    const outlineSource = normalized.outlineMode === 'custom'
      ? normalizeHexColor(normalized.outlineColor, DEFAULT_UI_PREFERENCES.outlineColor)
      : autoOutlineSource
    const outlineRgb = hexToRgb(outlineSource)
    const stripeSource = normalizeHexColor(normalized.stripeColor, DEFAULT_UI_PREFERENCES.stripeColor)
    const stripeRgb = hexToRgb(stripeSource)
    const baseLineAlpha = normalized.style === 'neo'
      ? (theme === 'light' ? 0.24 : 0.28)
      : (theme === 'light' ? 0.18 : 0.08)
    const lineAlpha = clampNumber(baseLineAlpha * lineStrengthFactor, 0.04, 0.62)
    const chatOutlineSource = normalizeHexColor(normalized.chatAccentColor, DEFAULT_UI_PREFERENCES.chatAccentColor)
    const chatOutlineRgb = hexToRgb(chatOutlineSource)
    const feedOutlineSource = normalizeHexColor(normalized.feedAccentColor, DEFAULT_UI_PREFERENCES.feedAccentColor)
    const feedOutlineRgb = hexToRgb(feedOutlineSource)
    const glowSource = normalized.outlineMode === 'custom'
      ? outlineSource
      : accentSource
    const glowRgb = hexToRgb(glowSource)

    root.style.setProperty('--accent', accentSource)
    root.style.setProperty('--accent-2', accent2Source)
    root.style.setProperty('--accent-3', rgbToHex(accent3Rgb))
    root.style.setProperty('--accent-rgb', rgbToCssTriplet(accentRgb))
    root.style.setProperty('--accent-2-rgb', rgbToCssTriplet(accent2Rgb))
    root.style.setProperty('--outline-rgb', rgbToCssTriplet(outlineRgb))
    root.style.setProperty('--line', `rgba(${outlineRgb.r}, ${outlineRgb.g}, ${outlineRgb.b}, ${lineAlpha.toFixed(3)})`)
    root.style.setProperty('--stripe-rgb', rgbToCssTriplet(stripeRgb))
    root.style.setProperty('--chat-surface-accent-rgb', rgbToCssTriplet(chatOutlineRgb))
    root.style.setProperty('--feed-surface-accent-rgb', rgbToCssTriplet(feedOutlineRgb))
    root.style.setProperty('--ui-glow-rgb', rgbToCssTriplet(glowRgb))
    if (normalized.glowEnabled) {
      root.dataset.uiGlow = 'on'
      root.style.setProperty('--ui-glow-active-border', `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.62)`)
      root.style.setProperty('--ui-glow-active-bg', `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.18)`)
      root.style.setProperty('--ui-glow-ring', `0 0 0 1px rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.24)`)
      root.style.setProperty('--ui-glow-shadow-soft', `0 8px 18px rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.24)`)
      root.style.setProperty('--ui-glow-shadow-strong', `0 12px 24px rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.3)`)
      root.style.setProperty('--ui-glow-text', `rgb(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b})`)
    } else {
      root.dataset.uiGlow = 'off'
      root.style.setProperty('--ui-glow-active-border', 'var(--line)')
      root.style.setProperty('--ui-glow-active-bg', 'rgba(255, 255, 255, 0.06)')
      root.style.setProperty('--ui-glow-ring', 'none')
      root.style.setProperty('--ui-glow-shadow-soft', 'none')
      root.style.setProperty('--ui-glow-shadow-strong', 'none')
      root.style.setProperty('--ui-glow-text', 'var(--text)')
    }

    if (normalized.customPalette) {
      root.style.setProperty('--bg', normalizeHexColor(normalized.bgColor, DEFAULT_UI_PREFERENCES.bgColor))
      root.style.setProperty('--panel', normalizeHexColor(normalized.panelColor, DEFAULT_UI_PREFERENCES.panelColor))
      root.style.setProperty('--panel-2', normalizeHexColor(normalized.panel2Color, DEFAULT_UI_PREFERENCES.panel2Color))
      root.style.setProperty('--card', normalizeHexColor(normalized.cardColor, DEFAULT_UI_PREFERENCES.cardColor))
      root.style.setProperty('--text', normalizeHexColor(normalized.textColor, DEFAULT_UI_PREFERENCES.textColor))
      root.style.setProperty('--muted', normalizeHexColor(normalized.mutedColor, DEFAULT_UI_PREFERENCES.mutedColor))
    } else {
      root.style.removeProperty('--bg')
      root.style.removeProperty('--panel')
      root.style.removeProperty('--panel-2')
      root.style.removeProperty('--card')
      root.style.removeProperty('--text')
      root.style.removeProperty('--muted')
    }

    try {
      localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
    } catch (err) {
      // ignore storage errors
    }
  }, [uiPreferences, profileForm.themeColor, user ? user.themeColor : null, theme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined
    const viewport = window.visualViewport
    const updateInset = () => {
      const nextInset = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - Math.max(0, viewport.offsetTop || 0))
      )
      setMobileKeyboardInset((prev) => (prev === nextInset ? prev : nextInset))
    }
    updateInset()
    viewport.addEventListener('resize', updateInset)
    viewport.addEventListener('scroll', updateInset)
    window.addEventListener('resize', updateInset)
    return () => {
      viewport.removeEventListener('resize', updateInset)
      viewport.removeEventListener('scroll', updateInset)
      window.removeEventListener('resize', updateInset)
    }
  }, [])

  useEffect(() => {
    if (composerFocusWithin) return
    setMobileKeyboardInset(0)
  }, [composerFocusWithin])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const root = document.documentElement
    root.style.setProperty('--mobile-keyboard-offset', `${mobileKeyboardInset}px`)
    if (isMobileComposerDocked) {
      root.dataset.mobileKeyboard = 'open'
    } else if (root.dataset.mobileKeyboard === 'open') {
      delete root.dataset.mobileKeyboard
    }
    return () => {
      if (root.dataset.mobileKeyboard === 'open') {
        delete root.dataset.mobileKeyboard
      }
      root.style.removeProperty('--mobile-keyboard-offset')
    }
  }, [isMobileComposerDocked, mobileKeyboardInset])

  useEffect(() => {
    setChatListSwipe((prev) => (
      prev.conversationId || prev.offset !== 0 || prev.dragging
        ? { ...INITIAL_CHAT_LIST_SWIPE_STATE }
        : prev
    ))
    chatListSwipeGestureRef.current = {
      conversationId: '',
      startX: 0,
      startY: 0,
      startOffset: 0,
      active: false,
      horizontal: false
    }
  }, [activeConversation ? activeConversation.id : '', chatMobilePane, chatListFilter, view])

  useEffect(() => {
    try {
      localStorage.setItem(UI_CUSTOM_THEME_PRESETS_STORAGE_KEY, JSON.stringify(uiCustomThemePresets))
    } catch (err) {
      // ignore storage errors
    }
  }, [uiCustomThemePresets])

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STRIP_COLLAPSED_STORAGE_KEY, workspaceStripCollapsed ? '1' : '0')
    } catch (err) {
      // ignore storage errors
    }
  }, [workspaceStripCollapsed])

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
      throw new Error('Push-уведомления не поддерживаются в этом браузере.')
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
      throw new Error('Web Push не настроен на сервере.')
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
        error: keepError ? (feedback.message || prev.error || 'Не удалось настроить push') : ''
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
      setStatus({ type: 'info', message: 'Сначала войдите в аккаунт, чтобы включить уведомления.' })
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
            ? 'Разрешение на уведомления заблокировано в настройках браузера.'
            : ''
        })
        return
      }
      await attachPushSubscriptionToUser()
      pushToast({
        title: 'Уведомления включены',
        message: 'Сообщения будут приходить на это устройство.',
        type: 'info'
      })
    } catch (err) {
      const feedback = getPushErrorFeedback(err)
      setPushState((prev) => ({
        ...prev,
        supported: feedback.supported,
        loading: false,
        enabled: false,
        error: feedback.message || 'Не удалось включить уведомления'
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
      if (stored === 'pulse') return 'dashboard'
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
        setProfileForm(buildProfileFormState(data.user))
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
    refreshAdminWorkspace(adminQuery, adminVerificationFilter)
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
      setConversationsLoading(true)
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
      } finally {
        setConversationsLoading(false)
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
      setMessagesLoading(false)
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
      setMessagesLoading(true)
      try {
        const data = await getMessages(activeConversation.id)
        setMessages((data.messages || []).map(normalizeChatMessage))
        await clearConversationUnread(activeConversation.id)
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      } finally {
        setMessagesLoading(false)
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
        autoRefresh: dashboardAutoRefresh,
        workbenchMode: dashboardWorkbenchMode
      }))
    } catch (err) {
      // ignore storage errors
    }
  }, [dashboardFocusMode, dashboardAutoRefresh, dashboardWorkbenchMode])

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
      localStorage.setItem(DASHBOARD_SCRATCHPAD_STORAGE_KEY, dashboardScratchpad)
    } catch (err) {
      // ignore storage errors
    }
  }, [dashboardScratchpad])

  useEffect(() => {
    try {
      localStorage.setItem(
        PULSE_DISMISSED_STORAGE_KEY,
        JSON.stringify(pulseDismissedItemIds.slice(0, 200))
      )
    } catch (err) {
      // ignore storage errors
    }
  }, [pulseDismissedItemIds])

  useEffect(() => {
    try {
      const trimmed = String(postText || '').trim()
      if (!trimmed) {
        localStorage.removeItem(FEED_COMPOSER_DRAFT_STORAGE_KEY)
        if (feedComposerDraftSavedAt !== null) {
          setFeedComposerDraftSavedAt(null)
        }
        return
      }
      const nextSavedAt = Date.now()
      localStorage.setItem(FEED_COMPOSER_DRAFT_STORAGE_KEY, JSON.stringify({
        text: postText,
        savedAt: nextSavedAt
      }))
      setFeedComposerDraftSavedAt(nextSavedAt)
    } catch (err) {
      // ignore storage errors
    }
  }, [postText])

  useEffect(() => {
    if (view !== 'feed' || feedComposerFocusTick === 0) return
    const frame = window.requestAnimationFrame(() => {
      const textarea = feedComposerTextareaRef.current
      if (!textarea) return
      textarea.focus()
      const caret = textarea.value.length
      textarea.setSelectionRange(caret, caret)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view, feedComposerFocusTick])

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
    chatListSwipeStateRef.current = chatListSwipe
  }, [chatListSwipe])

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
      setProfileForm(buildProfileFormState(data.user, registerForm.role))
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
      setProfileForm(buildProfileFormState(data.user))
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
      setProfileForm(buildProfileFormState(data.user))
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
      setProfileForm(buildProfileFormState(data.user))
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

  const isOwnerUser = (targetUser) => {
    if (!targetUser || typeof targetUser !== 'object') return false
    if (targetUser.isOwner === true || targetUser.is_owner === true) return true
    if (String(targetUser.role || '').trim() === '*') return true
    return getUserRoleList(targetUser).includes('*')
  }

  const canViewerSeeRoleInfo = (targetUser, viewer = user) => {
    if (!targetUser || typeof targetUser !== 'object') return false
    const targetId = String(targetUser.id || '').trim()
    const viewerId = String(viewer && viewer.id ? viewer.id : '').trim()
    if (targetId && viewerId && targetId === viewerId) return true
    const targetUsername = String(targetUser.username || '').trim().toLowerCase()
    const viewerUsername = String(viewer && viewer.username ? viewer.username : '').trim().toLowerCase()
    if (targetUsername && viewerUsername && targetUsername === viewerUsername) return true
    return targetUser.showRole !== false && targetUser.show_role !== false
  }

  const currentUserIsOwner = isOwnerUser(user)

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

  const refreshAdminWorkspace = async (
    query = adminQuery,
    verificationStatus = adminVerificationFilter
  ) => {
    await Promise.all([
      loadAdminUsers(query || ''),
      loadAdminVerificationRequests(verificationStatus || 'pending', query || '')
    ])
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

  const handleAdminToggleAdminForUser = async (targetUser) => {
    if (!targetUser || !targetUser.id || !currentUserIsOwner) return
    const nextValue = !(targetUser.is_admin === true)
    try {
      await adminSetAdmin(targetUser.id, nextValue)
      await loadAdminUsers(adminQuery)
      setStatus({
        type: 'success',
        message: nextValue
          ? `ADMIN права выданы @${targetUser.username}.`
          : `ADMIN права сняты с @${targetUser.username}.`
      })
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
    setSettingsNavQuery('')
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
    setAdminWorkspaceTab('overview')
    setAdminUserFilter('all')
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

  const focusChatDirectorySearch = () => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      if (!chatSearchInputRef.current) return
      chatSearchInputRef.current.focus()
      try {
        chatSearchInputRef.current.select()
      } catch (err) {
        // ignore selection errors
      }
    })
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
      setStatus({ type: 'error', message: 'Личные сообщения заблокированы настройками приватности.' })
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
      setStatus({ type: 'error', message: 'Личные сообщения заблокированы настройками приватности.' })
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

  const openConversationFromChatList = (conversation) => {
    if (!conversation || !conversation.id) return
    setChatListSwipe({ ...INITIAL_CHAT_LIST_SWIPE_STATE })
    chatListSwipeGestureRef.current = {
      conversationId: '',
      startX: 0,
      startY: 0,
      startOffset: 0,
      active: false,
      horizontal: false
    }
    openConversationFromDashboard(conversation)
  }

  const closeChatListSwipe = () => {
    setChatListSwipe((prev) => (
      prev.conversationId || prev.offset !== 0 || prev.dragging
        ? { ...INITIAL_CHAT_LIST_SWIPE_STATE }
        : prev
    ))
    chatListSwipeGestureRef.current = {
      conversationId: '',
      startX: 0,
      startY: 0,
      startOffset: 0,
      active: false,
      horizontal: false
    }
  }

  const handleChatItemSwipeStart = (event, conversationId) => {
    if (
      typeof window === 'undefined' ||
      window.innerWidth > MOBILE_CHAT_LAYOUT_BREAKPOINT ||
      !event ||
      !event.touches ||
      event.touches.length !== 1 ||
      !conversationId
    ) {
      return
    }
    const touch = event.touches[0]
    const currentSwipe = chatListSwipeStateRef.current
    chatListSwipeGestureRef.current = {
      conversationId,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: currentSwipe.conversationId === conversationId ? currentSwipe.offset : 0,
      active: true,
      horizontal: false
    }
    if (currentSwipe.conversationId && currentSwipe.conversationId !== conversationId) {
      setChatListSwipe({ ...INITIAL_CHAT_LIST_SWIPE_STATE })
    }
  }

  const handleChatItemSwipeMove = (event, conversationId) => {
    const gesture = chatListSwipeGestureRef.current
    if (
      typeof window === 'undefined' ||
      window.innerWidth > MOBILE_CHAT_LAYOUT_BREAKPOINT ||
      !gesture.active ||
      gesture.conversationId !== conversationId ||
      !event ||
      !event.touches ||
      event.touches.length !== 1
    ) {
      return
    }
    const touch = event.touches[0]
    const deltaX = touch.clientX - gesture.startX
    const deltaY = touch.clientY - gesture.startY
    if (!gesture.horizontal) {
      if (Math.abs(deltaY) > CHAT_ITEM_SWIPE_ACTIVATE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        chatListSwipeGestureRef.current = {
          conversationId: '',
          startX: 0,
          startY: 0,
          startOffset: 0,
          active: false,
          horizontal: false
        }
        return
      }
      if (Math.abs(deltaX) < CHAT_ITEM_SWIPE_ACTIVATE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return
      }
      gesture.horizontal = true
    }
    const nextOffset = clampNumber(
      gesture.startOffset + deltaX,
      -CHAT_ITEM_SWIPE_ACTION_WIDTH,
      0
    )
    setChatListSwipe((prev) => (
      prev.conversationId === conversationId && prev.offset === nextOffset && prev.dragging
        ? prev
        : {
          conversationId,
          offset: nextOffset,
          dragging: true
        }
    ))
    event.preventDefault()
  }

  const finalizeChatItemSwipe = (conversationId) => {
    const currentSwipe = chatListSwipeStateRef.current
    if (currentSwipe.conversationId !== conversationId) {
      chatListSwipeGestureRef.current = {
        conversationId: '',
        startX: 0,
        startY: 0,
        startOffset: 0,
        active: false,
        horizontal: false
      }
      return
    }
    const nextState = currentSwipe.offset <= -CHAT_ITEM_SWIPE_OPEN_THRESHOLD
      ? {
        conversationId,
        offset: -CHAT_ITEM_SWIPE_ACTION_WIDTH,
        dragging: false
      }
      : { ...INITIAL_CHAT_LIST_SWIPE_STATE }
    setChatListSwipe(nextState)
    chatListSwipeGestureRef.current = {
      conversationId: '',
      startX: 0,
      startY: 0,
      startOffset: 0,
      active: false,
      horizontal: false
    }
  }

  const handleChatComposerFocus = () => {
    if (typeof window !== 'undefined' && window.innerWidth > MOBILE_CHAT_LAYOUT_BREAKPOINT) return
    setComposerFocusWithin(true)
  }

  const handleChatComposerBlur = (event) => {
    const currentTarget = event.currentTarget
    const nextTarget = event.relatedTarget
    if (nextTarget && currentTarget.contains(nextTarget)) return
    window.setTimeout(() => {
      if (typeof document !== 'undefined' && currentTarget.contains(document.activeElement)) return
      setComposerFocusWithin(false)
    }, 0)
  }

  const openPulseWorkspace = (tab = PULSE_TABS.priority) => {
    setView('dashboard')
    setPulseTab(normalizePulseTab(tab))
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

  const focusFeedComposer = () => {
    setView('feed')
    setFeedComposerFocusTick((prev) => prev + 1)
  }

  const clearFeedComposerDraft = () => {
    setPostText('')
    setPostFile(null)
    setPostPreview('')
    setFeedComposerDraftSavedAt(null)
    try {
      localStorage.removeItem(FEED_COMPOSER_DRAFT_STORAGE_KEY)
    } catch (err) {
      // ignore storage errors
    }
  }

  const applyFeedComposerPrompt = (rawText, { replace = false } = {}) => {
    const nextText = String(rawText || '').trim()
    if (!nextText) {
      focusFeedComposer()
      return
    }
    setView('feed')
    setPostText((prev) => {
      const current = String(prev || '')
      if (replace || !current.trim()) return nextText
      if (current.includes(nextText)) return current
      return `${current.trimEnd()}\n\n${nextText}`.trim()
    })
    setFeedComposerFocusTick((prev) => prev + 1)
  }

  const appendDashboardScratchpadTemplate = (rawText) => {
    const nextText = String(rawText || '').trim()
    if (!nextText) return
    setDashboardScratchpad((prev) => {
      const current = String(prev || '').trim()
      if (!current) return nextText
      if (current.includes(nextText)) return prev
      return `${prev.trimEnd()}\n${nextText}`.trim()
    })
  }

  const updateDashboardWorkbenchMode = (mode) => {
    updateDashboardPreferences({ workbenchMode: normalizeDashboardWorkbenchMode(mode) })
  }

  const runDashboardWorkbenchAction = (actionId, payload = null) => {
    if (actionId === 'unread' || actionId === 'drafts' || actionId === 'feed-hot' || actionId === 'profile' || actionId === 'trend') {
      runDashboardFocusAction(actionId)
      return
    }
    if (actionId === 'compose') {
      applyFeedComposerPrompt(payload && payload.template ? payload.template : '', { replace: false })
      return
    }
    if (actionId === 'resume-chat') {
      if (activeConversation) {
        openConversationFromDashboard(activeConversation)
      } else {
        setView('chats')
        setChatMobilePane('list')
      }
      return
    }
    if (actionId === 'refresh') {
      refreshWorkspaceSnapshot()
      return
    }
    if (actionId === 'push') {
      syncPushState({ keepError: true }).catch(() => {})
      return
    }
    if (actionId === 'bookmarks') {
      openFeedFocus({ filter: FEED_FILTERS.bookmarks })
      return
    }
    if (actionId === 'mine-posts') {
      openFeedFocus({ filter: FEED_FILTERS.mine, sortMode: FEED_SORT_MODES.latest })
      return
    }
    if (actionId === 'tag' && payload && payload.tag) {
      openFeedFocus({ filter: FEED_FILTERS.all, sortMode: FEED_SORT_MODES.smart, tag: payload.tag })
      return
    }
    if (actionId === 'settings') {
      setView('settings')
      return
    }
    if (actionId === 'pulse') {
      openPulseWorkspace(PULSE_TABS.priority)
      return
    }
    if (actionId === 'chats') {
      setView('chats')
      setChatMobilePane('list')
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
      ...(patch.autoRefresh !== undefined ? { autoRefresh: patch.autoRefresh === true } : {}),
      ...(patch.workbenchMode !== undefined ? { workbenchMode: normalizeDashboardWorkbenchMode(patch.workbenchMode) } : {})
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

    if (value.startsWith('mode:')) {
      const nextMode = normalizeDashboardWorkbenchMode(value.slice(5))
      updateDashboardWorkbenchMode(nextMode)
      setStatus({ type: 'success', message: `Dashboard lane: ${nextMode}` })
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
    if (value === 'pulse' || value === 'activity' || value === 'inbox') {
      openPulseWorkspace()
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
    if (value === 'compose' || value === 'post' || value === 'publish' || value === 'пост') {
      runDashboardWorkbenchAction('compose')
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
        id: 'go-inbox',
        title: 'Открыть входящие',
        hint: 'Компактный блок в центре управления',
        keywords: 'pulse inbox активность входящие задачи панель фокус',
        run: () => openPulseWorkspace(PULSE_TABS.priority)
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

  const openSettingsSectionView = (section = 'general') => {
    setSettingsSection(section)
    setView('settings')
  }

  const dismissPulseItem = (itemId) => {
    const key = String(itemId || '').trim()
    if (!key) return
    setPulseDismissedItemIds((prev) => (
      prev.includes(key) ? prev : [key, ...prev].slice(0, 200)
    ))
  }

  const restorePulseItem = (itemId) => {
    const key = String(itemId || '').trim()
    if (!key) return
    setPulseDismissedItemIds((prev) => prev.filter((item) => item !== key))
  }

  const restoreAllPulseItems = () => {
    setPulseDismissedItemIds([])
  }

  const runPulseAction = (item) => {
    if (!item || !item.actionId) return
    const payload = item.payload && typeof item.payload === 'object' ? item.payload : {}
    if (item.actionId === 'open-conversation') {
      const conversationId = String(payload.conversationId || '').trim()
      const nextConversation = conversations.find((entry) => entry.id === conversationId)
      if (nextConversation) {
        openConversationFromDashboard(nextConversation)
        return
      }
      setView('chats')
      setChatMobilePane('list')
      setStatus({ type: 'info', message: 'Conversation was not found in the current list.' })
      return
    }
    if (item.actionId === 'open-feed-hot') {
      openFeedFocus({
        filter: FEED_FILTERS.popular,
        sortMode: FEED_SORT_MODES.engagement,
        timeWindow: FEED_TIME_WINDOWS.week,
        authorId: payload.authorId || ''
      })
      return
    }
    if (item.actionId === 'open-feed-query') {
      openFeedFocus({
        filter: FEED_FILTERS.all,
        sortMode: FEED_SORT_MODES.smart,
        query: payload.query || ''
      })
      return
    }
    if (item.actionId === 'open-feed-tag') {
      openFeedFocus({
        filter: FEED_FILTERS.all,
        sortMode: FEED_SORT_MODES.smart,
        tag: payload.tag || ''
      })
      return
    }
    if (item.actionId === 'open-feed-bookmarks') {
      openFeedFocus({ filter: FEED_FILTERS.bookmarks })
      return
    }
    if (item.actionId === 'open-compose') {
      applyFeedComposerPrompt('', { replace: false })
      return
    }
    if (item.actionId === 'open-profile') {
      setView('profile')
      return
    }
    if (item.actionId === 'open-settings') {
      openSettingsSectionView(payload.section || 'general')
      return
    }
    if (item.actionId === 'refresh-workspace') {
      refreshWorkspaceSnapshot()
      return
    }
    if (item.actionId === 'open-dashboard') {
      setView('dashboard')
      return
    }
    if (item.actionId === 'open-unread') {
      runDashboardFocusAction('unread')
      return
    }
    if (item.actionId === 'open-chats') {
      setView('chats')
      setChatMobilePane('list')
      return
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
    const showRole = canViewerSeeRoleInfo(rawUser)
    const roleValues = getUserRoleList(rawUser)
    const roleLabels = roleValues
      .map((value) => roleLabelByValue.get(value) || value)
      .filter(Boolean)
    const displayName = String(rawUser.displayName || username || 'Пользователь').trim()
    const statusEmoji = String(rawUser.statusEmoji || '').trim()
    const statusText = String(rawUser.statusText || '').trim()
    const isVerified = rawUser.isVerified === true || rawUser.is_verified === true
    const isOwner = (
      showRole && (
        rawUser.isOwner === true ||
        rawUser.is_owner === true ||
        roleValues.includes('*') ||
        String(rawUser.role || '').trim() === '*'
      )
    )
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
      roleLabels: showRole ? roleLabels : [],
      showRole,
      isVerified,
      isOwner,
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
    const showRole = baseUser.showRole !== false && extraUser.showRole !== false
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
      roleLabels: showRole ? roleLabels : [],
      showRole,
      isVerified: baseUser.isVerified === true || extraUser.isVerified === true,
      isOwner: showRole && (baseUser.isOwner === true || extraUser.isOwner === true),
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
      setStatus({ type: 'error', message: 'Личные сообщения заблокированы настройками приватности.' })
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
      setStatus({ type: 'error', message: 'Личные сообщения заблокированы настройками приватности.' })
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

  const applyProfileVisualScenePreset = (sceneId) => {
    const scene = PROFILE_VISUAL_SCENE_PRESETS.find((item) => item.id === sceneId)
    if (!scene) return
    setProfileThemeColor(scene.themeColor)
    setProfileShowcaseForm((prev) => ({
      ...prev,
      heroTheme: PROFILE_HERO_THEMES.some((item) => item.value === scene.heroTheme)
        ? scene.heroTheme
        : prev.heroTheme
    }))
    setStatus({ type: 'success', message: `Профильная сцена "${scene.label}" применена.` })
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

  const updateUiColorPreference = (key, value) => {
    setUiPreferences((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'accentColor' || key === 'accent2Color') {
        next.syncAccent = false
      }
      if (key === 'outlineColor') {
        next.outlineMode = 'custom'
      }
      if (
        key === 'bgColor' ||
        key === 'panelColor' ||
        key === 'panel2Color' ||
        key === 'cardColor' ||
        key === 'textColor' ||
        key === 'mutedColor'
      ) {
        next.customPalette = true
      }
      return normalizeUiPreferences(next)
    })
  }

  const enableFullUiCustomization = () => {
    setUiPreferences((prev) => normalizeUiPreferences({
      ...prev,
      syncAccent: false,
      outlineMode: 'custom',
      customPalette: true,
      stripeColor: prev.stripeColor || prev.outlineColor || prev.accent2Color,
      chatAccentColor: prev.chatAccentColor || prev.outlineColor || prev.accentColor,
      feedAccentColor: prev.feedAccentColor || prev.accentColor
    }))
  }

  const createUiCustomPresetId = () => `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const saveCurrentUiThemePreset = () => {
    const name = normalizeUiThemePresetName(uiCustomPresetName, '')
    if (!name) {
      setStatus({ type: 'error', message: 'Укажите название пресета.' })
      return
    }
    const snapshot = normalizeUiPreferences(uiPreferences)
    const now = new Date().toISOString()
    setUiCustomThemePresets((prev) => {
      const existingIndex = prev.findIndex((item) => item.name.toLowerCase() === name.toLowerCase())
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          preferences: snapshot,
          updatedAt: now
        }
        return next
      }
      const next = [
        {
          id: createUiCustomPresetId(),
          name,
          preferences: snapshot,
          createdAt: now,
          updatedAt: now
        },
        ...prev
      ]
      return next.slice(0, UI_CUSTOM_THEME_PRESET_LIMIT)
    })
    setUiCustomPresetName('')
    setStatus({ type: 'success', message: 'Пресет темы сохранён.' })
  }

  const applyUiCustomThemePreset = (preset) => {
    if (!preset || typeof preset !== 'object') return
    setUiPreferences(normalizeUiPreferences(preset.preferences))
    setStatus({ type: 'success', message: `Пресет "${preset.name}" применён.` })
  }

  const deleteUiCustomThemePreset = (presetId) => {
    setUiCustomThemePresets((prev) => prev.filter((item) => item.id !== presetId))
    setStatus({ type: 'info', message: 'Пресет темы удалён.' })
  }

  const renameUiCustomThemePreset = (presetId) => {
    const target = uiCustomThemePresets.find((item) => item.id === presetId)
    if (!target) return
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
    const prompted = window.prompt('Название пресета', target.name)
    if (prompted === null) return
    const name = normalizeUiThemePresetName(prompted, '')
    if (!name) {
      setStatus({ type: 'error', message: 'Название пресета не может быть пустым.' })
      return
    }
    setUiCustomThemePresets((prev) => prev.map((item) => (
      item.id === presetId
        ? { ...item, name, updatedAt: new Date().toISOString() }
        : item
    )))
    setStatus({ type: 'success', message: 'Пресет переименован.' })
  }

  const applyUiThemePreset = (preset) => {
    if (!preset) return
    setUiPreferences((prev) => normalizeUiPreferences({
      ...prev,
      syncAccent: false,
      accentColor: preset.accent,
      accent2Color: preset.accent2
    }))
  }

  const applyUiScenePreset = (scene) => {
    if (!scene || !scene.preferences) return
    setUiPreferences(normalizeUiPreferences(scene.preferences))
    if (scene.theme === 'light' || scene.theme === 'dark') {
      setTheme(scene.theme)
    }
    setStatus({ type: 'success', message: `Сцена "${scene.label}" применена.` })
  }

  const applyRandomUiScenePreset = () => {
    if (UI_THEME_SCENE_PRESETS.length === 0) return
    const normalized = normalizeUiPreferences(uiPreferences)
    const currentScene = UI_THEME_SCENE_PRESETS.find((scene) => (
      areUiPreferencesEqual(scene.preferences, normalized) &&
      (!scene.theme || scene.theme === theme)
    ))
    const pool = currentScene
      ? UI_THEME_SCENE_PRESETS.filter((scene) => scene.id !== currentScene.id)
      : UI_THEME_SCENE_PRESETS
    const selected = pool[Math.floor(Math.random() * pool.length)] || UI_THEME_SCENE_PRESETS[0]
    applyUiScenePreset(selected)
  }

  const exportUiThemePackToFile = () => {
    if (typeof document === 'undefined') return
    const payload = buildUiThemePackPayload(theme, uiPreferences, uiCustomThemePresets, {
      themeColor: profileForm.themeColor,
      heroTheme: profileShowcaseForm.heroTheme
    })
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.href = url
    link.download = `ktk-theme-pack-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setStatus({ type: 'success', message: 'Пакет темы экспортирован в JSON.' })
  }

  const copyUiThemePackJson = async () => {
    const payload = buildUiThemePackPayload(theme, uiPreferences, uiCustomThemePresets, {
      themeColor: profileForm.themeColor,
      heroTheme: profileShowcaseForm.heroTheme
    })
    const json = JSON.stringify(payload, null, 2)
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(json)
        setStatus({ type: 'success', message: 'JSON темы скопирован в буфер обмена.' })
        return
      } catch (err) {
        // fallback to local field
      }
    }
    setAppearanceImportJson(json)
    setStatus({ type: 'info', message: 'Буфер обмена недоступен. JSON вставлен в поле импорта.' })
  }

  const applyImportedUiThemePack = (rawText) => {
    const text = String(rawText || '').trim()
    if (!text) {
      setStatus({ type: 'error', message: 'Сначала вставьте JSON.' })
      return
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      setStatus({ type: 'error', message: 'Неверный формат JSON.' })
      return
    }
    const imported = normalizeImportedThemePack(parsed)
    if (!imported) {
      setStatus({ type: 'error', message: 'Пакет темы пустой или некорректный.' })
      return
    }
    if (imported.kind && imported.kind !== THEME_PACK_KIND) {
      setStatus({ type: 'error', message: 'Формат пакета темы не поддерживается.' })
      return
    }
    setUiPreferences(imported.uiPreferences)
    if (imported.theme === 'light' || imported.theme === 'dark') {
      setTheme(imported.theme)
    }
    if (Array.isArray(imported.customPresets) && imported.customPresets.length > 0) {
      setUiCustomThemePresets((prev) => normalizeUiCustomThemePresets([
        ...imported.customPresets,
        ...prev
      ]))
    }
    if (imported.profile) {
      setProfileThemeColor(imported.profile.themeColor)
      setProfileShowcaseForm((prev) => ({
        ...prev,
        heroTheme: imported.profile.heroTheme
      }))
    }
    setStatus({
      type: 'success',
      message: `Пакет темы импортирован${imported.version ? ` (v${imported.version})` : ''}.`
    })
  }

  const handleAppearanceImportJsonApply = () => {
    applyImportedUiThemePack(appearanceImportJson)
  }

  const handleAppearanceImportFileChange = async (event) => {
    const file = event.target && event.target.files && event.target.files[0] ? event.target.files[0] : null
    if (!file) return
    try {
      const text = await file.text()
      setAppearanceImportJson(text)
      applyImportedUiThemePack(text)
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось прочитать JSON-файл.' })
    } finally {
      if (event.target) event.target.value = ''
    }
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
      setFeedComposerDraftSavedAt(null)
      try {
        localStorage.removeItem(FEED_COMPOSER_DRAFT_STORAGE_KEY)
      } catch (storageErr) {
        // ignore storage errors
      }
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
  const profileViewShowsRole = useMemo(() => canViewerSeeRoleInfo(profileView), [profileView, user])
  const profileViewRoleLabels = useMemo(() => (
    profileViewShowsRole
      ? getUserRoleList(profileView).map((value) => roleLabelByValue.get(value) || value)
      : []
  ), [profileView, profileViewShowsRole, roleLabelByValue])
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
  const adminVerificationStatusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      all: adminVerificationRows.length
    }
    adminVerificationRows.forEach((item) => {
      const key = normalizeVerificationStatus(item && item.status ? item.status : 'pending')
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [adminVerificationRows])
  const adminOverviewStats = useMemo(() => {
    const usersTotal = adminUsers.length
    const owners = adminUsers.filter((item) => isOwnerUser(item)).length
    const admins = adminUsers.filter((item) => item && item.is_admin).length
    const moderators = adminUsers.filter((item) => item && item.is_moderator).length
    const verified = adminUsers.filter((item) => item && item.is_verified).length
    const banned = adminUsers.filter((item) => item && item.is_banned).length
    const warnings = adminUsers.filter((item) => Number(item && item.warnings_count ? item.warnings_count : 0) > 0).length
    const staff = adminUsers.filter((item) => item && (isOwnerUser(item) || item.is_admin || item.is_moderator)).length
    const coverage = usersTotal > 0 ? Math.round((verified / usersTotal) * 100) : 0
    return {
      usersTotal,
      owners,
      admins,
      moderators,
      verified,
      banned,
      warnings,
      staff,
      coverage,
      roles: roleOptions.length,
      pendingVerification: adminVerificationStatusCounts.pending
    }
  }, [adminUsers, adminVerificationStatusCounts.pending, roleOptions.length])
  const adminUserFilterCounts = useMemo(() => ({
    all: adminUsers.length,
    staff: adminUsers.filter((item) => item && (isOwnerUser(item) || item.is_admin || item.is_moderator)).length,
    risk: adminUsers.filter((item) => item && (item.is_banned || Number(item.warnings_count || 0) > 0)).length,
    banned: adminUsers.filter((item) => item && item.is_banned).length,
    verified: adminUsers.filter((item) => item && item.is_verified).length,
    unverified: adminUsers.filter((item) => item && !item.is_verified).length
  }), [adminUsers])
  const adminVisibleUsers = useMemo(() => {
    const getPriority = (targetUser) => {
      const warningsCount = Number(targetUser && targetUser.warnings_count ? targetUser.warnings_count : 0)
      return (
        (isOwnerUser(targetUser) ? 120 : 0) +
        (targetUser && targetUser.is_admin ? 56 : 0) +
        (targetUser && targetUser.is_moderator ? 34 : 0) +
        (targetUser && targetUser.is_banned ? 24 : 0) +
        Math.min(18, warningsCount)
      )
    }
    return [...adminUsers]
      .filter((item) => {
        if (!item) return false
        if (adminUserFilter === 'staff') return isOwnerUser(item) || item.is_admin || item.is_moderator
        if (adminUserFilter === 'risk') return item.is_banned || Number(item.warnings_count || 0) > 0
        if (adminUserFilter === 'banned') return item.is_banned === true
        if (adminUserFilter === 'verified') return item.is_verified === true
        if (adminUserFilter === 'unverified') return item.is_verified !== true
        return true
      })
      .sort((a, b) => {
        const priorityDiff = getPriority(b) - getPriority(a)
        if (priorityDiff !== 0) return priorityDiff
        const warningsDiff = Number(b.warnings_count || 0) - Number(a.warnings_count || 0)
        if (warningsDiff !== 0) return warningsDiff
        return String(a.username || '').localeCompare(String(b.username || ''))
      })
  }, [adminUsers, adminUserFilter])
  const adminRiskQueue = useMemo(() => (
    [...adminUsers]
      .filter((item) => item && (item.is_banned || Number(item.warnings_count || 0) > 0))
      .sort((a, b) => {
        if (Boolean(b.is_banned) !== Boolean(a.is_banned)) return Number(Boolean(b.is_banned)) - Number(Boolean(a.is_banned))
        const warningsDiff = Number(b.warnings_count || 0) - Number(a.warnings_count || 0)
        if (warningsDiff !== 0) return warningsDiff
        return String(a.username || '').localeCompare(String(b.username || ''))
      })
      .slice(0, 5)
  ), [adminUsers])
  const adminStaffBoard = useMemo(() => (
    [...adminUsers]
      .filter((item) => item && (isOwnerUser(item) || item.is_admin || item.is_moderator))
      .sort((a, b) => {
        const rankA = (isOwnerUser(a) ? 3 : 0) + (a && a.is_admin ? 2 : 0) + (a && a.is_moderator ? 1 : 0)
        const rankB = (isOwnerUser(b) ? 3 : 0) + (b && b.is_admin ? 2 : 0) + (b && b.is_moderator ? 1 : 0)
        if (rankB !== rankA) return rankB - rankA
        return String(a.username || '').localeCompare(String(b.username || ''))
      })
      .slice(0, 6)
  ), [adminUsers])
  const adminVerificationSpotlight = useMemo(() => {
    const pendingItems = adminVerificationRows.filter((item) => item.status === 'pending')
    if (pendingItems.length > 0) return pendingItems.slice(0, 4)
    return adminVerificationRows.slice(0, 4)
  }, [adminVerificationRows])
  const adminRoleCatalog = useMemo(() => (
    roleOptions
      .map((role) => {
        const members = adminUsers.filter((item) => getUserRoleList(item).includes(role.value))
        return {
          ...role,
          membersCount: members.length,
          staffCount: members.filter((item) => isOwnerUser(item) || item.is_admin || item.is_moderator).length,
          previewUsers: members.slice(0, 3).map((item) => `@${item.username}`)
        }
      })
      .sort((a, b) => {
        if (b.membersCount !== a.membersCount) return b.membersCount - a.membersCount
        return String(a.label || '').localeCompare(String(b.label || ''))
      })
  ), [roleOptions, adminUsers])
  const adminWorkspaceTabs = useMemo(() => ([
    { value: 'overview', label: 'Overview', meta: `${adminOverviewStats.staff} staff`, count: adminOverviewStats.usersTotal },
    { value: 'verification', label: 'Verification', meta: 'requests', count: adminOverviewStats.pendingVerification },
    { value: 'users', label: 'Users', meta: 'visible', count: adminVisibleUsers.length },
    { value: 'roles', label: 'Roles', meta: 'catalog', count: adminOverviewStats.roles }
  ]), [adminOverviewStats.pendingVerification, adminOverviewStats.roles, adminOverviewStats.staff, adminOverviewStats.usersTotal, adminVisibleUsers.length])
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
  const settingsDraftCount = useMemo(() => (
    Object.keys(draftsByConversation || {}).length
  ), [draftsByConversation])
  const appearanceEditableColors = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    return {
      accent: normalizeHexColor(normalized.accentColor, DEFAULT_UI_PREFERENCES.accentColor),
      accent2: normalizeHexColor(normalized.accent2Color, DEFAULT_UI_PREFERENCES.accent2Color),
      outline: normalizeHexColor(normalized.outlineColor, DEFAULT_UI_PREFERENCES.outlineColor),
      stripe: normalizeHexColor(normalized.stripeColor, DEFAULT_UI_PREFERENCES.stripeColor),
      chat: normalizeHexColor(normalized.chatAccentColor, DEFAULT_UI_PREFERENCES.chatAccentColor),
      feed: normalizeHexColor(normalized.feedAccentColor, DEFAULT_UI_PREFERENCES.feedAccentColor),
      bg: normalizeHexColor(normalized.bgColor, DEFAULT_UI_PREFERENCES.bgColor),
      panel: normalizeHexColor(normalized.panelColor, DEFAULT_UI_PREFERENCES.panelColor),
      panel2: normalizeHexColor(normalized.panel2Color, DEFAULT_UI_PREFERENCES.panel2Color),
      card: normalizeHexColor(normalized.cardColor, DEFAULT_UI_PREFERENCES.cardColor),
      text: normalizeHexColor(normalized.textColor, DEFAULT_UI_PREFERENCES.textColor),
      muted: normalizeHexColor(normalized.mutedColor, DEFAULT_UI_PREFERENCES.mutedColor)
    }
  }, [uiPreferences])
  const appearanceAccentPreview = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    if (normalized.syncAccent) {
      const accent = normalizeHexColor(
        profileForm.themeColor || (user && user.themeColor) || DEFAULT_UI_PREFERENCES.accentColor,
        DEFAULT_UI_PREFERENCES.accentColor
      )
      const accent2 = rgbToHex(mixRgbColor(hexToRgb(accent), { r: 255, g: 255, b: 255 }, theme === 'light' ? 0.14 : 0.24))
      return { accent, accent2 }
    }
    return {
      accent: normalizeHexColor(normalized.accentColor, DEFAULT_UI_PREFERENCES.accentColor),
      accent2: normalizeHexColor(normalized.accent2Color, DEFAULT_UI_PREFERENCES.accent2Color)
    }
  }, [profileForm.themeColor, theme, uiPreferences, user ? user.themeColor : null])
  const appearanceOutlinePreview = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    if (normalized.outlineMode === 'custom') {
      return normalizeHexColor(normalized.outlineColor, DEFAULT_UI_PREFERENCES.outlineColor)
    }
    if (theme === 'light' || normalized.style === 'neo') {
      return appearanceAccentPreview.accent
    }
    return '#ffffff'
  }, [appearanceAccentPreview.accent, theme, uiPreferences])
  const appearanceOutlinePreviewRgb = useMemo(() => (
    hexToRgb(appearanceOutlinePreview)
  ), [appearanceOutlinePreview])
  const appearanceActiveSceneId = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    const match = UI_THEME_SCENE_PRESETS.find((scene) => (
      areUiPreferencesEqual(scene.preferences, normalized) &&
      (!scene.theme || scene.theme === theme)
    ))
    return match ? match.id : ''
  }, [theme, uiPreferences])
  const appearanceActivePresetId = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    if (normalized.syncAccent) return ''
    const match = UI_THEME_COLOR_PRESETS.find((preset) => (
      normalizeHexColor(preset.accent, DEFAULT_UI_PREFERENCES.accentColor) === normalizeHexColor(normalized.accentColor, DEFAULT_UI_PREFERENCES.accentColor) &&
      normalizeHexColor(preset.accent2, DEFAULT_UI_PREFERENCES.accent2Color) === normalizeHexColor(normalized.accent2Color, DEFAULT_UI_PREFERENCES.accent2Color)
    ))
    return match ? match.id : ''
  }, [uiPreferences])
  const appearanceActiveCustomPresetId = useMemo(() => {
    const normalized = normalizeUiPreferences(uiPreferences)
    const match = uiCustomThemePresets.find((item) => areUiPreferencesEqual(item.preferences, normalized))
    return match ? match.id : ''
  }, [uiCustomThemePresets, uiPreferences])
  const settingsNavItems = useMemo(() => ([
    {
      id: 'general',
      group: 'workspace',
      icon: '⚙️',
      label: 'Общие настройки',
      description: 'Профиль, тема и базовые переключатели',
      badge: ''
    },
    {
      id: 'notifications',
      group: 'workspace',
      icon: '🔔',
      label: 'Уведомления',
      description: 'Push и сигналы браузера',
      badge: pushState.enabled ? 'ON' : 'OFF'
    },
    {
      id: 'appearance',
      group: 'workspace',
      icon: '🎨',
      label: 'Оформление',
      description: 'Сцены, палитра и плотность интерфейса',
      badge: getUiStyleLabel(uiPreferences.style)
    },
    {
      id: 'privacy',
      group: 'protection',
      icon: '🔒',
      label: 'Конфиденциальность',
      description: isEnglishUi ? 'Mute, block and visibility rules' : 'Мут, блокировки и правила видимости',
      badge: privacyControls.length > 0 ? String(privacyControls.length) : ''
    },
    {
      id: 'security',
      group: 'protection',
      icon: '🛡️',
      label: '2FA и защита',
      description: isEnglishUi ? 'Codes, backup codes and login safety' : 'Коды, резервные коды и защита входа',
      badge: twoFactorStatus.enabled ? '2FA' : ''
    },
    {
      id: 'password',
      group: 'protection',
      icon: '🔑',
      label: 'Пароль',
      description: 'Смена пароля и отзыв лишних входов',
      badge: ''
    },
    {
      id: 'sessions',
      group: 'protection',
      icon: '💻',
      label: 'Активные сеансы',
      description: 'Устройства, IP и ручная ревокация',
      badge: settingsActiveSessionCount > 0 ? String(settingsActiveSessionCount) : ''
    },
    {
      id: 'storage',
      group: 'library',
      icon: '🗂️',
      label: 'Данные и память',
      description: 'Черновики и локальные данные браузера',
      badge: settingsDraftCount > 0 ? String(settingsDraftCount) : ''
    },
    {
      id: 'stickers',
      group: 'library',
      icon: '😄',
      label: 'Стикеры и эмодзи',
      description: 'Быстрый вход в медиа-панель чатов',
      badge: myStickers.length > 0 ? String(myStickers.length) : ''
    },
    {
      id: 'language',
      group: 'library',
      icon: '🌐',
      label: 'Язык',
      description: 'Текущая локаль интерфейса',
      badge: appLanguage.toUpperCase()
    },
    {
      id: 'support',
      group: 'library',
      icon: '❓',
      label: 'Помощь',
      description: isEnglishUi ? 'FAQ, links and external help desk' : 'FAQ, ссылки и внешний центр помощи',
      badge: ''
    }
  ]), [
    appLanguage,
    isEnglishUi,
    myStickers.length,
    privacyControls.length,
    pushState.enabled,
    settingsActiveSessionCount,
    settingsDraftCount,
    twoFactorStatus.enabled,
    uiPreferences.style
  ])
  const settingsNavQueryNormalized = String(settingsNavQuery || '').trim().toLowerCase()
  const settingsVisibleNavItems = useMemo(() => {
    if (!settingsNavQueryNormalized) return settingsNavItems
    return settingsNavItems.filter((item) => (
      `${item.id} ${item.label} ${item.description || ''} ${item.badge || ''}`.toLowerCase().includes(settingsNavQueryNormalized)
    ))
  }, [settingsNavItems, settingsNavQueryNormalized])
  const settingsVisibleNavGroups = useMemo(() => {
    const groups = [
      { id: 'workspace', label: isEnglishUi ? 'Workspace' : 'Рабочее пространство', summary: isEnglishUi ? 'Profile, signals and visual layer' : 'Профиль, сигналы и визуальный слой' },
      { id: 'protection', label: isEnglishUi ? 'Protection' : 'Защита', summary: isEnglishUi ? 'Login safety and privacy control' : 'Защита входа и контроль приватности' },
      { id: 'library', label: isEnglishUi ? 'Storage & help' : 'Хранилище и помощь', summary: isEnglishUi ? 'Local data, language and support' : 'Локальные данные, язык и поддержка' }
    ]
    return groups.map((group) => ({
      ...group,
      items: settingsVisibleNavItems.filter((item) => item.group === group.id)
    })).filter((group) => group.items.length > 0)
  }, [isEnglishUi, settingsVisibleNavItems])
  const settingsQuickTabs = useMemo(() => (
    settingsNavItems.filter((item) => (
      item.id === 'general' ||
      item.id === 'privacy' ||
      item.id === 'security' ||
      item.id === 'sessions' ||
      item.id === 'appearance' ||
      item.id === 'notifications'
    ))
  ), [settingsNavItems])
  const settingsCurrentItem = useMemo(() => (
    settingsNavItems.find((item) => item.id === settingsSection) || settingsNavItems[0] || null
  ), [settingsNavItems, settingsSection])
  const settingsSectionHint = useMemo(() => {
    const hints = {
      general: 'Базовые параметры аккаунта и быстрые действия.',
      notifications: 'Управление push-уведомлениями и сигналами активности.',
      appearance: 'Тема, плотность и визуальный стиль интерфейса.',
      privacy: isEnglishUi ? 'Personal limits: mute, block, hide profile, deny DM.' : 'Персональные ограничения: мут, блок, скрытие профиля и запрет DM.',
      security: '2FA, резервные коды и защита входа в аккаунт.',
      password: 'Смена пароля с ревокацией остальных сессий.',
      sessions: 'Список устройств и завершение любых входов.',
      storage: 'Локальные данные и черновики в браузере.',
      stickers: 'Наборы стикеров и GIF для чатов.',
      language: 'Текущий язык интерфейса приложения.',
      support: 'Справка, FAQ и полезные ссылки.'
    }
    return hints[settingsSection] || 'Управление настройками аккаунта.'
  }, [isEnglishUi, settingsSection])
  const settingsPushBadge = pushState.enabled
    ? uiText('Push: вкл', 'Push ON')
    : pushState.permission === 'denied'
      ? uiText('Заблокировано', 'Blocked')
      : uiText('Push: выкл', 'Push OFF')
  const settingsIdentityBadge = theme === 'dark'
    ? uiText('Тёмная', 'Dark')
    : uiText('Светлая', 'Light')
  const settingsSecurityBadge = twoFactorStatus.enabled
    ? uiText('2FA вкл', '2FA ON')
    : uiText('2FA выкл', '2FA OFF')
  const settingsStatusChips = useMemo(() => {
    const chips = []
    if (user && user.isVerified) chips.push({ id: 'verified', tone: 'success', label: uiText('Проверен', 'Verified') })
    if (currentUserIsOwner) {
      chips.push({ id: 'owner', tone: 'accent', label: uiText('Владелец', 'Owner') })
    } else if (user && user.isAdmin) {
      chips.push({ id: 'admin', tone: 'accent', label: uiText('Админ', 'Admin') })
    }
    if (twoFactorStatus.enabled) chips.push({ id: '2fa', tone: 'success', label: uiText('2FA вкл', '2FA ON') })
    chips.push({ id: 'push', tone: pushState.enabled ? 'accent' : 'muted', label: settingsPushBadge })
    return chips
  }, [currentUserIsOwner, isEnglishUi, pushState.enabled, settingsPushBadge, twoFactorStatus.enabled, user])
  const settingsWorkspaceStats = useMemo(() => ([
    {
      id: 'security',
      label: uiText('Защита', 'Security'),
      value: settingsSecurityBadge,
      meta: isEnglishUi
        ? `${settingsActiveSessionCount} session${settingsActiveSessionCount === 1 ? '' : 's'}`
        : `${settingsActiveSessionCount} ${settingsActiveSessionCount === 1 ? 'сеанс' : 'сеансов'}`
    },
    {
      id: 'privacy',
      label: uiText('Приватность', 'Privacy'),
      value: privacyControls.length > 0 ? `${privacyControls.length}` : '0',
      meta: privacyControls.length > 0
        ? uiText('свои правила', 'custom rules')
        : uiText('правила', 'rules')
    },
    {
      id: 'style',
      label: uiText('Стиль', 'Style'),
      value: getUiStyleLabel(uiPreferences.style),
      meta: isEnglishUi ? `${settingsIdentityBadge} mode` : `${settingsIdentityBadge} режим`
    },
    {
      id: 'library',
      label: uiText('Медиатека', 'Library'),
      value: `${myStickers.length + myGifs.length}`,
      meta: uiText('стикеры + GIF', 'stickers + GIF')
    }
  ]), [
    isEnglishUi,
    myGifs.length,
    myStickers.length,
    privacyControls.length,
    settingsActiveSessionCount,
    settingsIdentityBadge,
    settingsSecurityBadge,
    uiPreferences.style
  ])
  const settingsPanelClassName = `panel settings-panel settings-panel-redesign settings-theme-${settingsSection}`.trim()
  const workspaceStrip = useMemo(() => {
    if (!user) return null

    const draftsCount = Object.keys(draftsByConversation || {}).length
    const activeConversationLabel = activeConversation
      ? String(
        activeConversation.name ||
        (activeConversation.other && (activeConversation.other.displayName || activeConversation.other.username)) ||
        ''
      ).trim()
      : ''

    if (view === 'dashboard') {
      return {
        kicker: uiText('Рабочий режим', 'Workspace mode'),
        title: uiText('Общий пульт пространства', 'Workspace command deck'),
        description: uiText(
          'Здесь виден срез по чатам, ленте и профилю. Быстро переключайся в проблемную зону или обновляй снимок.',
          'This view summarizes chats, feed and profile. Jump into the noisy area or refresh the snapshot.'
        ),
        chips: [
          { id: 'score', tone: 'accent', label: `${dashboardWorkspaceScore}% ${uiText('ритм', 'rhythm')}` },
          { id: 'chat', tone: unreadMessagesCount > 0 ? 'warn' : 'ok', label: uiText(`${unreadMessagesCount} непрочитанных`, `${unreadMessagesCount} unread`) },
          { id: 'feed', tone: feedDigest.freshCount > 0 ? 'accent' : 'neutral', label: uiText(`${feedDigest.freshCount} свежих в ленте`, `${feedDigest.freshCount} fresh in feed`) },
          { id: 'profile', tone: profileEditorScore >= 80 ? 'ok' : 'neutral', label: uiText(`${profileEditorScore}% профиль`, `${profileEditorScore}% profile`) }
        ],
        actions: [
          { id: 'refresh-snapshot', label: uiText('Обновить срез', 'Refresh snapshot'), hint: dashboardLastRefreshLabel || uiText('Сейчас', 'Now') },
          { id: 'go-chats', label: uiText('Открыть чаты', 'Open chats'), hint: uiText('Ответы и черновики', 'Replies and drafts') },
          { id: 'go-feed', label: uiText('Открыть ленту', 'Open feed'), hint: uiText('Тренды и посты', 'Trends and posts') }
        ]
      }
    }

    if (view === 'chats') {
      return {
        kicker: uiText('Коммуникация', 'Communication'),
        title: activeConversationLabel || uiText('Чаты и сообщения', 'Chats and messages'),
        description: activeConversation
          ? uiText(
            'Управляй сохранёнными сообщениями, медиа и быстрым переключением, не уходя далеко из диалога.',
            'Manage bookmarks, media and quick switches without leaving the conversation flow.'
          )
          : uiText(
            'Выбери диалог, открой медиа-панель или вернись к ленте, если нужен новый контекст.',
            'Pick a conversation, open the media panel or jump back to feed when you need fresh context.'
          ),
        chips: [
          { id: 'unread', tone: unreadMessagesCount > 0 ? 'warn' : 'ok', label: uiText(`${unreadMessagesCount} непрочитанных`, `${unreadMessagesCount} unread`) },
          { id: 'drafts', tone: draftsCount > 0 ? 'accent' : 'neutral', label: uiText(`${draftsCount} черновиков`, `${draftsCount} drafts`) },
          { id: 'bookmarks', tone: bookmarkPanelOpen ? 'accent' : 'neutral', label: bookmarkPanelOpen ? uiText('Закладки открыты', 'Bookmarks open') : uiText('Закладки скрыты', 'Bookmarks hidden') },
          { id: 'media', tone: mediaPanelOpen ? 'accent' : 'neutral', label: mediaPanelOpen ? uiText('Медиа-панель активна', 'Media panel active') : uiText('Медиа-панель закрыта', 'Media panel closed') }
        ],
        actions: [
          { id: 'chat-bookmarks', label: uiText('Сохранённые', 'Bookmarks'), hint: uiText('Открыть быстрый архив', 'Open quick archive') },
          { id: 'chat-stickers', label: uiText('Стикеры', 'Stickers'), hint: uiText('Панель медиа', 'Media panel') },
          { id: 'go-dashboard', label: uiText('Назад к пульту', 'Back to deck'), hint: uiText('Общая сводка', 'Overview') }
        ]
      }
    }

    if (view === 'feed') {
      return {
        kicker: uiText('Лента и контент', 'Feed and content'),
        title: uiText('Поток внимания и публикаций', 'Attention and publishing flow'),
        description: uiText(
          'Следи за свежими постами, быстро возвращайся к своему composer и держи профиль в одной связке с лентой.',
          'Track fresh posts, jump back into composer and keep your profile tied to the feed workflow.'
        ),
        chips: [
          { id: 'fresh', tone: feedDigest.freshCount > 0 ? 'accent' : 'neutral', label: uiText(`${feedDigest.freshCount} свежих`, `${feedDigest.freshCount} fresh`) },
          { id: 'filters', tone: feedActiveFilterCount > 0 ? 'warn' : 'ok', label: uiText(`${feedActiveFilterCount} фильтров`, `${feedActiveFilterCount} filters`) },
          { id: 'mine', tone: feedMetrics.mine > 0 ? 'ok' : 'neutral', label: uiText(`${feedMetrics.mine} моих постов`, `${feedMetrics.mine} my posts`) },
          { id: 'window', tone: 'neutral', label: `${feedTimeWindowLabel} / ${feedSortModeLabel}` }
        ],
        actions: [
          { id: 'feed-compose', label: uiText('Новый пост', 'New post'), hint: uiText('Фокус на composer', 'Focus composer') },
          { id: 'go-profile', label: uiText('Профиль', 'Profile'), hint: uiText('Показать витрину', 'Open showcase') },
          { id: 'go-dashboard', label: uiText('Пульт', 'Deck'), hint: uiText('Вернуться к сводке', 'Back to overview') }
        ]
      }
    }

    if (view === 'settings') {
      return {
        kicker: uiText('Настройки и контроль', 'Settings and control'),
        title: settingsCurrentItem ? settingsCurrentItem.label : uiText('Настройки аккаунта', 'Account settings'),
        description: uiText(
          'Быстрый доступ к самому частому: оформление, уведомления, безопасность и возврат в профиль.',
          'Quick access to the frequent tools: appearance, notifications, security and profile return path.'
        ),
        chips: [
          { id: 'theme', tone: 'accent', label: `${settingsIdentityBadge} / ${getUiStyleLabel(uiPreferences.style)}` },
          { id: 'push', tone: pushState.enabled ? 'ok' : 'warn', label: settingsPushBadge },
          { id: 'security', tone: twoFactorStatus.enabled ? 'ok' : 'neutral', label: settingsSecurityBadge },
          { id: 'section', tone: 'neutral', label: settingsCurrentItem ? settingsCurrentItem.description : uiText('Панель настроек', 'Settings panel') }
        ],
        actions: [
          { id: 'settings-appearance', label: uiText('Оформление', 'Appearance'), hint: uiText('Сцены и акценты', 'Scenes and accents') },
          { id: 'settings-notifications', label: uiText('Уведомления', 'Notifications'), hint: uiText('Push и сигналы', 'Push and signals') },
          { id: 'settings-security', label: uiText('Безопасность', 'Security'), hint: uiText('2FA и защита', '2FA and login safety') }
        ]
      }
    }

    if (view === 'profile') {
      return {
        kicker: uiText('Профиль и витрина', 'Profile and showcase'),
        title: uiText('Личный бренд и карточка профиля', 'Personal brand and profile card'),
        description: uiText(
          'Держи под рукой состояние профиля, достижения и быстрый переход к постам или настройкам.',
          'Keep profile status, achievements and quick jumps to posts or settings within reach.'
        ),
        chips: [
          { id: 'score', tone: profileEditorScore >= 80 ? 'ok' : 'accent', label: uiText(`${profileEditorScore}% готовности`, `${profileEditorScore}% ready`) },
          { id: 'pending', tone: profileEditorPendingChecklist.length > 0 ? 'warn' : 'ok', label: uiText(`${profileEditorPendingChecklist.length} задач`, `${profileEditorPendingChecklist.length} tasks`) },
          { id: 'achievements', tone: profileAchievementsProgress >= 70 ? 'ok' : 'neutral', label: uiText(`${profileAchievementsProgress}% ачивок`, `${profileAchievementsProgress}% achievements`) },
          { id: 'tracks', tone: myTracks.length > 0 ? 'accent' : 'neutral', label: uiText(`${myTracks.length} треков`, `${myTracks.length} tracks`) }
        ],
        actions: [
          { id: 'go-settings', label: uiText('Настройки', 'Settings'), hint: uiText('Аккаунт и приватность', 'Account and privacy') },
          { id: 'feed-compose', label: uiText('Новый пост', 'New post'), hint: uiText('Поделиться обновлением', 'Share an update') },
          { id: 'go-chats', label: uiText('Чаты', 'Chats'), hint: uiText('Связаться с людьми', 'Talk to people') }
        ]
      }
    }

    if (view === 'admin') {
      return {
        kicker: uiText('Админ-зона', 'Admin zone'),
        title: uiText('Контроль пользователей и модерации', 'User and moderation control'),
        description: uiText(
          'Держи быстрый путь назад к рабочей панели и в пользовательские разделы, пока админка открыта.',
          'Keep a fast route back to the workspace deck and user sections while admin tools are open.'
        ),
        chips: [
          { id: 'role', tone: 'accent', label: currentUserIsOwner ? uiText('Владелец', 'Owner') : uiText('Админ', 'Admin') },
          { id: 'push', tone: pushState.enabled ? 'ok' : 'neutral', label: settingsPushBadge },
          { id: 'security', tone: twoFactorStatus.enabled ? 'ok' : 'warn', label: settingsSecurityBadge }
        ],
        actions: [
          { id: 'go-dashboard', label: uiText('Пульт', 'Deck'), hint: uiText('Вернуться к обзору', 'Back to overview') },
          { id: 'go-settings', label: uiText('Настройки', 'Settings'), hint: uiText('Аккаунт и сигналы', 'Account and signals') },
          { id: 'go-chats', label: uiText('Чаты', 'Chats'), hint: uiText('Связаться с участниками', 'Open conversations') }
        ]
      }
    }

    return null
  }, [
    activeConversation,
    bookmarkPanelOpen,
    currentUserIsOwner,
    dashboardLastRefreshLabel,
    dashboardWorkspaceScore,
    draftsByConversation,
    feedActiveFilterCount,
    feedDigest.freshCount,
    feedMetrics.mine,
    feedSortModeLabel,
    feedTimeWindowLabel,
    getUiStyleLabel,
    myTracks.length,
    profileAchievementsProgress,
    profileEditorPendingChecklist.length,
    profileEditorScore,
    pushState.enabled,
    settingsCurrentItem,
    settingsIdentityBadge,
    settingsPushBadge,
    settingsSecurityBadge,
    twoFactorStatus.enabled,
    uiPreferences.style,
    unreadMessagesCount,
    user,
    view
  ])
  const showPageScene = false

  const runWorkspaceStripAction = (actionId) => {
    if (!actionId) return
    if (actionId === 'refresh-snapshot') {
      refreshWorkspaceSnapshot()
      return
    }
    if (actionId === 'go-dashboard') {
      setView('dashboard')
      return
    }
    if (actionId === 'go-feed') {
      setView('feed')
      return
    }
    if (actionId === 'go-chats') {
      setView('chats')
      setChatMobilePane('list')
      return
    }
    if (actionId === 'go-profile') {
      setView('profile')
      return
    }
    if (actionId === 'go-settings') {
      setView('settings')
      return
    }
    if (actionId === 'settings-appearance') {
      setView('settings')
      setSettingsSection('appearance')
      return
    }
    if (actionId === 'settings-notifications') {
      setView('settings')
      setSettingsSection('notifications')
      return
    }
    if (actionId === 'settings-security') {
      setView('settings')
      setSettingsSection('security')
      return
    }
    if (actionId === 'feed-compose') {
      focusFeedComposer()
      return
    }
    if (actionId === 'chat-bookmarks') {
      setView('chats')
      if (activeConversation) {
        setBookmarkPanelOpen((prev) => !prev)
      }
      return
    }
    if (actionId === 'chat-stickers') {
      setView('chats')
      setMediaPanelTab(MEDIA_PANEL_TABS.stickers)
      setMediaPanelOpen(true)
    }
  }

  const navigationRailItems = user ? [
    {
      id: 'dashboard',
      label: uiText('Панель', 'Deck'),
      active: view === 'dashboard',
      icon: icons.dashboard,
      onClick: () => setView('dashboard')
    },
    {
      id: 'feed',
      label: uiText('Лента', 'Feed'),
      active: view === 'feed',
      icon: icons.feed,
      onClick: () => setView('feed')
    },
    {
      id: 'chats',
      label: uiText('Чаты', 'Chats'),
      active: view === 'chats',
      icon: icons.chats,
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : unreadMessagesCount) : '',
      ariaLabel: unreadMessagesCount > 0
        ? uiText(`Чаты, непрочитанных сообщений: ${unreadMessagesCount}`, `Chats, unread messages: ${unreadMessagesCount}`)
        : uiText('Чаты', 'Chats'),
      onClick: () => {
        setView('chats')
        setChatMobilePane('list')
      }
    },
    ...(user.isAdmin
      ? [{
        id: 'admin',
        label: uiText('Админ', 'Admin'),
        active: view === 'admin',
        icon: icons.admin,
        onClick: () => setView('admin')
      }]
      : []),
    {
      id: 'settings',
      label: uiText('Настройки', 'Settings'),
      active: view === 'settings',
      icon: icons.settings,
      onClick: () => setView('settings')
    },
    {
      id: 'profile',
      label: uiText('Профиль', 'Profile'),
      active: view === 'profile',
      icon: icons.profile,
      onClick: () => setView('profile')
    }
  ] : []

  return (
    <div className={`page page-view-${view} ${user ? 'page-authenticated' : 'page-guest'}`.trim()}>
      {showPageScene ? (
        <div className="page-scene" aria-hidden="true">
          <span className="page-scene-orb page-scene-orb-primary" />
          <span className="page-scene-orb page-scene-orb-secondary" />
          <span className="page-scene-orb page-scene-orb-tertiary" />
          <span className="page-scene-ribbon" />
          <span className="page-scene-grid" />
          <span className="page-scene-noise" />
        </div>
      ) : null}
      <main className={`content ${user ? 'content-authenticated' : 'content-guest'}`.trim()}>
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
              title={pushState.permission === 'denied'
                ? uiText('Разрешите уведомления в настройках браузера', 'Allow notifications in browser settings')
                : uiText('Управление уведомлениями', 'Manage notifications')}
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

        {user && workspaceStrip ? (
          <section
            className={`workspace-strip workspace-strip-view-${view} ${workspaceStripCollapsed ? 'workspace-strip-collapsed' : ''}`.trim()}
            aria-label={workspaceStrip.title}
          >
            <div className="workspace-strip-main">
              <div className="workspace-strip-headline">
                <span className="workspace-strip-kicker">{workspaceStrip.kicker}</span>
                <button
                  type="button"
                  className="workspace-strip-toggle"
                  onClick={() => setWorkspaceStripCollapsed((prev) => !prev)}
                  aria-expanded={!workspaceStripCollapsed}
                >
                  {workspaceStripCollapsed
                    ? uiText('Развернуть', 'Expand')
                    : uiText('Свернуть', 'Collapse')}
                </button>
              </div>
              <strong>{workspaceStrip.title}</strong>
              {!workspaceStripCollapsed ? <p>{workspaceStrip.description}</p> : null}
            </div>
            <div className="workspace-strip-status">
              {workspaceStrip.chips.map((chip) => (
                <span key={chip.id} className={`workspace-strip-chip tone-${chip.tone || 'neutral'}`.trim()}>
                  {chip.label}
                </span>
              ))}
            </div>
            {!workspaceStripCollapsed ? (
              <div className="workspace-strip-actions">
                {workspaceStrip.actions.map((action) => (
                  <button key={action.id} type="button" onClick={() => runWorkspaceStripAction(action.id)}>
                    <strong>{action.label}</strong>
                    <span>{action.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

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
                        const roleLabel = canViewerSeeRoleInfo(item)
                          ? (item && item.role ? (roleLabelByValue.get(String(item.role)) || item.role) : 'Студент')
                          : ''
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
                              <span>{roleLabel ? `@${item.username} • ${roleLabel}` : `@${item.username}`}</span>
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
                    {uiText('Realtime', 'Realtime')}: {socketConnection === 'connected' ? 'ON' : socketConnection === 'connecting' ? '...' : 'OFF'}
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

            <section className={`dashboard-mission-board mode-${dashboardWorkbenchMode}`.trim()}>
              <article className="dashboard-mission-panel">
                <div className="dashboard-card-head">
                  <div>
                    <strong>{uiText('Центр миссии', 'Mission Control')}</strong>
                    <span>{dashboardWorkbenchSummary.description}</span>
                  </div>
                  <span className="dashboard-mission-badge">{dashboardWorkbenchSummary.badge}</span>
                </div>
                <div className="dashboard-mission-hero">
                  <div className="dashboard-mission-score">
                    <strong>{dashboardWorkspaceScore}</strong>
                    <span>{uiText('индекс пространства', 'workspace score')}</span>
                  </div>
                  <div className="dashboard-mission-copy">
                    <span className="dashboard-mission-kicker">{dashboardWorkbenchSummary.title}</span>
                    <h3>Выбери рабочую полосу и держи весь стек под рукой.</h3>
                    <div className="dashboard-workbench-switch" role="tablist" aria-label={uiText('Режим рабочей полосы', 'Dashboard workbench mode')}>
                      {DASHBOARD_WORKBENCH_MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          className={dashboardWorkbenchMode === mode.value ? 'active' : ''}
                          onClick={() => updateDashboardWorkbenchMode(mode.value)}
                        >
                          <strong>{getWorkbenchModeLabel(mode)}</strong>
                          <small>{getWorkbenchModeHint(mode)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="dashboard-mission-signals">
                  {dashboardMissionSignals.map((item) => (
                    <article key={item.id}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
                <div className="dashboard-launchpad-grid">
                  {dashboardQuickActions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`dashboard-launchpad-card accent-${item.accent}`.trim()}
                      onClick={() => runDashboardWorkbenchAction(item.action)}
                    >
                      <span className="dashboard-launchpad-icon">{item.icon}</span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </article>
              <article className="dashboard-scratchpad-panel">
                <div className="dashboard-card-head">
                  <div>
                    <strong>{uiText('Блокнот', 'Scratchpad')}</strong>
                    <span>локальные заметки, быстрые формулировки и подготовка к посту</span>
                  </div>
                  <span className="dashboard-scratchpad-meta">{String(dashboardScratchpad || '').trim().length} {uiText('симв.', 'chars')}</span>
                </div>
                <textarea
                  value={dashboardScratchpad}
                  onChange={(event) => setDashboardScratchpad(event.target.value)}
                  placeholder="Запиши следующий шаг, тезисы для поста или что нужно добить в профиле..."
                />
                <div className="dashboard-scratchpad-templates">
                  {dashboardScratchpadTemplates.map((item) => (
                    <button
                      key={`${dashboardWorkbenchMode}-${item}`}
                      type="button"
                      className="ghost"
                      onClick={() => appendDashboardScratchpadTemplate(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="dashboard-scratchpad-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => runDashboardWorkbenchAction('compose', { template: dashboardScratchpad })}
                  >
                    {uiText('В редактор', 'To composer')}
                  </button>
                  <button type="button" className="ghost" onClick={() => setDashboardScratchpad('')}>
                    Очистить
                  </button>
                </div>
                <div className="dashboard-workbench-cards">
                  {dashboardWorkbenchCards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="dashboard-workbench-card"
                      onClick={() => runDashboardWorkbenchAction(item.action, item.payload)}
                    >
                      <span>{item.eyebrow}</span>
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="dashboard-command-deck">
              <div className="dashboard-card-head">
                <div>
                  <strong>Командная строка</strong>
                  <span>команды: unread, drafts, hot, inbox, compose, mine, bookmarks, profile, chats, feed, refresh, push, mode:focus, #тег, @автор</span>
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
              <article className="dashboard-functional-card dashboard-inbox-card">
                <div className="dashboard-card-head">
                  <div>
                    <strong>{uiText('Входящие', 'Inbox')}</strong>
                    <span>{uiText('чаты, лента, профиль и системные сигналы в одном компактном блоке', 'chats, feed, profile, and system signals in one compact block')}</span>
                  </div>
                  <span className="dashboard-inbox-health">{dashboardPulseHealthLabel}</span>
                </div>
                <div className="dashboard-inbox-stats">
                  <article>
                    <span>{uiText('Активно', 'Active')}</span>
                    <strong>{pulseActiveItems.length}</strong>
                  </article>
                  <article>
                    <span>{uiText('Важное', 'Priority')}</span>
                    <strong>{pulsePriorityCount}</strong>
                  </article>
                  <article>
                    <span>{uiText('Готово', 'Done')}</span>
                    <strong>{pulseResolvedCount}</strong>
                  </article>
                </div>
                <div className="dashboard-inbox-filters" role="tablist" aria-label={uiText('Фильтры входящих', 'Inbox filters')}>
                  {PULSE_TAB_OPTIONS.map((item) => (
                    <button
                      key={`dashboard-inbox-tab-${item.value}`}
                      type="button"
                      className={pulseTab === item.value ? 'active' : ''}
                      onClick={() => setPulseTab(item.value)}
                    >
                      <strong>{getPulseTabLabel(item)}</strong>
                      <span>{pulseTabCounts[item.value] || 0}</span>
                    </button>
                  ))}
                </div>
                {dashboardPulseVisibleItems.length === 0 ? (
                  <div className="dashboard-inbox-empty">{dashboardPulseEmptyLabel}</div>
                ) : (
                  <div className="dashboard-inbox-list">
                    {dashboardPulseVisibleItems.map((item) => {
                      const isArchived = pulseDismissedIdSet.has(item.id)
                      const laneLabel = PULSE_LANE_LABELS[item.lane] || uiText('Обзор', 'Overview')
                      const relativeAge = item.timestamp ? formatRelativeFeedAge(item.timestamp) : ''
                      return (
                        <div key={`dashboard-inbox-${item.id}`} className={`dashboard-inbox-item tone-${item.tone || 'neutral'}`.trim()}>
                          <button
                            type="button"
                            className="dashboard-inbox-item-main"
                            onClick={() => runPulseAction(item)}
                          >
                            <div className="dashboard-inbox-item-top">
                              <span>{laneLabel}</span>
                              <span>P{item.priority}</span>
                            </div>
                            <strong>{item.title}</strong>
                            <small>{item.text}</small>
                            <div className="dashboard-inbox-item-meta">
                              <span>{item.meta || item.cta}</span>
                              {relativeAge && <span>{relativeAge}</span>}
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-inbox-action ${isArchived ? 'restore' : 'dismiss'}`.trim()}
                            onClick={() => (isArchived ? restorePulseItem(item.id) : dismissPulseItem(item.id))}
                            title={isArchived
                              ? uiText('Вернуть пункт', 'Restore item')
                              : uiText('Скрыть пункт', 'Hide item')}
                          >
                            {isArchived ? '↺' : '✓'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="dashboard-inbox-actions">
                  {pulseResolvedCount > 0 && (
                    <button type="button" className="ghost" onClick={restoreAllPulseItems}>
                      {uiText('Вернуть скрытое', 'Restore hidden')}
                    </button>
                  )}
                  <button type="button" className="ghost" onClick={refreshWorkspaceSnapshot}>
                    {uiText('Обновить', 'Refresh')}
                  </button>
                </div>
              </article>

              <article className="dashboard-functional-card">
                <div className="dashboard-card-head">
                  <div>
                    <strong>{uiText('Следующие шаги', 'Next moves')}</strong>
                    <span>что стоит сделать прямо сейчас</span>
                  </div>
                </div>
                {dashboardFocusQueue.length === 0 ? (
                  <div className="dashboard-functional-note">Очередь спокойная. Можно переключиться на публикацию, тренды или тонкую настройку профиля.</div>
                ) : (
                  <div className="dashboard-functional-list">
                    {dashboardFocusQueue.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="dashboard-functional-row-main"
                        onClick={() => runDashboardWorkbenchAction(item.action)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="dashboard-shortcut-row">
                  <button type="button" className="ghost" onClick={() => runDashboardWorkbenchAction('compose')}>
                    Новый пост
                  </button>
                  <button type="button" className="ghost" onClick={() => runDashboardWorkbenchAction('bookmarks')}>
                    Закладки
                  </button>
                  <button type="button" className="ghost" onClick={() => openPulseWorkspace(PULSE_TABS.priority)}>
                    {uiText('Входящие', 'Inbox')}
                  </button>
                  <button type="button" className="ghost" onClick={() => runDashboardWorkbenchAction('settings')}>
                    Настройки
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
                      {uiText('Умный', 'Smart')}
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
          <div className={`chat-layout chat-layout-surface ${activeConversation && chatMobilePane === 'chat' ? 'chat-layout-mobile-active' : ''}`.trim()}>
            <section className="chat-list">
              <div className="chat-list-hero">
                <div className="chat-list-hero-main">
                  <span className="chat-list-hero-overline">{uiText('Диалоги', 'Conversations')}</span>
                  <strong>{uiText('Центр сообщений', 'Message Center')}</strong>
                </div>
                <div className="chat-list-hero-stats">
                  <span>{conversations.length} {uiText('всего', 'total')}</span>
                  <span>{unreadConversationCount} {uiText('непрочитанных', 'unread')}</span>
                  <span>{favoriteConversationCount} {uiText('избранных', 'favorites')}</span>
                </div>
              </div>
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

              <div className="chat-items" onScroll={closeChatListSwipe}>
                {conversationsLoading && (
                  <div className="chat-skeleton-list" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={`chat-list-skeleton-${index}`} className="chat-item-skeleton">
                        <span className="chat-skeleton-avatar" />
                        <div className="chat-skeleton-copy">
                          <span className="chat-skeleton-line short" />
                          <span className="chat-skeleton-line" />
                        </div>
                        <div className="chat-skeleton-side">
                          <span className="chat-skeleton-line tiny" />
                          <span className="chat-skeleton-pill" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!conversationsLoading && conversations.length === 0 && (
                  <div className="chat-empty-card chat-empty-card-list">
                    <span className="chat-empty-eyebrow">{uiText('Центр сообщений', 'Message center')}</span>
                    <h3>{uiText('Пока нет диалогов', 'No conversations yet')}</h3>
                    <p>{uiText('Найдите человека по username или соберите первый групповой чат.', 'Search by username or create your first group chat.')}</p>
                    <div className="chat-empty-actions">
                      <button type="button" className="primary" onClick={focusChatDirectorySearch}>
                        {uiText('Найти людей', 'Find people')}
                      </button>
                      <button type="button" className="ghost" onClick={() => setGroupOpen(true)}>
                        {uiText('Новая группа', 'New group')}
                      </button>
                      <button type="button" className="ghost" onClick={() => setView('feed')}>
                        {uiText('Открыть ленту', 'Open feed')}
                      </button>
                    </div>
                  </div>
                )}
                {!conversationsLoading && conversations.length > 0 && visibleConversations.length === 0 && (
                  <div className="chat-empty-card chat-empty-card-list">
                    <span className="chat-empty-eyebrow">
                      {chatListFilter === CHAT_LIST_FILTERS.unread
                        ? uiText('Inbox clean', 'Inbox clean')
                        : uiText('Избранное', 'Favorites')}
                    </span>
                    <h3>
                      {chatListFilter === CHAT_LIST_FILTERS.unread
                        ? uiText('Новых сообщений нет', 'No unread conversations')
                        : uiText('Избранное пока пустое', 'No favorites yet')}
                    </h3>
                    <p>
                      {chatListFilter === CHAT_LIST_FILTERS.unread
                        ? uiText('Переключитесь на все диалоги или откройте избранные для быстрого доступа.', 'Switch back to all chats or jump into favorites for quick access.')
                        : uiText('Свайпните карточку чата влево, чтобы закрепить его в быстром доступе.', 'Swipe a chat card left to pin it into quick access.')}
                    </p>
                    <div className="chat-empty-actions">
                      <button type="button" className="primary" onClick={() => setChatListFilter(CHAT_LIST_FILTERS.all)}>
                        {uiText('Показать все', 'Show all')}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setChatListFilter(
                          chatListFilter === CHAT_LIST_FILTERS.unread ? CHAT_LIST_FILTERS.favorites : CHAT_LIST_FILTERS.unread
                        )}
                      >
                        {chatListFilter === CHAT_LIST_FILTERS.unread
                          ? uiText('Открыть избранное', 'Open favorites')
                          : uiText('Проверить непрочитанное', 'Check unread')}
                      </button>
                    </div>
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
                  const swipeOffset = chatListSwipe.conversationId === conv.id ? chatListSwipe.offset : 0
                  const isSwipeDragging = chatListSwipe.conversationId === conv.id && chatListSwipe.dragging
                  const secondarySwipeAction = unreadCount > 0
                    ? {
                      key: 'read',
                      tone: 'ok',
                      icon: '✓',
                      label: uiText('Прочитано', 'Read'),
                      action: () => clearConversationUnread(conv.id)
                    }
                    : (!conv.isGroup && conv.other && conv.other.username
                      ? {
                        key: 'profile',
                        tone: 'neutral',
                        icon: '@',
                        label: uiText('Профиль', 'Profile'),
                        action: () => openProfile(conv.other.username)
                      }
                      : {
                        key: 'open',
                        tone: 'neutral',
                        icon: '→',
                        label: uiText('Открыть', 'Open'),
                        action: () => openConversationFromChatList(conv)
                      })
                  return (
                    <div
                      key={conv.id}
                      className={`chat-item-shell ${swipeOffset < 0 ? 'swipe-open' : ''} ${isSwipeDragging ? 'dragging' : ''}`.trim()}
                    >
                      <div className="chat-item-actions" aria-hidden={swipeOffset === 0}>
                        <button
                          type="button"
                          className={`chat-item-action-btn tone-favorite ${isFavorite ? 'active' : ''}`.trim()}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleConversationFavorite(conv.id)
                            closeChatListSwipe()
                          }}
                        >
                          <span>{isFavorite ? '★' : '☆'}</span>
                          <strong>{isFavorite ? uiText('Убрать', 'Unsave') : uiText('В избр.', 'Save')}</strong>
                        </button>
                        <button
                          type="button"
                          className={`chat-item-action-btn tone-${secondarySwipeAction.tone}`.trim()}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            secondarySwipeAction.action()
                            closeChatListSwipe()
                          }}
                        >
                          <span>{secondarySwipeAction.icon}</span>
                          <strong>{secondarySwipeAction.label}</strong>
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`chat-item ${isActive ? 'active' : ''} ${!isActive && unreadCount > 0 ? 'unread' : ''} ${isFavorite ? 'favorite' : ''}`.trim()}
                        style={swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
                        onClick={() => {
                          if (swipeOffset < 0) {
                            closeChatListSwipe()
                            return
                          }
                          openConversationFromChatList(conv)
                        }}
                        onTouchStart={(event) => handleChatItemSwipeStart(event, conv.id)}
                        onTouchMove={(event) => handleChatItemSwipeMove(event, conv.id)}
                        onTouchEnd={() => finalizeChatItemSwipe(conv.id)}
                        onTouchCancel={() => finalizeChatItemSwipe(conv.id)}
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
                    </div>
                  )
                })}
              </div>
            </section>

            <section className={`chat-window chat-wallpaper-${activeChatWallpaper.value} ${isMobileComposerDocked ? 'chat-window-composer-docked' : ''}`.trim()}>
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
                            ? 'Вы заблокировали этого пользователя.'
                            : (activeConversationPrivacy.blockedByTarget
                              ? 'Этот пользователь заблокировал вас.'
                              : 'Личные сообщения заблокированы настройками приватности.')}
                        </span>
                        {activeConversationPrivacy.isBlocked && (
                          <button type="button" onClick={toggleChatBlock}>Разблокировать</button>
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
                    {messagesLoading && (
                      <div className="chat-message-skeleton-list" aria-hidden="true">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={`chat-message-skeleton-${index}`}
                            className={`chat-message-skeleton-row ${index % 2 === 1 ? 'mine' : ''}`.trim()}
                          >
                            <div className="chat-message-skeleton-bubble">
                              <span className="chat-skeleton-line short" />
                              <span className="chat-skeleton-line" />
                              <span className="chat-skeleton-line medium" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!messagesLoading && filteredMessages.length === 0 && (
                      <div className="chat-empty-card chat-empty-card-inline">
                        <span className="chat-empty-eyebrow">
                          {chatSearchQuery
                            ? uiText('Поиск внутри чата', 'In-chat search')
                            : (activeConversation.isGroup ? uiText('Новый тред', 'New thread') : activeChatTitle)}
                        </span>
                        <h3>
                          {chatSearchQuery
                            ? uiText('Ничего не найдено', 'Nothing found')
                            : (isChatBlocked
                              ? uiText('Отправка недоступна', 'Messaging unavailable')
                              : (activeConversation.isGroup
                                ? uiText('Запустите обсуждение', 'Start the conversation')
                                : uiText(`Начните чат с ${activeChatTitle}`, `Start chatting with ${activeChatTitle}`)))}
                        </h3>
                        <p>
                          {chatSearchQuery
                            ? uiText('Попробуйте другое слово или сбросьте поиск внутри диалога.', 'Try another term or clear the conversation search.')
                            : (isChatBlocked
                              ? uiText('Для этого пользователя переписка сейчас закрыта. Можно открыть профиль или вернуться к списку.', 'Messaging with this user is currently closed. Open the profile or return to the list.')
                              : (activeConversation.isGroup
                                ? uiText('Пустой чат удобнее запускать готовым сообщением: план, синхронизация или быстрый вопрос.', 'An empty group chat is easier to kick off with a plan, sync, or quick question.')
                                : uiText('Отправьте первое сообщение или используйте один из быстрых шаблонов ниже.', 'Send the first message or start from one of the quick prompts below.')))}
                        </p>
                        {chatSearchQuery ? (
                          <div className="chat-empty-actions chat-empty-actions-compact">
                            <button type="button" className="primary" onClick={() => setChatSearchQuery('')}>
                              {uiText('Сбросить поиск', 'Clear search')}
                            </button>
                          </div>
                        ) : isChatBlocked ? (
                          <div className="chat-empty-actions chat-empty-actions-compact">
                            {!activeConversation.isGroup && activeConversation.other && activeConversation.other.username && (
                              <button
                                type="button"
                                className="primary"
                                onClick={() => openProfile(activeConversation.other.username)}
                              >
                                {uiText('Открыть профиль', 'Open profile')}
                              </button>
                            )}
                            <button type="button" className="ghost" onClick={() => setChatMobilePane('list')}>
                              {uiText('К списку чатов', 'Back to chat list')}
                            </button>
                          </div>
                        ) : (
                          <div className="chat-empty-suggestions">
                            {activeConversationEmptyPrompts.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="chat-empty-suggestion"
                                onClick={() => applyCommandSuggestion(item.template)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  {!messagesLoading && filteredMessages.map((msg) => (
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
                  {mobileChatQuickReplies.length > 0 && (
                    <div className="chat-quick-replies" aria-label={uiText('Быстрые ответы', 'Quick replies')}>
                      {mobileChatQuickReplies.map((item) => (
                        <button
                          key={`chat-quick-reply-${item.id}`}
                          type="button"
                          onClick={() => applyCommandSuggestion(item.label)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    className={`composer ${isChatBlocked ? 'disabled' : ''}`.trim()}
                    onSubmit={handleSendMessage}
                    onFocusCapture={handleChatComposerFocus}
                    onBlurCapture={handleChatComposerBlur}
                  >
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
                    <div className="composer-input-row">
                      <input
                        ref={composerInputRef}
                        type="text"
                        value={messageText}
                        onChange={handleMessageInputChange}
                        placeholder="Сообщение..."
                        disabled={isChatBlocked}
                      />
                      <button className="primary composer-send-btn" type="submit" disabled={loading || isChatBlocked}>
                        {uiText('Отправить', 'Send')}
                      </button>
                    </div>
                    <div className="composer-tools-row">
                      <label className="file-btn composer-tool-btn">
                        <span>{uiText('Файл', 'File')}</span>
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
                        className={`record-btn media-trigger-btn composer-tool-btn ${mediaPanelOpen ? 'active' : ''}`.trim()}
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
                        className={`record-btn poll-trigger-btn composer-tool-btn ${pollComposerOpen ? 'active' : ''}`.trim()}
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
                        className={`record-btn composer-tool-btn ${videoNoteRecording ? 'recording' : ''}`}
                        onClick={toggleVideoNoteRecording}
                        disabled={isChatBlocked}
                        title={videoNoteRecording ? uiText('Остановить запись', 'Stop recording') : uiText('Записать видео', 'Record video')}
                      >
                        {videoNoteRecording ? uiText(`Стоп ${videoNoteDuration}с`, `Stop ${videoNoteDuration}s`) : uiText('Видео', 'Video')}
                      </button>
                    </div>
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
                <div className="chat-empty chat-empty-card chat-empty-card-window">
                  <span className="chat-empty-eyebrow">{uiText('Чаты', 'Chats')}</span>
                  <h3>{uiText('Выберите диалог', 'Pick a conversation')}</h3>
                  <p>{uiText('Откройте существующий чат, свайпните карточку для быстрых действий или найдите пользователя по username.', 'Open an existing chat, swipe a card for quick actions, or search by username.')}</p>
                  <div className="chat-empty-actions">
                    <button type="button" className="primary" onClick={focusChatDirectorySearch}>
                      {uiText('Найти человека', 'Find someone')}
                    </button>
                    {visibleConversations.length > 0 && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => openConversationFromChatList(visibleConversations[0])}
                      >
                        {uiText('Открыть последний чат', 'Open latest chat')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'feed' && user && (
          <div className="feed-layout feed-layout-surface">
            <section className="feed-hero-strip">
              <div className="feed-hero-main">
                <span className="feed-hero-kicker">Feed workspace</span>
                <strong>Community stream</strong>
                <p>{visibleFeedPosts.length} posts in focus</p>
              </div>
              <div className="feed-hero-stats">
                <article>
                  <span>Momentum</span>
                  <strong>{feedDigest.momentum}</strong>
                </article>
                <article>
                  <span>Media share</span>
                  <strong>{feedDigest.mediaShare}%</strong>
                </article>
                <article>
                  <span>Avg engage</span>
                  <strong>{feedDigest.avgEngagement}</strong>
                </article>
              </div>
            </section>
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
              <div className="feed-composer-draft-row">
                <span className="feed-composer-draft-state">{feedComposerDraftLabel}</span>
                {(postText.trim() || postFile) && (
                  <button type="button" className="ghost" onClick={clearFeedComposerDraft}>
                    Очистить черновик
                  </button>
                )}
              </div>
              <textarea
                ref={feedComposerTextareaRef}
                rows={3}
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                placeholder="Что нового в колледже?"
              />
              <div className="feed-composer-prompt-row">
                {feedComposerPromptOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="feed-composer-prompt"
                    onClick={() => applyFeedComposerPrompt(item.text)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="feed-composer-progress">
                <div className="feed-composer-progress-copy">
                  <strong>{feedComposerProgress.label}</strong>
                  <span>целевой ритм: до {feedComposerProgress.target} символов</span>
                </div>
                <div className="feed-composer-progress-track" aria-hidden="true">
                  <span style={{ width: `${feedComposerProgress.value}%` }}></span>
                </div>
              </div>
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
                  ⚡ Умный сброс фильтров
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
                            <small>{author.engagement} очк.</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="feed-radar-card">
                    <div className="feed-radar-head">
                      <strong>Горячие посты</strong>
                      <span>онлайн</span>
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
                            <small>{item.score} очк.</small>
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
                    <span className="feed-score-chip">⚡ {postEngagementScore} очк.</span>
                    {postIsFresh && <span className="feed-score-chip fresh">новое</span>}
                    {post.imageUrl && <span className="feed-score-chip media">медиа</span>}
                    {post.repostOf && <span className="feed-score-chip repost">репост</span>}
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
            <button type="button" className="ghost" onClick={() => setView(profileBackView || 'feed')}>Назад</button>
            {profileLoading && !profileView && (
              <div className="panel">
                <div className="empty">Загрузка профиля...</div>
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
                        {profileViewShowsRole && isOwnerUser(profileView) && <span className="owner-mark" title="Владелец">*</span>}
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
                      <span><strong>{profileFollowers}</strong> подписчиков</span>
                      <span><strong>{profileFollowing}</strong> подписок</span>
                      <span><strong>{profileTracksCount}</strong> треков</span>
                      <span><strong>{profilePosts.length}</strong> постов</span>
                      {profileJoinedAt && <span>с {profileJoinedAt}</span>}
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
                          {profileView.isSubscribed ? 'Отписаться' : 'Подписаться'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={handleMessageFromProfile}
                          disabled={loading || profileMessagingBlocked}
                          title={profileMessagingBlocked ? 'Личные сообщения заблокированы настройками приватности' : 'Открыть чат'}
                        >
                          Написать
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={handleSendProfileWave}
                          disabled={loading || profileMessagingBlocked}
                          title={profileMessagingBlocked ? 'Личные сообщения заблокированы настройками приватности' : 'Отправить волну'}
                        >
                          Вейв 👋
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
                    <div className="empty">Постов пока нет.</div>
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
                        <div className="repost-badge">Репост</div>
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
                          <div className="repost-label">Репост</div>
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
                          title={isOwnRepostPost(post) ? 'Нельзя репостить свой собственный репост' : 'Репост'}
                        >
                          Репост {post.repostsCount}
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
          <div className="panel admin-panel admin-panel-redesign">
            <header className="admin-hero">
              <div className="admin-hero-main">
                <span className="admin-kicker">Moderation workspace</span>
                <div className="admin-hero-headline">
                  <div>
                    <h2>Admin Control Center</h2>
                    <p className="admin-hero-copy">
                      Roles, trust, moderation and security are grouped into one workspace instead of one long list.
                    </p>
                  </div>
                  <span className={`verification-status-badge ${adminOverviewStats.pendingVerification > 0 ? 'pending' : 'approved'}`.trim()}>
                    {adminOverviewStats.pendingVerification > 0
                      ? `${adminOverviewStats.pendingVerification} pending`
                      : 'queue clear'}
                  </span>
                </div>
                <form
                  className="admin-search admin-search-wide"
                  onSubmit={(event) => {
                    event.preventDefault()
                    refreshAdminWorkspace(adminQuery, adminVerificationFilter)
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search by username, then refresh both users and verification queues"
                    value={adminQuery}
                    onChange={(event) => setAdminQuery(event.target.value)}
                  />
                  <button type="submit" className="primary">Refresh</button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setAdminQuery('')
                      refreshAdminWorkspace('', adminVerificationFilter)
                    }}
                  >
                    Clear
                  </button>
                </form>
                <div className="admin-stat-grid">
                  <article className="admin-stat-card tone-core">
                    <span>Total users</span>
                    <strong>{adminOverviewStats.usersTotal}</strong>
                    <small>{adminQuery.trim() ? `filtered by "${adminQuery.trim()}"` : 'loaded from admin search'}</small>
                  </article>
                  <article className="admin-stat-card tone-staff">
                    <span>Staff lane</span>
                    <strong>{adminOverviewStats.staff}</strong>
                    <small>{adminOverviewStats.owners} owners, {adminOverviewStats.admins} admins, {adminOverviewStats.moderators} moderators</small>
                  </article>
                  <article className="admin-stat-card tone-verify">
                    <span>Verification</span>
                    <strong>{adminOverviewStats.pendingVerification}</strong>
                    <small>{adminOverviewStats.verified} verified, coverage {adminOverviewStats.coverage}%</small>
                  </article>
                  <article className="admin-stat-card tone-risk">
                    <span>Risk queue</span>
                    <strong>{adminOverviewStats.banned + adminOverviewStats.warnings}</strong>
                    <small>{adminOverviewStats.banned} banned, {adminOverviewStats.warnings} with warnings</small>
                  </article>
                </div>
              </div>
              <div className="admin-hero-side">
                <section className="admin-section-card admin-priority-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Live queue</span>
                      <h3>Priority lane</h3>
                    </div>
                    <button type="button" className="ghost" onClick={() => setAdminWorkspaceTab('overview')}>
                      Overview
                    </button>
                  </div>
                  <div className="admin-priority-grid">
                    <button
                      type="button"
                      className="admin-priority-chip"
                      onClick={() => {
                        setAdminWorkspaceTab('verification')
                        setAdminVerificationFilter('pending')
                        loadAdminVerificationRequests('pending', adminQuery)
                      }}
                    >
                      <strong>{adminOverviewStats.pendingVerification}</strong>
                      <span>pending verification</span>
                    </button>
                    <button
                      type="button"
                      className="admin-priority-chip"
                      onClick={() => {
                        setAdminWorkspaceTab('users')
                        setAdminUserFilter('risk')
                      }}
                    >
                      <strong>{adminUserFilterCounts.risk}</strong>
                      <span>flagged users</span>
                    </button>
                  </div>
                  {adminRiskQueue.length === 0 ? (
                    <div className="empty small">No active risk items in the loaded set.</div>
                  ) : (
                    <div className="admin-mini-list">
                      {adminRiskQueue.map((item) => (
                        <button
                          key={`admin-risk-${item.id}`}
                          type="button"
                          className="admin-mini-row"
                          onClick={() => {
                            setAdminWorkspaceTab('users')
                            setAdminUserFilter(item.is_banned ? 'banned' : 'risk')
                          }}
                        >
                          <div>
                            <strong>@{item.username}</strong>
                            <span>{item.is_banned ? 'banned account' : `${Number(item.warnings_count || 0)} warnings`}</span>
                          </div>
                          <span className={`admin-mini-state ${item.is_banned ? 'danger' : 'warn'}`.trim()}>
                            {item.is_banned ? 'ban' : 'watch'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                <section className="admin-section-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Staff board</span>
                      <h3>Who has elevated access</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setAdminWorkspaceTab('users')
                        setAdminUserFilter('staff')
                      }}
                    >
                      Open staff
                    </button>
                  </div>
                  {adminStaffBoard.length === 0 ? (
                    <div className="empty small">No staff accounts in the current result set.</div>
                  ) : (
                    <div className="admin-mini-list">
                      {adminStaffBoard.map((item) => (
                        <div key={`admin-staff-${item.id}`} className="admin-mini-row static">
                          <div>
                            <strong>{item.display_name || item.username}</strong>
                            <span>@{item.username}</span>
                          </div>
                          <div className="admin-badges compact">
                            {isOwnerUser(item) && <span className="badge owner">OWNER</span>}
                            {item.is_admin && <span className="badge admin">ADMIN</span>}
                            {item.is_moderator && <span className="badge moder">MODER</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </header>

            <div className="admin-tabbar" role="tablist" aria-label="Admin workspace tabs">
              {adminWorkspaceTabs.map((tab) => (
                <button
                  key={`admin-tab-${tab.value}`}
                  type="button"
                  role="tab"
                  aria-selected={adminWorkspaceTab === tab.value}
                  className={adminWorkspaceTab === tab.value ? 'active' : ''}
                  onClick={() => setAdminWorkspaceTab(tab.value)}
                >
                  <span>{tab.label}</span>
                  <small>{tab.meta}</small>
                  <strong>{tab.count}</strong>
                </button>
              ))}
            </div>

            {adminWorkspaceTab === 'overview' && (
              <div className="admin-overview-grid">
                <section className="admin-section-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Verification</span>
                      <h3>Incoming requests</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setAdminWorkspaceTab('verification')
                        setAdminVerificationFilter('pending')
                        loadAdminVerificationRequests('pending', adminQuery)
                      }}
                    >
                      Review queue
                    </button>
                  </div>
                  {adminVerificationSpotlight.length === 0 ? (
                    <div className="empty small">No verification requests in the current slice.</div>
                  ) : (
                    <div className="admin-overview-stack">
                      {adminVerificationSpotlight.map((item) => (
                        <article key={`admin-overview-verification-${item.id}`} className="admin-overview-row">
                          <div>
                            <strong>{item.user.displayName || item.user.username}</strong>
                            <span>@{item.user.username}</span>
                          </div>
                          <div className="admin-overview-copy">
                            <p>{item.reason}</p>
                            <small>{formatDateTime(item.createdAt) || 'just now'}</small>
                          </div>
                          <span className={`verification-status-badge ${item.status}`.trim()}>
                            {verificationStatusLabelByValue.get(item.status) || item.status}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                <section className="admin-section-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Moderation</span>
                      <h3>Risk watchlist</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setAdminWorkspaceTab('users')
                        setAdminUserFilter('risk')
                      }}
                    >
                      Open users
                    </button>
                  </div>
                  {adminRiskQueue.length === 0 ? (
                    <div className="empty small">No users with bans or warnings right now.</div>
                  ) : (
                    <div className="admin-overview-stack">
                      {adminRiskQueue.map((item) => (
                        <article key={`admin-overview-risk-${item.id}`} className="admin-overview-row">
                          <div>
                            <strong>{item.display_name || item.username}</strong>
                            <span>@{item.username}</span>
                          </div>
                          <div className="admin-overview-copy">
                            <p>{item.is_banned ? 'Account is currently banned.' : 'Account has active warning history.'}</p>
                            <small>Warnings: {Number(item.warnings_count || 0)}</small>
                          </div>
                          <span className={`admin-mini-state ${item.is_banned ? 'danger' : 'warn'}`.trim()}>
                            {item.is_banned ? 'ban' : 'warn'}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
                <section className="admin-section-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Coverage</span>
                      <h3>Role catalog snapshot</h3>
                    </div>
                    <button type="button" className="ghost" onClick={() => setAdminWorkspaceTab('roles')}>
                      Open roles
                    </button>
                  </div>
                  <div className="admin-role-catalog-grid compact">
                    {adminRoleCatalog.slice(0, 6).map((role) => (
                      <article key={`admin-role-overview-${role.value}`} className="admin-role-card">
                        <div>
                          <strong>{role.label}</strong>
                          <span>{role.value}</span>
                        </div>
                        <b>{role.membersCount}</b>
                        <small>{role.staffCount > 0 ? `${role.staffCount} staff` : 'community role'}</small>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="admin-section-card">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">Access</span>
                      <h3>Staff roster</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setAdminWorkspaceTab('users')
                        setAdminUserFilter('staff')
                      }}
                    >
                      Inspect staff
                    </button>
                  </div>
                  {adminStaffBoard.length === 0 ? (
                    <div className="empty small">No staff in the current result set.</div>
                  ) : (
                    <div className="admin-overview-stack">
                      {adminStaffBoard.map((item) => (
                        <article key={`admin-overview-staff-${item.id}`} className="admin-overview-row">
                          <div>
                            <strong>{item.display_name || item.username}</strong>
                            <span>@{item.username}</span>
                          </div>
                          <div className="admin-badges compact">
                            {isOwnerUser(item) && <span className="badge owner">OWNER</span>}
                            {item.is_admin && <span className="badge admin">ADMIN</span>}
                            {item.is_moderator && <span className="badge moder">MODER</span>}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
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
            {adminWorkspaceTab === 'roles' && (
            <div className="admin-role-manager admin-stage-card">
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
            )}
            {adminWorkspaceTab === 'verification' && (
            <section className="admin-verify-section admin-stage-card">
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
            )}
            {adminWorkspaceTab === 'users' && (
              <>
                <section className="admin-section-card admin-users-toolbar">
                  <div className="admin-section-head">
                    <div>
                      <span className="admin-section-kicker">User operations</span>
                      <h3>Accounts, access and enforcement</h3>
                      <p className="admin-section-copy">Filter the queue, then manage roles, trust, warnings and password resets from each card.</p>
                    </div>
                    <span className="admin-section-pill">{adminVisibleUsers.length} visible</span>
                  </div>
                  <div className="admin-filter-row" role="toolbar" aria-label="Admin user filters">
                    {[
                      { value: 'all', label: 'All', count: adminUserFilterCounts.all },
                      { value: 'staff', label: 'Staff', count: adminUserFilterCounts.staff },
                      { value: 'risk', label: 'Risk', count: adminUserFilterCounts.risk },
                      { value: 'banned', label: 'Banned', count: adminUserFilterCounts.banned },
                      { value: 'verified', label: 'Verified', count: adminUserFilterCounts.verified },
                      { value: 'unverified', label: 'Unverified', count: adminUserFilterCounts.unverified }
                    ].map((item) => (
                      <button
                        key={`admin-user-filter-${item.value}`}
                        type="button"
                        className={adminUserFilter === item.value ? 'active' : ''}
                        onClick={() => setAdminUserFilter(item.value)}
                      >
                        {item.label}
                        <strong>{item.count}</strong>
                      </button>
                    ))}
                  </div>
                </section>
                <div className="admin-list admin-users-grid">
              {adminVisibleUsers.length === 0 && <div className="empty">Пользователи не найдены.</div>}
              {adminVisibleUsers.map((u) => {
                const targetIsOwner = isOwnerUser(u)
                const canManageTarget = currentUserIsOwner || !targetIsOwner
                return (
                <div key={u.id} className="admin-item">
                  <div>
                    <strong>{u.display_name || u.username}</strong>
                    <span>@{u.username}</span>
                    <div className="admin-badges">
                      {isOwnerUser(u) && <span className="badge owner">OWNER</span>}
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
                        if (role.value === '*' && !currentUserIsOwner) return null
                        const activeRoles = Array.isArray(adminRoleByUser[u.id]) ? adminRoleByUser[u.id] : getUserRoleList(u)
                        const isActive = activeRoles.includes(role.value)
                        const roleButtonDisabled = !canManageTarget
                        return (
                          <button
                            key={`${u.id}-role-picker-${role.value}`}
                            type="button"
                            className={isActive ? 'active' : ''}
                            disabled={roleButtonDisabled}
                            onClick={() => {
                              if (roleButtonDisabled) return
                              toggleAdminRoleChoice(u.id, role.value)
                            }}
                          >
                            {role.label}
                          </button>
                        )
                      })}
                    </div>
                    <button type="button" disabled={!canManageTarget} onClick={() => handleAdminSetRoleForUser(u)}>
                      Сохранить роли
                    </button>
                    {currentUserIsOwner && !targetIsOwner && (
                      <button type="button" onClick={() => handleAdminToggleAdminForUser(u)}>
                        {u.is_admin ? 'Снять ADMIN' : 'Выдать ADMIN'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canManageTarget}
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
                      <button type="button" disabled={!canManageTarget} onClick={() => adminUnbanUser(u.id).then(() => loadAdminUsers(adminQuery))}>
                        Разбан
                      </button>
                    ) : (
                      <button type="button" disabled={!canManageTarget} onClick={() => adminBanUser(u.id).then(() => loadAdminUsers(adminQuery))}>
                        Бан
                      </button>
                    )}
                    <input
                      type="text"
                      disabled={!canManageTarget}
                      placeholder="Причина предупреждения"
                      value={adminWarnReason[u.id] || ''}
                      onChange={(event) =>
                        setAdminWarnReason((prev) => ({ ...prev, [u.id]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={!canManageTarget}
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
                      disabled={!canManageTarget}
                      onClick={() =>
                        adminClearWarnings(u.id).then(() => loadAdminUsers(adminQuery))
                      }
                    >
                      Снять предупреждения
                    </button>
                    <button
                      type="button"
                      disabled={!canManageTarget}
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
                        disabled={!canManageTarget}
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
                        disabled={!canManageTarget}
                        onClick={() => handleAdminResetPasswordForUser(u)}
                      >
                        Reset password
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
              </>
            )}
          </div>
        )}

        {view === 'settings' && user && (
          <section className={settingsPanelClassName}>
            <div className="settings-shell settings-shell-redesign">
              <aside className="settings-sidebar">
                <div className="settings-account-card">
                  <div className="settings-account-head">
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
                        {currentUserIsOwner ? <span className="owner-mark" title="Owner">*</span> : null}
                      </strong>
                      <span>@{user.username}</span>
                      <small>{user.statusEmoji ? `${user.statusEmoji} ` : ''}{user.statusText || 'без статуса'}</small>
                    </div>
                  </div>
                  <div className="settings-role-line">
                    {(settingsRoleLabels.length > 0 ? settingsRoleLabels : ['Студент']).map((label, idx) => (
                      <span key={`settings-role-chip-${idx}`} className="mini-profile-role">{label}</span>
                    ))}
                  </div>
                  <div className="settings-chip-row">
                    {settingsStatusChips.map((chip) => (
                      <span key={`settings-chip-${chip.id}`} className={`settings-status-chip tone-${chip.tone}`.trim()}>{chip.label}</span>
                    ))}
                  </div>
                </div>
                <div className="settings-nav-wrap">
                  <div className="settings-nav-head">
                    <div>
                      <span className="settings-nav-caption">Разделы</span>
                      <strong>Настройки</strong>
                    </div>
                    <span className="settings-nav-counter">{settingsVisibleNavItems.length}</span>
                  </div>
                  <label className="settings-nav-search">
                    <input
                      type="text"
                      value={settingsNavQuery}
                      onChange={(event) => setSettingsNavQuery(event.target.value)}
                      placeholder="Поиск по настройкам"
                      maxLength={60}
                    />
                  </label>
                  {settingsVisibleNavGroups.map((group) => (
                    <section key={`settings-nav-group-${group.id}`} className="settings-nav-group">
                      <div className="settings-nav-group-head">
                        <strong>{group.label}</strong>
                        <small>{group.summary}</small>
                      </div>
                      <nav className="settings-nav">
                        {group.items.map((item) => (
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
                    </section>
                  ))}
                  {settingsVisibleNavItems.length === 0 ? (
                    <div className="settings-nav-empty">Ничего не найдено</div>
                  ) : null}
                </div>
              </aside>
              <div className="settings-content">
                <section className="settings-hero">
                  <div className="settings-hero-main">
                    <span className="settings-hero-overline">Settings</span>
                    <h2>Настройки аккаунта</h2>
                    <p>{settingsSectionHint}</p>
                    <div className="settings-hero-chip-row">
                      {settingsCurrentItem ? (
                        <span className="settings-hero-chip">
                          <span aria-hidden="true">{settingsCurrentItem.icon}</span>
                          {settingsCurrentItem.label}
                        </span>
                      ) : null}
                      <span className="settings-hero-chip muted">{settingsIdentityBadge} mode</span>
                    </div>
                  </div>
                  <div className="settings-hero-rail">
                    <div className="settings-kpi-grid">
                      {settingsWorkspaceStats.map((item) => (
                        <article key={`settings-kpi-${item.id}`} className="settings-kpi">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.meta}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
                <section className="settings-quick-tabs" aria-label="Быстрые разделы настроек">
                  {settingsQuickTabs.map((item) => (
                    <button
                      key={`settings-quick-tab-${item.id}`}
                      type="button"
                      className={settingsSection === item.id ? 'active' : ''}
                      onClick={() => setSettingsSection(item.id)}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
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
                    <h2>{uiText('Оформление', 'Appearance')}</h2>
                    <p className="subtitle">{uiText('Режим темы, плотность, радиусы и акцентные цвета.', 'Theme mode, density, radii and accent colors.')}</p>
                    <section className="ui-studio appearance-studio">
                      <section className="appearance-director-card">
                        <div className="appearance-director-copy">
                          <span className="appearance-director-kicker">{uiText('Design studio', 'Design studio')}</span>
                          <strong>{uiText('Собери свой visual layer для всего приложения', 'Build a visual layer for the whole app')}</strong>
                          <p>
                            {uiText(
                              'Фон, glow, глубина карточек, акцентные рамки и палитра теперь собираются как единая сцена.',
                              'Backdrop, glow, card depth, accent frames and palette now work as one scene.'
                            )}
                          </p>
                          <div className="appearance-director-tags">
                            <span>{theme === 'dark' ? uiText('Тёмная тема', 'Dark mode') : uiText('Светлая тема', 'Light mode')}</span>
                            <span>{getUiStyleLabel(uiPreferences.style)}</span>
                            <span>{getUiBackdropLabel(uiPreferences.backdropMode)}</span>
                            <span>{getUiChromeLabel(uiPreferences.chrome)}</span>
                          </div>
                        </div>
                        <div className="appearance-director-preview" aria-hidden="true">
                          <div className="appearance-director-preview-shell">
                            <span className="appearance-director-preview-glow" />
                            <div className="appearance-director-preview-topline">
                              <span />
                              <span />
                              <span />
                            </div>
                            <div className="appearance-director-preview-hero">
                              <div />
                              <div />
                            </div>
                            <div className="appearance-director-preview-grid">
                              <article>
                                <strong>{getUiStyleLabel(uiPreferences.style)}</strong>
                                <small>{getUiDensityLabel(uiPreferences.density)}</small>
                              </article>
                              <article>
                                <strong>{getUiBackdropLabel(uiPreferences.backdropMode)}</strong>
                                <small>{getUiChromeLabel(uiPreferences.chrome)}</small>
                              </article>
                            </div>
                          </div>
                        </div>
                      </section>
                      <div className="ui-studio-grid">
                        <label>
                          {uiText('Стиль', 'Style')}
                          <select value={uiPreferences.style} onChange={(event) => updateUiPreference('style', event.target.value)}>
                            {UI_STYLE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{getUiStyleLabel(item.value)}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {uiText('Плотность', 'Density')}
                          <select value={uiPreferences.density} onChange={(event) => updateUiPreference('density', event.target.value)}>
                            {UI_DENSITY_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{getUiDensityLabel(item.value)}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {uiText('Интенсивность окружения', 'Ambient intensity')}: {uiPreferences.ambient}
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
                          {uiText('Радиус карточек', 'Card radius')}: {Math.round(uiPreferences.radius)}px
                          <input
                            type="range"
                            min={12}
                            max={36}
                            step={1}
                            value={uiPreferences.radius}
                            onChange={(event) => updateUiPreference('radius', Number(event.target.value))}
                          />
                        </label>
                        <label>
                          {uiText('Интенсивность границ', 'Border intensity')}: {Math.round(uiPreferences.lineStrength)}%
                          <input
                            type="range"
                            min={35}
                            max={180}
                            step={1}
                            value={uiPreferences.lineStrength}
                            onChange={(event) => updateUiPreference('lineStrength', Number(event.target.value))}
                          />
                        </label>
                      </div>

                      <div className="appearance-theme-mode">
                        <button
                          type="button"
                          className={theme === 'dark' ? 'active' : ''}
                          onClick={() => setTheme('dark')}
                        >
                          {uiText('Тёмная', 'Dark')}
                        </button>
                        <button
                          type="button"
                          className={theme === 'light' ? 'active' : ''}
                          onClick={() => setTheme('light')}
                        >
                          {uiText('Светлая', 'Light')}
                        </button>
                      </div>

                      <section className="appearance-mode-grid-block">
                        <article className="appearance-mode-card">
                          <div className="appearance-mode-card-head">
                            <strong>{uiText('Сцена фона', 'Backdrop scene')}</strong>
                            <span>{getUiBackdropLabel(uiPreferences.backdropMode)}</span>
                          </div>
                          <div className="appearance-mode-chip-row">
                            {UI_BACKDROP_OPTIONS.map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                className={uiPreferences.backdropMode === item.value ? 'active' : ''}
                                onClick={() => updateUiPreference('backdropMode', item.value)}
                              >
                                {getUiBackdropLabel(item.value)}
                              </button>
                            ))}
                          </div>
                        </article>

                        <article className="appearance-mode-card">
                          <div className="appearance-mode-card-head">
                            <strong>{uiText('Характер chrome', 'Chrome mood')}</strong>
                            <span>{getUiChromeLabel(uiPreferences.chrome)}</span>
                          </div>
                          <div className="appearance-mode-chip-row">
                            {UI_CHROME_OPTIONS.map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                className={uiPreferences.chrome === item.value ? 'active' : ''}
                                onClick={() => updateUiPreference('chrome', item.value)}
                              >
                                {getUiChromeLabel(item.value)}
                              </button>
                            ))}
                          </div>
                        </article>
                      </section>

                      <label className="ui-studio-toggle">
                        <input
                          type="checkbox"
                          checked={uiPreferences.syncAccent}
                          onChange={(event) => updateUiPreference('syncAccent', event.target.checked)}
                        />
                        {uiText('Синхронизировать акценты с цветом профиля (авторежим)', 'Sync accents with profile color (auto mode)')}
                      </label>

                      <label className="ui-studio-toggle">
                        <input
                          type="checkbox"
                          checked={uiPreferences.outlineMode === 'custom'}
                          onChange={(event) => updateUiPreference('outlineMode', event.target.checked ? 'custom' : 'auto')}
                        />
                        {uiText('Свой цвет контура (ручной режим)', 'Custom outline color (manual mode)')}
                      </label>

                      <label className="ui-studio-toggle">
                        <input
                          type="checkbox"
                          checked={uiPreferences.customPalette}
                          onChange={(event) => updateUiPreference('customPalette', event.target.checked)}
                        />
                        {uiText('Своя палитра поверхностей (фон/панель/карточка/текст)', 'Custom surface palette (bg/panel/card/text)')}
                      </label>

                      <label className="ui-studio-toggle">
                        <input
                          type="checkbox"
                          checked={uiPreferences.glowEnabled}
                          onChange={(event) => updateUiPreference('glowEnabled', event.target.checked)}
                        />
                        {uiText('Свечение для активных вкладок и кнопок', 'Glow for active tabs/buttons')}
                      </label>

                      <div className="ui-studio-actions">
                        <button type="button" className="ghost" onClick={enableFullUiCustomization}>
                          {uiText('Включить полную кастомизацию', 'Enable full customization')}
                        </button>
                      </div>

                      <section className="appearance-scene-block">
                        <div className="appearance-scene-head">
                          <strong>{uiText('Сцены стиля', 'Style scenes')}</strong>
                          <button type="button" className="ghost appearance-scene-random" onClick={applyRandomUiScenePreset}>
                            {uiText('Удивить', 'Surprise me')}
                          </button>
                        </div>
                        <div className="appearance-scene-grid">
                          {UI_THEME_SCENE_PRESETS.map((scene) => {
                            const scenePrefs = normalizeUiPreferences(scene.preferences)
                            const isActive = appearanceActiveSceneId === scene.id
                            return (
                              <button
                                key={scene.id}
                                type="button"
                                className={isActive ? 'appearance-scene-card active' : 'appearance-scene-card'}
                                onClick={() => applyUiScenePreset(scene)}
                              >
                                <span className="appearance-scene-swatches">
                                  <span style={{ background: scenePrefs.bgColor }} />
                                  <span style={{ background: scenePrefs.panelColor }} />
                                  <span style={{ background: scenePrefs.cardColor }} />
                                  <span style={{ background: scenePrefs.accentColor }} />
                                  <span style={{ background: scenePrefs.accent2Color }} />
                                </span>
                                <span className="appearance-scene-title">
                                  <strong>{scene.label}</strong>
                                  <small>{scene.theme === 'light' ? uiText('Светлая', 'Light') : uiText('Тёмная', 'Dark')}</small>
                                </span>
                                <small className="appearance-scene-hint">{scene.hint}</small>
                                <span className="appearance-scene-meta">
                                  {getUiStyleLabel(scenePrefs.style)}
                                  {' / '}
                                  {getUiDensityLabel(scenePrefs.density)}
                                  {' / '}
                                  {getUiBackdropLabel(scenePrefs.backdropMode)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </section>

                      <div className="appearance-accent-grid">
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Основной акцент', 'Primary accent')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.accent, DEFAULT_UI_PREFERENCES.accentColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.accent}
                            onChange={(event) => updateUiColorPreference('accentColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Второй акцент', 'Secondary accent')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.accent2, DEFAULT_UI_PREFERENCES.accent2Color)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.accent2}
                            onChange={(event) => updateUiColorPreference('accent2Color', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Цвет контура', 'Outline color')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.outline, DEFAULT_UI_PREFERENCES.outlineColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.outline}
                            onChange={(event) => updateUiColorPreference('outlineColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Полосы', 'Stripe lines')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.stripe, DEFAULT_UI_PREFERENCES.stripeColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.stripe}
                            onChange={(event) => updateUiColorPreference('stripeColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Рамка чата', 'Chat frame')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.chat, DEFAULT_UI_PREFERENCES.chatAccentColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.chat}
                            onChange={(event) => updateUiColorPreference('chatAccentColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Рамка ленты', 'Feed frame')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.feed, DEFAULT_UI_PREFERENCES.feedAccentColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.feed}
                            onChange={(event) => updateUiColorPreference('feedAccentColor', event.target.value)}
                          />
                        </label>
                      </div>

                      <div className="appearance-accent-grid">
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Фон', 'Background')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.bg, DEFAULT_UI_PREFERENCES.bgColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.bg}
                            onChange={(event) => updateUiColorPreference('bgColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Панель', 'Panel')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.panel, DEFAULT_UI_PREFERENCES.panelColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.panel}
                            onChange={(event) => updateUiColorPreference('panelColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Панель 2', 'Panel 2')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.panel2, DEFAULT_UI_PREFERENCES.panel2Color)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.panel2}
                            onChange={(event) => updateUiColorPreference('panel2Color', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Карточка', 'Card')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.card, DEFAULT_UI_PREFERENCES.cardColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.card}
                            onChange={(event) => updateUiColorPreference('cardColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Текст', 'Text')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.text, DEFAULT_UI_PREFERENCES.textColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.text}
                            onChange={(event) => updateUiColorPreference('textColor', event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="appearance-color-label">
                            {uiText('Приглушённый текст', 'Muted text')}
                            <small className="appearance-color-value">{formatHexColorLabel(appearanceEditableColors.muted, DEFAULT_UI_PREFERENCES.mutedColor)}</small>
                          </span>
                          <input
                            type="color"
                            value={appearanceEditableColors.muted}
                            onChange={(event) => updateUiColorPreference('mutedColor', event.target.value)}
                          />
                        </label>
                      </div>

                      <p className="appearance-accent-hint">
                        {uiPreferences.syncAccent
                          ? uiText('Акцент сейчас повторяет цвет профиля. Отключи синхронизацию, чтобы выбрать свои цвета.', 'Accent currently follows your profile color. Disable sync to choose custom colors.')
                          : uiText('Пользовательские акценты активны. Выбери пресет ниже или настрой всё вручную.', 'Custom accents are active. Pick a preset below or fine tune manually.')}
                        {' '}
                        {uiPreferences.outlineMode === 'custom'
                          ? uiText('Цвет контура пользовательский и влияет на границы чатов, ленты и панелей.', 'Outline color is custom and affects borders in chat, feed and panels.')
                          : uiText('Цвет контура в авторежиме. Изменение пикера переведёт его в ручной режим.', 'Outline color is in auto mode. Changing outline picker switches it to manual.')}
                        {' '}
                        {uiText('Цвета полос, чата и ленты применяются глобально к акцентным линиям и рамкам поверхностей.', 'Stripe/chat/feed pickers apply globally to line highlights and surface frames.')}
                        {' '}
                        {uiText('Цвета палитры поверхностей действуют по всему приложению, когда включена своя палитра.', 'Surface palette colors apply app-wide when custom palette is enabled.')}
                        {' '}
                        {uiText('Цвет свечения повторяет контур (или акцент в авторежиме) и может быть отключён.', 'Glow color follows outline color (or accent in auto mode) and can be disabled.')}
                      </p>

                      <section className="appearance-live-map">
                        <div className="appearance-live-map-head">
                          <strong>{uiText('Что меняется и где', 'What changes where')}</strong>
                          <span>{uiText('Живой пример', 'Live example')}</span>
                        </div>
                        <div
                          className="appearance-live-canvas"
                          style={{
                            background: appearanceEditableColors.bg,
                            color: appearanceEditableColors.text
                          }}
                        >
                          <div
                            className="appearance-live-panel"
                            style={{
                              background: appearanceEditableColors.panel,
                              borderColor: appearanceOutlinePreview
                            }}
                          >
                            <div
                              className="appearance-live-stripe"
                              style={{
                                background: 'linear-gradient(90deg, ' + appearanceEditableColors.stripe + ' 0%, transparent 100%)'
                              }}
                            />
                            <div className="appearance-live-grid">
                              <article
                                className="appearance-live-card"
                                style={{
                                  background: appearanceEditableColors.card,
                                  borderColor: appearanceOutlinePreview
                                }}
                              >
                                <strong>{uiText('Карточка + контур', 'Card + outline')}</strong>
                                <p style={{ color: appearanceEditableColors.muted }}>{uiText('Пример приглушённого текста', 'Muted text sample')}</p>
                                <button
                                  type="button"
                                  className="appearance-live-primary"
                                  style={{ background: appearanceEditableColors.accent, color: '#ffffff' }}
                                >
                                  {uiText('Основной акцент', 'Primary accent')}
                                </button>
                              </article>
                              <article
                                className="appearance-live-card"
                                style={{
                                  background: appearanceEditableColors.panel2,
                                  borderColor: appearanceEditableColors.chat
                                }}
                              >
                                <strong>{uiText('Рамки чата и ленты', 'Chat + feed frames')}</strong>
                                <div className="appearance-live-frames">
                                  <span
                                    className="appearance-live-frame"
                                    style={{ borderColor: appearanceEditableColors.chat, color: appearanceEditableColors.text }}
                                  >
                                    {uiText('Рамка чата', 'Chat frame')}
                                  </span>
                                  <span
                                    className="appearance-live-frame"
                                    style={{ borderColor: appearanceEditableColors.feed, color: appearanceEditableColors.text }}
                                  >
                                    {uiText('Рамка ленты', 'Feed frame')}
                                  </span>
                                </div>
                                <span
                                  className="appearance-live-secondary"
                                  style={{ background: appearanceEditableColors.accent2, color: '#ffffff' }}
                                >
                                  {uiText('Второй акцент', 'Secondary accent')}
                                </span>
                              </article>
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="appearance-preset-row">
                        {UI_THEME_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className={!uiPreferences.syncAccent && appearanceActivePresetId === preset.id ? 'active' : ''}
                            onClick={() => applyUiThemePreset(preset)}
                          >
                            <span
                              className="appearance-preset-dot"
                              style={{
                                background: 'linear-gradient(135deg, ' + preset.accent + ' 0%, ' + preset.accent2 + ' 100%)'
                              }}
                            />
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <section className="appearance-custom-presets">
                        <div className="appearance-custom-presets-head">
                          <strong>{uiText('Мои пресеты', 'My presets')}</strong>
                          <span>{uiCustomThemePresets.length}/{UI_CUSTOM_THEME_PRESET_LIMIT}</span>
                        </div>
                        <div className="appearance-custom-presets-form">
                          <input
                            type="text"
                            value={uiCustomPresetName}
                            onChange={(event) => setUiCustomPresetName(event.target.value.slice(0, 32))}
                            placeholder={uiText('Название пресета', 'Preset name')}
                            maxLength={32}
                          />
                          <button type="button" className="ghost" onClick={saveCurrentUiThemePreset}>
                            {uiText('Сохранить текущий', 'Save current')}
                          </button>
                        </div>
                        {uiCustomThemePresets.length === 0 ? (
                          <div className="empty small">{uiText('Сохранённых пресетов пока нет.', 'No saved presets yet.')}</div>
                        ) : (
                          <div className="appearance-custom-presets-list">
                            {uiCustomThemePresets.map((preset) => (
                              <article
                                key={preset.id}
                                className={appearanceActiveCustomPresetId === preset.id ? 'appearance-custom-preset active' : 'appearance-custom-preset'}
                              >
                                <button
                                  type="button"
                                  className="appearance-custom-preset-main"
                                  onClick={() => applyUiCustomThemePreset(preset)}
                                >
                                  <span
                                    className="appearance-preset-dot"
                                    style={{
                                      background: 'linear-gradient(135deg, ' + preset.preferences.accentColor + ' 0%, ' + preset.preferences.accent2Color + ' 100%)'
                                    }}
                                  />
                                  <span className="appearance-custom-preset-text">
                                    <strong>{preset.name}</strong>
                                    <small>
                                      {getUiStyleLabel(preset.preferences.style)}
                                      {' / '}
                                      {getUiDensityLabel(preset.preferences.density)}
                                      {' / '}
                                      {getUiBackdropLabel(preset.preferences.backdropMode)}
                                    </small>
                                  </span>
                                </button>
                                <div className="appearance-custom-preset-actions">
                                  <button type="button" onClick={() => renameUiCustomThemePreset(preset.id)}>{uiText('Переименовать', 'Rename')}</button>
                                  <button type="button" className="danger" onClick={() => deleteUiCustomThemePreset(preset.id)}>{uiText('Удалить', 'Delete')}</button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
	                      </section>

	                      <section className="appearance-share-panel">
	                        <div className="appearance-share-head">
	                          <strong>{uiText('Обмен JSON-темой', 'Theme JSON sharing')}</strong>
	                          <span>{uiText('UI + профильная сцена', 'UI + profile scene')}</span>
	                        </div>
	                        <div className="appearance-share-actions">
	                          <button type="button" className="ghost" onClick={copyUiThemePackJson}>{uiText('Копировать JSON', 'Copy JSON')}</button>
	                          <button type="button" className="ghost" onClick={exportUiThemePackToFile}>{uiText('Скачать JSON', 'Download JSON')}</button>
	                          <button
	                            type="button"
	                            className="ghost"
	                            onClick={() => appearanceImportInputRef.current && appearanceImportInputRef.current.click()}
	                          >
	                            {uiText('Импорт файла', 'Import file')}
	                          </button>
	                          <input
	                            ref={appearanceImportInputRef}
	                            type="file"
	                            accept="application/json,.json"
	                            onChange={handleAppearanceImportFileChange}
	                            style={{ display: 'none' }}
	                          />
	                        </div>
	                        <label className="appearance-share-field">
	                          <span>{uiText('Вставить JSON', 'Paste JSON')}</span>
	                          <textarea
	                            rows={6}
	                            value={appearanceImportJson}
	                            onChange={(event) => setAppearanceImportJson(event.target.value)}
	                            placeholder='{"kind":"ktk-ui-theme","version":1,"theme":"dark","uiPreferences":{...}}'
	                          />
	                        </label>
	                        <div className="appearance-share-actions">
	                          <button type="button" className="primary" onClick={handleAppearanceImportJsonApply}>{uiText('Применить JSON', 'Apply JSON')}</button>
	                          <button type="button" className="ghost" onClick={() => setAppearanceImportJson('')}>{uiText('Очистить', 'Clear')}</button>
	                        </div>
	                      </section>

	                      <div
	                        className="appearance-preview-card"
                        style={{
                          background: 'linear-gradient(135deg, ' + appearanceAccentPreview.accent + ' 0%, ' + appearanceAccentPreview.accent2 + ' 100%)',
                          borderColor: 'rgba(' + appearanceOutlinePreviewRgb.r + ', ' + appearanceOutlinePreviewRgb.g + ', ' + appearanceOutlinePreviewRgb.b + ', 0.42)'
                        }}
                      >
                        <strong>{uiText('Превью темы', 'Theme preview')}</strong>
                        <span>
                          {theme === 'dark' ? uiText('Тёмная', 'Dark') : uiText('Светлая', 'Light')}
                          {' / '}
                          {getUiStyleLabel(uiPreferences.style)}
                          {' / '}
                          {getUiDensityLabel(uiPreferences.density)}
                          {' / '}
                          {getUiBackdropLabel(uiPreferences.backdropMode)}
                          {' / '}
                          {getUiChromeLabel(uiPreferences.chrome)}
                        </span>
                      </div>

                      <div className="ui-studio-actions">
                        <button type="button" className="ghost" onClick={resetUiPreferences}>{uiText('Сбросить оформление', 'Reset appearance')}</button>
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
                        <p className="profile-verification-text">2FA доступна для ролей teacher/admin/owner.</p>
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
                            placeholder="Текущий 6-значный код"
                            maxLength={6}
                          />
                          <input
                            type="text"
                            value={twoFactorBackupCode}
                            onChange={(event) => setTwoFactorBackupCode(event.target.value.trim().toUpperCase().slice(0, 20))}
                            placeholder="Резервный код для отключения"
                            maxLength={20}
                          />
                          <div className="profile-verification-actions">
                            <button type="button" className="ghost" onClick={handleRegenerateBackupCodes} disabled={loading}>Обновить резервные коды</button>
                            <button type="button" className="danger" onClick={handleDisableTwoFactor} disabled={loading}>Отключить 2FA</button>
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
                        <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} placeholder="Текущий пароль" minLength={6} autoComplete="current-password" />
                        <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} placeholder="Новый пароль" minLength={6} autoComplete="new-password" />
                        <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} placeholder="Подтвердите новый пароль" minLength={6} autoComplete="new-password" />
                        <div className="profile-verification-actions">
                          <button type="button" className="primary" onClick={handleChangePassword} disabled={loading}>Сменить пароль</button>
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
                        <h3>Сеансы</h3>
                        <span className="verification-status-badge none">{settingsActiveSessionCount}</span>
                      </div>
                      <div className="profile-verification-actions">
                        <button type="button" className="ghost" onClick={() => loadUserSessions()} disabled={sessionsLoading}>Обновить</button>
                        <button type="button" className="danger" onClick={handleRevokeOtherSessions} disabled={sessionsLoading}>Завершить остальные сеансы</button>
                      </div>
                      {sessionsLoading ? (
                        <div className="empty small">Загрузка сеансов...</div>
                      ) : sessions.length === 0 ? (
                        <div className="empty small">Активных сеансов нет.</div>
                      ) : (
                        <div className="admin-list">
                          {sessions.map((sessionItem) => (
                            <div key={sessionItem.id} className="admin-item">
                              <div>
                                <strong>{sessionItem.isCurrent ? 'Текущее устройство' : 'Сеанс устройства'}</strong>
                                <span>{sessionItem.userAgent || 'Неизвестный user agent'}</span>
                                <div className="admin-meta">
                                  <span>IP: {sessionItem.ipAddress || 'n/a'}</span>
                                  <span>Последняя активность: {formatDateTime(sessionItem.lastSeenAt || sessionItem.createdAt) || 'n/a'}</span>
                                </div>
                              </div>
                              {!sessionItem.isCurrent && !sessionItem.revokedAt && (
                                <div className="admin-actions">
                                  <button type="button" className="danger" onClick={() => handleRevokeSession(sessionItem.id)}>Отозвать</button>
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
                    <p className="subtitle">Мут, блокировка, скрытие профиля и запрет личных сообщений.</p>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Быстрое правило по @username</h3>
                        <span className={`verification-status-badge ${privacyQuickLoading ? 'pending' : 'none'}`.trim()}>
                          {privacyQuickLoading ? 'Обновление...' : 'Вручную'}
                        </span>
                      </div>
                      <p className="profile-verification-text">Найди пользователя и примени флаги приватности в один клик.</p>
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
                          <div className="empty small">Ищем пользователей...</div>
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
                            Мут
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.denyDm ? 'active' : ''}
                            onClick={() => togglePrivacyQuickFlag('denyDm')}
                          >
                            Запрет DM
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.hideProfileContent ? 'active' : ''} 
                            onClick={() => togglePrivacyQuickFlag('hideProfileContent')}
                          >
                            Скрыть профиль
                          </button>
                          <button
                            type="button"
                            className={privacyQuickFlags.isBlocked ? 'active danger' : 'danger'}
                            onClick={() => togglePrivacyQuickFlag('isBlocked')}
                          >
                            Блок
                          </button>
                        </div>
                        <div className="profile-verification-actions">
                          <button type="button" className="primary" onClick={applyPrivacyQuickRule} disabled={privacyQuickLoading}>
                            Применить правило
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Пакетные действия</h3>
                        <span className="verification-status-badge none">{privacyControls.length}</span>
                      </div>
                      <p className="profile-verification-text">Примени готовые действия ко всем пользователям из списка приватности.</p>
                      <div className="privacy-batch-actions">
                        <button type="button" onClick={() => applyPrivacyBatchPreset('shield-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Защитить всех (запрет DM + скрыть профиль)
                        </button>
                        <button type="button" onClick={() => applyPrivacyBatchPreset('mute-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Замутить всех
                        </button>
                        <button type="button" className="danger" onClick={() => applyPrivacyBatchPreset('clear-all')} disabled={privacyQuickLoading || privacyControlsLoading}>
                          Очистить все правила
                        </button>
                      </div>
                    </section>
                    <section className="profile-verification-card">
                      <div className="profile-verification-head">
                        <h3>Контроль приватности</h3>
                        <span className="verification-status-badge none">{privacyControls.length}</span>
                      </div>
                      <div className="profile-verification-actions">
                        <button type="button" className="ghost" onClick={() => loadMyPrivacy()} disabled={privacyControlsLoading}>Обновить</button>
                      </div>
                      {privacyControlsLoading ? (
                        <div className="empty small">Загрузка настроек приватности...</div>
                      ) : privacyControls.length === 0 ? (
                        <div className="empty small">Пользовательских правил приватности нет.</div>
                      ) : (
                        <div className="admin-list">
                          {privacyControls.map((item) => (
                            <div key={`settings-privacy-${item.targetUserId}`} className="admin-item">
                              <div>
                                <strong>{item.targetDisplayName || item.targetUsername || 'Пользователь'}</strong>
                                <span>@{item.targetUsername || 'unknown'}</span>
                                <div className="admin-badges">
                                  {item.isMuted && <span className="badge role">МУТ</span>}
                                  {item.isBlocked && <span className="badge role">БЛОК</span>}
                                  {item.hideProfileContent && <span className="badge role">СКРЫТ ПРОФИЛЬ</span>}
                                  {item.denyDm && <span className="badge role">ЗАПРЕТ DM</span>}
                                </div>
                              </div>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { isMuted: !item.isMuted }, item.isMuted ? 'Мут снят.' : 'Пользователь замучен.')}
                                >
                                  {item.isMuted ? 'Снять мут' : 'Мут'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { denyDm: !item.denyDm }, item.denyDm ? 'DM разрешены.' : 'DM запрещены.')}
                                >
                                  {item.denyDm ? 'Разрешить DM' : 'Запретить DM'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { hideProfileContent: !item.hideProfileContent }, item.hideProfileContent ? 'Профиль снова виден.' : 'Профиль скрыт.')}
                                >
                                  {item.hideProfileContent ? 'Показать профиль' : 'Скрыть профиль'}
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => applyPrivacyPatchForUser(item.targetUsername, { isBlocked: !item.isBlocked }, item.isBlocked ? 'Пользователь разблокирован.' : 'Пользователь заблокирован.')}
                                >
                                  {item.isBlocked ? 'Разблокировать' : 'Блок'}
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
                    <h2>{uiText('Язык', 'Language')}</h2>
                    <p className="subtitle">{uiText('Выбор языка сохраняется в браузере и применяется сразу.', 'Language choice is saved in the browser and applied immediately.')}</p>
                    <div className="settings-action-list">
                      <button
                        type="button"
                        className={`settings-action-row ${appLanguage === 'ru' ? 'active' : ''}`.trim()}
                        onClick={() => setAppLanguage('ru')}
                        aria-pressed={appLanguage === 'ru'}
                      >
                        <strong>Русский</strong>
                        <span>Основной язык интерфейса и полный перевод новых панелей.</span>
                      </button>
                      <button
                        type="button"
                        className={`settings-action-row ${appLanguage === 'en' ? 'active' : ''}`.trim()}
                        onClick={() => setAppLanguage('en')}
                        aria-pressed={appLanguage === 'en'}
                      >
                        <strong>English (beta)</strong>
                        <span>Сначала переключает обновлённые панели, старые разделы ещё выравниваются.</span>
                      </button>
                    </div>
                    <p className="settings-language-note">
                      {appLanguage === 'ru'
                        ? 'Русский включён. Центр управления и новое оформление уже полностью русифицированы.'
                        : 'English beta is enabled. The newest workspace panels switch first while legacy areas are still being aligned.'}
                    </p>
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
	            <section className="profile-visual-scenes" aria-label="Профильные сцены">
	              <div className="profile-visual-scenes-head">
	                <strong>Сцены профиля</strong>
	                <span>Баннер + тема карточки</span>
	              </div>
	              <div className="profile-visual-scenes-grid">
	                {PROFILE_VISUAL_SCENE_PRESETS.map((scene) => {
	                  const heroThemeLabel = (PROFILE_HERO_THEMES.find((item) => item.value === scene.heroTheme) || { label: scene.heroTheme }).label
	                  const isActive = activeProfileVisualSceneId === scene.id
	                  return (
	                    <button
	                      key={scene.id}
	                      type="button"
	                      className={isActive ? 'profile-visual-scene-card active' : 'profile-visual-scene-card'}
	                      onClick={() => applyProfileVisualScenePreset(scene.id)}
	                    >
	                      <span className="profile-visual-scene-swatches">
	                        <span style={{ background: scene.themeColor }} />
	                        <span style={{ background: 'linear-gradient(135deg, ' + scene.themeColor + ', rgba(255, 255, 255, 0.24))' }} />
	                      </span>
	                      <span className="profile-visual-scene-title">
	                        <strong>{scene.label}</strong>
	                        <small>{heroThemeLabel}</small>
	                      </span>
	                      <small className="profile-visual-scene-hint">{scene.hint}</small>
	                    </button>
	                  )
	                })}
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
                    disabled={
                      (role.value === 'teacher' && !(user && user.isAdmin)) ||
                      (role.value === '*' && !currentUserIsOwner)
                    }
                  >
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-studio-toggle">
              <input
                type="checkbox"
                checked={profileForm.showRole !== false}
                onChange={(event) => setProfileForm({ ...profileForm, showRole: event.target.checked })}
              />
              <span>Показывать роль в публичном профиле</span>
            </label>
            <section className="profile-verification-card">
              <div className="profile-verification-head">
                <h3>Верификация</h3>
                <span className={`verification-status-badge ${user.isVerified ? 'approved' : (verificationRequestStatus || 'none')}`.trim()}>
                  {user.isVerified ? 'Проверен' : verificationRequestStatusLabel}
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
                    <p className="profile-verification-text">Заявка на проверке. Её можно отменить и отправить новую.</p>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'rejected' ? (
                    <p className="profile-verification-text">
                      Request was rejected.
                      {verificationRequest.adminNote ? ` Note: ${verificationRequest.adminNote}` : ' Update details and send again.'}
                    </p>
                  ) : null}
                  {verificationRequest && verificationRequest.status === 'cancelled' ? (
                    <p className="profile-verification-text">Предыдущая заявка была отменена. Можно отправить новую.</p>
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
                  Backdrop
                  <select
                    value={uiPreferences.backdropMode}
                    onChange={(event) => updateUiPreference('backdropMode', event.target.value)}
                  >
                    {UI_BACKDROP_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Chrome
                  <select
                    value={uiPreferences.chrome}
                    onChange={(event) => updateUiPreference('chrome', event.target.value)}
                  >
                    {UI_CHROME_OPTIONS.map((item) => (
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
                {myTracks.length === 0 && <div className="empty">Треки ещё не загружены.</div>}
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
              {activeConversationPrivacy.isMuted ? 'Снять мут с чата' : 'Замутить чат'}
            </button>
            <button type="button" onClick={toggleChatDenyDm}>
              {activeConversationPrivacy.denyDm ? 'Разрешить DM' : 'Запретить DM'}
            </button>
            <button type="button" onClick={toggleChatHideProfile}>
              {activeConversationPrivacy.hideProfileContent ? 'Показать профиль' : 'Скрыть профиль'}
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
                  <span className="mini-profile-name">
                    {miniProfileCard.user.displayName || miniProfileCard.user.username || 'Пользователь'}
                  </span>
                  {miniProfileCard.user.isVerified && <span className="verified-mark mini-profile-verified" title="Верифицированный профиль">✓</span>}
                  {miniProfileCard.user.showRole !== false && miniProfileCard.user.isOwner && <span className="owner-mark mini-profile-owner" title="Владелец">*</span>}
                </strong>
                {miniProfileCard.user.username && <span>@{miniProfileCard.user.username}</span>}
              </div>
              <span className={`mini-profile-presence ${miniProfileCard.user.online ? 'online' : ''}`.trim()}>
                {miniProfileCard.user.online ? 'в сети' : 'не в сети'}
              </span>
            </div>
            <div className="mini-profile-meta">
              {miniProfileCard.user.showRole !== false && Array.isArray(miniProfileCard.user.roleLabels) && miniProfileCard.user.roleLabels.length > 0 ? (
                <div className="mini-profile-role-list">
                  {miniProfileCard.user.roleLabels.map((roleLabel, index) => (
                    <span key={`mini-profile-role-${index}-${roleLabel}`} className="mini-profile-role">{roleLabel}</span>
                  ))}
                </div>
              ) : null}
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
                  title={miniProfileDmBlocked ? 'Личные сообщения заблокированы настройками приватности' : 'Отправить волну'}
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
                  title={miniProfileDmBlocked ? 'Личные сообщения заблокированы настройками приватности' : 'Открыть чат'}
                >
                  Написать
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

      {user && navigationRailItems.length > 0 && (
        <div className="icon-rail icon-rail-root">
          {navigationRailItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.active ? 'active' : ''}
              onClick={item.onClick}
              title={item.label}
              aria-label={item.ariaLabel || item.label}
            >
              {item.icon}
              {item.badge ? <span className="icon-rail-badge">{item.badge}</span> : null}
              <span className="icon-rail-label">{item.label}</span>
            </button>
          ))}
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


