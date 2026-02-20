import { useEffect, useMemo, useRef, useState } from 'react'
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
  deletePushSubscription
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

const rawApiBase = import.meta.env.VITE_API_BASE || ''
const apiBase = rawApiBase.replace(/\/$/, '')
const apiOrigin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : ''
const mediaBase = (import.meta.env.VITE_MEDIA_BASE || import.meta.env.VITE_SOCKET_URL || apiOrigin || '').replace(/\/$/, '')
const webPushFeatureEnabled = String(import.meta.env.VITE_ENABLE_WEB_PUSH || '').toLowerCase() === 'true'
const AVATAR_ZOOM_MIN = 1
const AVATAR_ZOOM_MAX = 2.5
const PUSH_OPEN_STORAGE_KEY = 'ktk_push_open_conversation'
const DRAFT_STORAGE_KEY = 'ktk_message_drafts'
const CHAT_LIST_FILTERS = {
  all: 'all',
  unread: 'unread',
  favorites: 'favorites'
}
const VIDEO_NOTE_KIND = 'video-note'
const VIDEO_NOTE_MAX_SECONDS = 60
const MESSAGE_MENU_CURSOR_GAP = 4
const INITIAL_MESSAGE_MENU_STATE = {
  open: false,
  x: 0,
  y: 0,
  anchorX: null,
  anchorY: null,
  message: null,
  showAllReactions: false
}
const QUICK_MESSAGE_REACTIONS = ['❤️', '👍', '😭', '👎', '🤩', '🐳', '❤️‍🔥']
const ALL_MESSAGE_REACTIONS = Array.from(new Set([
  ...QUICK_MESSAGE_REACTIONS,
  '👌', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🎉', '🤬',
  '😢', '🙏', '🤝', '🫡', '💯', '🤣', '😇', '🥳', '😴', '😎',
  '😡', '💔', '💩', '😈', '👀', '🎃', '🙈', '🙉', '🙊', '🫶',
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

function getVideoExtensionFromMime(mimeType) {
  const normalized = String(mimeType || '').toLowerCase()
  if (normalized.includes('mp4')) return 'mp4'
  if (normalized.includes('ogg')) return 'ogv'
  return 'webm'
}

function isVideoMessageAttachment(message) {
  if (!message || !message.attachmentUrl) return false
  if (message.attachmentKind === 'video' || message.attachmentKind === VIDEO_NOTE_KIND) return true
  const mime = String(message.attachmentMime || '').toLowerCase()
  if (mime.startsWith('video/')) return true
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(message.attachmentUrl)
}

function getMessagePreviewLabel(message, emptyText = 'Сообщение') {
  if (message && typeof message.body === 'string' && message.body.trim()) {
    const text = message.body.trim()
    return text.length > 120 ? `${text.slice(0, 117)}...` : text
  }
  if (message && message.attachmentUrl) {
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

function normalizeChatMessage(message) {
  if (!message || typeof message !== 'object') return message
  return {
    ...message,
    reactions: normalizeMessageReactions(message.reactions)
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
  const [messageFile, setMessageFile] = useState(null)
  const [messagePreview, setMessagePreview] = useState('')
  const [messagePreviewType, setMessagePreviewType] = useState('')
  const [messageAttachmentKind, setMessageAttachmentKind] = useState('')
  const [videoNoteRecording, setVideoNoteRecording] = useState(false)
  const [videoNoteDuration, setVideoNoteDuration] = useState(0)
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
  const [postMenu, setPostMenu] = useState({ open: false, x: 0, y: 0, post: null })
  const [chatMenu, setChatMenu] = useState({ open: false, x: 0, y: 0 })
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
  const contextMenuRef = useRef(null)
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
      const name = activeConversation.other.displayName || activeConversation.other.username || 'User'
      return `${name} is typing...`
    }
    if (userIds.length === 1) return 'Someone is typing...'
    return `${userIds.length} people are typing...`
  }, [typingByConversation, activeConversation, user])
  const callUser = useMemo(() => {
    if (!callState.withUserId) return null
    if (activeConversation && !activeConversation.isGroup && activeConversation.other.id === callState.withUserId) {
      return activeConversation.other
    }
    const conv = conversations.find((item) => !item.isGroup && item.other && item.other.id === callState.withUserId)
    return conv ? conv.other : { id: callState.withUserId, username: 'user', displayName: '' }
  }, [callState.withUserId, activeConversation, conversations])
  const callTitle = callUser ? (callUser.displayName || callUser.username) : 'Пользователь'
  const callSubtitle = callUser && callUser.username ? `@${callUser.username}` : ''
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
        const mimeType = (firstChunk && firstChunk.type) || recorder.mimeType || preferredMimeType || 'video/webm'
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
        const extension = getVideoExtensionFromMime(blob.type || mimeType)
        const file = new File([blob], `video-note-${Date.now()}.${extension}`, { type: blob.type || mimeType })
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

  const applyIncomingReactionDelta = (payload) => {
    if (!payload || !payload.messageId) return
    patchMessageById(payload.messageId, (message) =>
      applyReactionDeltaToMessage(message, payload, user ? user.id : '')
    )
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

  const handleMessageInputChange = (event) => {
    const value = event.target.value
    setMessageText(value)

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
      return
    }
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
    const handleHotkey = (event) => {
      if (!user || event.defaultPrevented) return
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      const target = event.target
      const tagName = target && target.tagName ? target.tagName.toLowerCase() : ''
      if (tagName === 'input' || tagName === 'textarea' || (target && target.isContentEditable)) return
      event.preventDefault()
      setView('chats')
      window.requestAnimationFrame(() => {
        if (chatSearchInputRef.current) {
          chatSearchInputRef.current.focus()
          chatSearchInputRef.current.select()
        }
      })
    }
    window.addEventListener('keydown', handleHotkey)
    return () => window.removeEventListener('keydown', handleHotkey)
  }, [user])

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
    if (!activeConversation) {
      setMessageText('')
      clearMessageAttachment()
      return
    }
    const draft = draftsRef.current[activeConversation.id]
    setMessageText(typeof draft === 'string' ? draft : '')
    clearMessageAttachment()
  }, [activeConversation ? activeConversation.id : null])

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
    setPostMenu({ open: false, x: 0, y: 0, post: null })
    setChatMenu({ open: false, x: 0, y: 0 })
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
            message: getConversationPreview(message),
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
    socket.on('conversation:read', handleConversationRead)
    socket.on('post:new', handlePostNew)
    socket.on('post:delete', handlePostDelete)
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
      socket.off('conversation:read', handleConversationRead)
      socket.off('post:new', handlePostNew)
      socket.off('post:delete', handlePostDelete)
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
      setPostMenu({ open: false, x: 0, y: 0, post: null })
      setChatMenu({ open: false, x: 0, y: 0 })
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

  useEffect(() => {
    if (!contextMenu.open) return
    const menuNode = contextMenuRef.current
    if (!menuNode) return
    const menuWidth = menuNode.offsetWidth || 220
    const menuHeight = menuNode.offsetHeight || 200
    const anchorX = Number.isFinite(contextMenu.anchorX) ? contextMenu.anchorX : contextMenu.x
    const anchorY = Number.isFinite(contextMenu.anchorY) ? contextMenu.anchorY : contextMenu.y
    const nextPos = getAnchoredMenuPosition(anchorX, anchorY, menuWidth, menuHeight)
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
    const url = URL.createObjectURL(file)
    setAvatarSource(url)
    setAvatarZoom(AVATAR_ZOOM_MIN)
    setAvatarOffset({ x: 0, y: 0 })
    setDragStart(null)
    setAvatarModalOpen(true)
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
      setStatus({ type: 'success', message: 'Обложка обновлена.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
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

  const handleSendMessage = async (event) => {
    event.preventDefault()
    if (!activeConversation) return
    if (isChatBlocked) {
      setStatus({ type: 'error', message: 'Вы заблокировали пользователя.' })
      return
    }
    const text = messageText.trim()
    if (!text && !messageFile) return
    stopTyping(activeConversation.id)
    setLoading(true)
    try {
      const data = await sendMessage(activeConversation.id, text, messageFile, {
        attachmentKind: messageAttachmentKind
      })
      const createdMessage = normalizeChatMessage(data.message)
      setMessages((prev) => {
        if (createdMessage && prev.some((msg) => msg.id === createdMessage.id)) return prev
        return createdMessage ? [...prev, createdMessage] : prev
      })
      setMessageText('')
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

  const clampMenuPosition = (x, y, options = {}) => {
    const {
      menuWidth = 220,
      menuHeight = 240,
      padding = 12,
      offsetX = 0,
      offsetY = 0
    } = options
    const maxX = Math.max(padding, window.innerWidth - menuWidth - padding)
    const maxY = Math.max(padding, window.innerHeight - menuHeight - padding)
    return {
      x: Math.max(padding, Math.min(x + offsetX, maxX)),
      y: Math.max(padding, Math.min(y + offsetY, maxY))
    }
  }

  const getAnchoredMenuPosition = (anchorX, anchorY, menuWidth, menuHeight, options = {}) => {
    const { padding = 12, gap = MESSAGE_MENU_CURSOR_GAP } = options
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const spaceRight = viewportWidth - anchorX - padding
    const spaceLeft = anchorX - padding
    const spaceBottom = viewportHeight - anchorY - padding
    const spaceTop = anchorY - padding

    let x
    if (spaceRight >= menuWidth + gap) {
      x = anchorX + gap
    } else if (spaceLeft >= menuWidth + gap) {
      x = anchorX - menuWidth - gap
    } else {
      x = anchorX - (menuWidth / 2)
    }

    let y
    if (spaceBottom >= menuHeight + gap) {
      y = anchorY + gap
    } else if (spaceTop >= menuHeight + gap) {
      y = anchorY - menuHeight - gap
    } else {
      y = anchorY - (menuHeight / 2)
    }

    return clampMenuPosition(x, y, { menuWidth, menuHeight, padding })
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
    setPostMenu({ open: false, x: 0, y: 0, post: null })
    setChatMenu({ open: false, x: 0, y: 0 })
    const anchorX = event.clientX
    const anchorY = event.clientY
    setContextMenu({
      open: true,
      x: anchorX,
      y: anchorY,
      anchorX,
      anchorY,
      message: msg,
      showAllReactions: false
    })
  }

  const startEditMessage = (msg) => {
    setEditingMessageId(msg.id)
    setEditingMessageText(msg.body || '')
    setContextMenu(INITIAL_MESSAGE_MENU_STATE)
  }

  const handleDeleteMessage = (msg) => {
    deleteMessage(msg.id)
      .then(() => {
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
    setChatMenu({ open: false, x: 0, y: 0 })
    const pos = clampMenuPosition(event.clientX, event.clientY)
    setPostMenu({ open: true, x: pos.x, y: pos.y, post })
  }

  const startEditPost = (post) => {
    setEditingPostId(post.id)
    setEditingPostText(post.body || '')
    setPostMenu({ open: false, x: 0, y: 0, post: null })
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
      .finally(() => setPostMenu({ open: false, x: 0, y: 0, post: null }))
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
    setPostMenu({ open: false, x: 0, y: 0, post: null })
    const rect = event.currentTarget.getBoundingClientRect()
    const pos = clampMenuPosition(rect.right, rect.bottom + 8)
    setChatMenu({ open: true, x: pos.x, y: pos.y })
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
    setChatMenu({ open: false, x: 0, y: 0 })
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
      setChatMenu({ open: false, x: 0, y: 0 })
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
      setPostMenu({ open: false, x: 0, y: 0, post: null })
      return
    }
    await handleRepostPost(post.id)
    setPostMenu({ open: false, x: 0, y: 0, post: null })
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
            >
              {icons.chats}
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
                          : (conv.other?.username || 'U')[0].toUpperCase()}
                      </span>
                      <div className="chat-meta">
                        <div className="chat-title-row">
                          <div className="chat-title">
                            {conv.isGroup ? conv.title : (conv.other?.displayName || conv.other?.username || 'Пользователь')}
                          </div>
                          {isFavorite && (
                            <span className="chat-favorite-mark" title="Избранный чат">★</span>
                          )}
                        </div>
                        <div className={`chat-preview ${hasDraft ? 'draft' : ''}`}>
                          {hasDraft ? draftPreview : (conv.lastMessage || 'Нет сообщений')}
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

            <section className="chat-window">
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
                              (activeConversation.other.username || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3>{activeConversation.other.displayName || activeConversation.other.username}</h3>
                            <div className="chat-status">
                              <span className={`presence-dot ${isOnline(activeConversation.other.id) ? 'online' : ''}`}></span>
                              {isOnline(activeConversation.other.id) ? 'в сети' : 'не в сети'}
                            </div>
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
                  <div className="chat-messages" ref={chatMessagesRef}>
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
                        <div className="message-bubble">
                          {msg.attachmentUrl && (
                            isVideoMessageAttachment(msg) ? (
                              <video
                                src={resolveMediaUrl(msg.attachmentUrl)}
                                className={`media-thumb ${msg.attachmentKind === VIDEO_NOTE_KIND ? 'video-note-player' : ''}`.trim()}
                                controls
                                playsInline
                                preload="metadata"
                              />
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
                            msg.body ? <p className="message-text">{msg.body}</p> : null
                          )}
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
                            <button type="button" onClick={() => {
                              startEditMessage(msg)
                            }}>✏️</button>
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
                  {contextMenu.open && contextMenu.message && (
                    <div
                      ref={contextMenuRef}
                      className="message-menu"
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
                      {contextMenu.message.body && (
                        <button type="button" onClick={() => handleCopyMessage(contextMenu.message)}>
                          Копировать текст
                        </button>
                      )}
                      <button type="button" onClick={() => togglePinMessage(contextMenu.message)}>
                        {pinnedMessage && pinnedMessage.id === contextMenu.message.id ? 'Открепить' : 'Закрепить'}
                      </button>
                      {(contextMenu.message.senderId === user.id || user.isAdmin) && (
                        <button type="button" onClick={() => startEditMessage(contextMenu.message)}>
                          Редактировать
                        </button>
                      )}
                      {(contextMenu.message.senderId === user.id || user.isAdmin) && (
                        <button type="button" className="danger" onClick={() => handleDeleteMessage(contextMenu.message)}>
                          Удалить
                        </button>
                      )}
                    </div>
                  )}
                  <form className={`composer ${isChatBlocked ? 'disabled' : ''}`} onSubmit={handleSendMessage}>
                    <input
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
                        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov,.ogv,.ogg,.m4v"
                        disabled={isChatBlocked}
                        onChange={(event) => {
                          const file = event.target.files && event.target.files[0] ? event.target.files[0] : null
                          if (!file) {
                            clearMessageAttachment()
                            return
                          }
                          stopVideoNoteRecording(true)
                          const isVideo = String(file.type || '').toLowerCase().startsWith('video/')
                          setMessageFile(file)
                          setMessageAttachmentKind(isVideo ? 'video' : 'image')
                          setMessagePreviewType(isVideo ? 'video' : 'image')
                          setComposerPreviewUrl(URL.createObjectURL(file))
                        }}
                      />
                    </label>
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
                  {videoNoteRecording && (
                    <div className="video-note-live">
                      <video ref={videoNotePreviewRef} autoPlay muted playsInline />
                      <span>Запись {videoNoteDuration}с / {VIDEO_NOTE_MAX_SECONDS}с</span>
                    </div>
                  )}
                  {messagePreview && (
                    <div className="upload-preview">
                      {messagePreviewType === 'video' ? (
                        <video
                          src={messagePreview}
                          className={messageAttachmentKind === VIDEO_NOTE_KIND ? 'video-note-player' : ''}
                          controls
                          playsInline
                          preload="metadata"
                        />
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

            <div className="feed-list">
              {posts.length === 0 && (
                <div className="empty">Постов пока нет.</div>
              )}
              {posts.map((post) => (
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
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerChange} />
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
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
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

        {postMenu.open && postMenu.post && (
          <div
            className="message-menu"
            style={{ top: `${postMenu.y}px`, left: `${postMenu.x}px` }}
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
          </div>
        )}

        {chatMenu.open && activeConversation && !activeConversation.isGroup && (
          <div
            className="message-menu"
            style={{ top: `${chatMenu.y}px`, left: `${chatMenu.x}px` }}
          >
            <button type="button" onClick={() => {
              setChatMenu({ open: false, x: 0, y: 0 })
              openProfile(activeConversation.other.username)
            }}>
              Открыть профиль
            </button>
            <button type="button" onClick={() => {
              setChatMenu({ open: false, x: 0, y: 0 })
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
              setChatMenu({ open: false, x: 0, y: 0 })
              handleCall()
            }}>
              Звонок
            </button>
            <button type="button" className="danger" onClick={toggleChatBlock}>
              {isChatBlocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>
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
