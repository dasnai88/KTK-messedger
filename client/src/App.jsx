import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  createConversation,
  createGroupConversation,
  getConversations,
  getHealth,
  getMe,
  getMessages,
  getProfile,
  getProfilePosts,
  getPosts,
  getPresence,
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
  updateMe,
  addComment,
  editMessage,
  deleteMessage,
  editPost,
  deletePost,
  adminListUsers,
  adminBanUser,
  adminUnbanUser,
  adminWarnUser,
  adminSetModerator,
  adminClearWarnings
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

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const mediaBase = (import.meta.env.VITE_MEDIA_BASE || import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '')
const AVATAR_ZOOM_MIN = 1
const AVATAR_ZOOM_MAX = 2.5

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
    themeColor: '#2aa7ff'
  })
  const [status, setStatus] = useState({ type: 'info', message: '' })
  const [loading, setLoading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [messageFile, setMessageFile] = useState(null)
  const [messagePreview, setMessagePreview] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
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
  const [profilePosts, setProfilePosts] = useState([])
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDraft, setCommentDraft] = useState({})
  const [openComments, setOpenComments] = useState(null)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingMessageText, setEditingMessageText] = useState('')
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, message: null })
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

  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const incomingOfferRef = useRef(null)
  const callStateRef = useRef(callState)
  const blockedUsersRef = useRef(blockedUsers)
  const conversationsRef = useRef(conversations)
  const activeConversationRef = useRef(activeConversation)
  const profileViewRef = useRef(profileView)

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
          themeColor: data.user.themeColor || '#2aa7ff'
        })
        setView(readStoredView(Boolean(data.user && data.user.isAdmin)))
      } catch (err) {
        setUser(null)
      }
    }
    loadMe()
  }, [])

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
        setMessages(data.messages || [])
      } catch (err) {
        setStatus({ type: 'error', message: err.message })
      }
    }
    loadMessages()
  }, [activeConversation])

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
  }, [activeConversation])

  useEffect(() => {
    profileViewRef.current = profileView
  }, [profileView])

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
    setContextMenu({ open: false, x: 0, y: 0, message: null })
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
    if (!token) return
    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', { auth: { token } })
    socketRef.current = socket

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

    const getConversationPreview = (message) => {
      if (message && typeof message.body === 'string' && message.body.trim()) {
        const text = message.body.trim()
        return text.length > 120 ? `${text.slice(0, 117)}...` : text
      }
      if (message && message.attachmentUrl) return '📎 файл'
      return 'Сообщение'
    }

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
          lastMessage: getConversationPreview(message),
          lastAt: message.createdAt
        }
        const next = [...prev]
        next.splice(index, 1)
        return [updated, ...next]
      })
    }

    const handleIncomingMessage = (payload) => {
      if (!payload || !payload.message) return
      updateConversationPreview(payload.conversationId, payload.message)
      const currentActive = activeConversationRef.current
      if (currentActive && payload.conversationId === currentActive.id) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === payload.message.id)) return prev
          return [...prev, payload.message]
        })
      }
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

    socket.on('message', handleIncomingMessage)
    socket.on('post:new', handlePostNew)
    socket.on('post:delete', handlePostDelete)

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
      setCallState({ status: 'incoming', withUserId: fromUserId, direction: 'incoming', startedAt: null })
    }

    const handleCallAnswer = async ({ fromUserId, answer }) => {
      if (callStateRef.current.withUserId !== fromUserId || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        setCallState({ status: 'in-call', withUserId: fromUserId, direction: 'outgoing', startedAt: Date.now() })
      } catch (err) {
        setStatus({ type: 'error', message: 'Не удалось установить соединение.' })
        cleanupCall()
      }
    }

    const handleCallIce = async ({ fromUserId, candidate }) => {
      if (callStateRef.current.withUserId !== fromUserId || !pcRef.current) return
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
      socket.off('message', handleIncomingMessage)
      socket.off('post:new', handlePostNew)
      socket.off('post:delete', handlePostDelete)
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
    }
  }, [user])

  useEffect(() => {
    if (!contextMenu.open && !postMenu.open && !chatMenu.open) return
    const handleClose = () => {
      setContextMenu({ open: false, x: 0, y: 0, message: null })
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
        themeColor: data.user.themeColor || '#2aa7ff'
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
        themeColor: data.user.themeColor || '#2aa7ff'
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
    try {
      const data = await getProfile(username)
      const postsData = await getProfilePosts(username)
      setProfileView(data.user)
      setProfilePosts(postsData.posts || [])
      setView('profile-view')
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

  const handleLogout = () => {
    endCall(false)
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
    setStatus({ type: 'info', message: 'Вы вышли из аккаунта.' })
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
    setLoading(true)
    try {
      const data = await sendMessage(activeConversation.id, text, messageFile)
      setMessages((prev) => {
        if (data.message && prev.some((msg) => msg.id === data.message.id)) return prev
        return [...prev, data.message]
      })
      setMessageText('')
      setMessageFile(null)
      setMessagePreview('')
      const list = await getConversations()
      setConversations(list.conversations || [])
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const clampMenuPosition = (x, y) => {
    const menuWidth = 220
    const menuHeight = 240
    const padding = 12
    const maxX = window.innerWidth - menuWidth - padding
    const maxY = window.innerHeight - menuHeight - padding
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY))
    }
  }

  const openMessageMenu = (event, msg) => {
    if (!activeConversation || activeConversation.isGroup) return
    if (editingMessageId === msg.id) return
    event.preventDefault()
    event.stopPropagation()
    setPostMenu({ open: false, x: 0, y: 0, post: null })
    setChatMenu({ open: false, x: 0, y: 0 })
    const pos = clampMenuPosition(event.clientX, event.clientY)
    setContextMenu({ open: true, x: pos.x, y: pos.y, message: msg })
  }

  const startEditMessage = (msg) => {
    setEditingMessageId(msg.id)
    setEditingMessageText(msg.body || '')
    setContextMenu({ open: false, x: 0, y: 0, message: null })
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
      .finally(() => setContextMenu({ open: false, x: 0, y: 0, message: null }))
  }

  const openPostMenu = (event, post) => {
    if (!post || editingPostId === post.id) return
    if (event.target && event.target.closest('input, textarea')) return
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ open: false, x: 0, y: 0, message: null })
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return
      socketRef.current.emit('call:ice', { toUserId: targetUserId, candidate: event.candidate })
    }
    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) setRemoteStream(stream)
    }
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        cleanupCall()
      }
    }
    pcRef.current = pc
    return pc
  }

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null
      pcRef.current.ontrack = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    incomingOfferRef.current = null
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
    setContextMenu({ open: false, x: 0, y: 0, message: null })
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

  const getMessagePreview = (msg) => {
    if (msg.body && msg.body.trim()) {
      const text = msg.body.trim()
      return text.length > 120 ? `${text.slice(0, 117)}...` : text
    }
    if (msg.attachmentUrl) return '📷 Изображение'
    return 'Сообщение'
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
    setContextMenu({ open: false, x: 0, y: 0, message: null })
  }

  const handleCopyMessage = async (msg) => {
    if (!msg.body) return
    try {
      await navigator.clipboard.writeText(msg.body)
      setStatus({ type: 'success', message: 'Текст скопирован.' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не удалось скопировать текст.' })
    }
    setContextMenu({ open: false, x: 0, y: 0, message: null })
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
          {user ? (
            <div className="top-actions">
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
            </div>
          ) : null}
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

        {status.message ? (
          <div className={`alert ${status.type}`}>{status.message}</div>
        ) : null}

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
                  type="text"
                  value={searchTerm}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Найти по username..."
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
                {conversations.map((conv) => (
                  <button
                    type="button"
                    key={conv.id}
                    className={`chat-item ${activeConversation && conv.id === activeConversation.id ? 'active' : ''}`}
                    onClick={() => setActiveConversation(conv)}
                  >
                    <span className="avatar">
                      {conv.isGroup
                        ? (conv.title || 'G')[0].toUpperCase()
                        : conv.other.username[0].toUpperCase()}
                    </span>
                    <div className="chat-meta">
                      <div className="chat-title">
                        {conv.isGroup ? conv.title : (conv.other.displayName || conv.other.username)}
                      </div>
                      <div className="chat-preview">{conv.lastMessage || 'Нет сообщений'}</div>
                    </div>
                    <div className="chat-time">{formatTime(conv.lastAt)}</div>
                  </button>
                ))}
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
                  </div>
                  <div className="chat-messages">
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
                            <img
                              src={resolveMediaUrl(msg.attachmentUrl)}
                              alt="attachment"
                              className="media-thumb"
                              onClick={() => setLightboxImage(resolveMediaUrl(msg.attachmentUrl))}
                            />
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
                          </div>
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
                      className="message-menu"
                      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    >
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
                      onChange={(event) => setMessageText(event.target.value)}
                      placeholder="Сообщение..."
                      disabled={isChatBlocked}
                    />
                    <label className="file-btn">
                      📷
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={isChatBlocked}
                        onChange={(event) => {
                          const file = event.target.files[0]
                          setMessageFile(file)
                          setMessagePreview(file ? URL.createObjectURL(file) : '')
                        }}
                      />
                    </label>
                    <button className="primary" type="submit" disabled={loading || isChatBlocked}>Отправить</button>
                  </form>
                  {messagePreview && (
                    <div className="upload-preview">
                      <img src={messagePreview} alt="preview" />
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setMessageFile(null)
                          setMessagePreview('')
                        }}
                      >
                        Удалить
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

        {view === 'profile-view' && profileView && (
          <div className="profile-page">
            <button type="button" className="ghost" onClick={() => setView('feed')}>Назад</button>
            <div
              className="profile-hero"
              style={{
                backgroundColor: profileView.themeColor || '#2aa7ff',
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
              <div>
                <h2>{profileView.displayName || profileView.username}</h2>
                <span>@{profileView.username}</span>
                {profileView.bio && <p>{profileView.bio}</p>}
              </div>
            </div>
            <div className="feed-list">
              {profilePosts.length === 0 && (
                <div className="empty">Постов пока нет.</div>
              )}
              {profilePosts.map((post) => (
                <article
                  key={post.id}
                  className="feed-card"
                  onContextMenu={(event) => openPostMenu(event, post)}
                >
                  {post.repostOf && (
                    <div className="repost-badge">? Репост</div>
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

        {view === 'admin' && user && user.isAdmin && (
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


