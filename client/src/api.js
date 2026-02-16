const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function getToken() {
  return localStorage.getItem('ktk_token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('ktk_token', token)
  } else {
    localStorage.removeItem('ktk_token')
  }
}

export function getTokenValue() {
  return getToken()
}

async function request(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.error || 'Unexpected error'
    throw new Error(message)
  }
  return data
}

export async function getHealth() {
  return request('/health')
}

export async function getRoles() {
  return request('/roles')
}

export async function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

export async function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload })
}

export async function getMe() {
  return request('/me')
}

export async function updateMe(payload) {
  return request('/me', { method: 'PATCH', body: payload })
}

export async function uploadAvatar(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await fetch(`${API_BASE}/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unexpected error')
  }
  return data
}

export async function searchUsers(username) {
  const params = new URLSearchParams({ username })
  return request(`/users/search?${params.toString()}`)
}

export async function createConversation(username) {
  return request('/conversations', { method: 'POST', body: { username } })
}

export async function createGroupConversation(title, members) {
  return request('/conversations/group', { method: 'POST', body: { title, members } })
}

export async function getConversations() {
  return request('/conversations')
}

export async function getMessages(conversationId) {
  return request(`/conversations/${conversationId}/messages`)
}

export async function markConversationRead(conversationId) {
  return request(`/conversations/${conversationId}/read`, { method: 'POST' })
}

export async function sendMessage(conversationId, body, file) {
  if (file) {
    const token = getToken()
    const formData = new FormData()
    formData.append('body', body || '')
    formData.append('file', file)
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Unexpected error')
    }
    return data
  }
  return request(`/conversations/${conversationId}/messages`, { method: 'POST', body: { body } })
}

export async function getPresence() {
  return request('/presence')
}

export async function getPushPublicKey() {
  return request('/notifications/vapid-public-key')
}

export async function savePushSubscription(subscription) {
  return request('/notifications/push-subscription', {
    method: 'PUT',
    body: { subscription }
  })
}

export async function deletePushSubscription(endpoint) {
  return request('/notifications/push-subscription', {
    method: 'DELETE',
    body: { endpoint }
  })
}

export async function getPosts() {
  return request('/posts')
}

export async function createPost(body, file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('body', body || '')
  if (file) formData.append('image', file)
  const response = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unexpected error')
  }
  return data
}

export async function likePost(postId) {
  return request(`/posts/${postId}/like`, { method: 'POST' })
}

export async function repostPost(postId) {
  return request(`/posts/${postId}/repost`, { method: 'POST' })
}

export async function getComments(postId) {
  return request(`/posts/${postId}/comments`)
}

export async function addComment(postId, body) {
  return request(`/posts/${postId}/comments`, { method: 'POST', body: { body } })
}

export async function getProfile(username) {
  return request(`/users/${username}`)
}

export async function getProfilePosts(username) {
  return request(`/users/${username}/posts`)
}

export async function uploadBanner(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('banner', file)
  const response = await fetch(`${API_BASE}/me/banner`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Unexpected error')
  }
  return data
}

export async function editMessage(messageId, body) {
  return request(`/messages/${messageId}`, { method: 'PATCH', body: { body } })
}

export async function deleteMessage(messageId) {
  return request(`/messages/${messageId}`, { method: 'DELETE' })
}

export async function editPost(postId, body) {
  return request(`/posts/${postId}`, { method: 'PATCH', body: { body } })
}

export async function deletePost(postId) {
  return request(`/posts/${postId}`, { method: 'DELETE' })
}

export async function adminListUsers(query) {
  const params = new URLSearchParams({ q: query || '' })
  return request(`/admin/users?${params.toString()}`)
}

export async function adminBanUser(userId) {
  return request('/admin/ban', { method: 'POST', body: { userId } })
}

export async function adminUnbanUser(userId) {
  return request('/admin/unban', { method: 'POST', body: { userId } })
}

export async function adminWarnUser(userId, reason) {
  return request('/admin/warn', { method: 'POST', body: { userId, reason } })
}

export async function adminSetModerator(userId, makeModerator) {
  return request('/admin/moder', { method: 'POST', body: { userId, makeModerator } })
}

export async function adminClearWarnings(userId) {
  return request('/admin/clear-warnings', { method: 'POST', body: { userId } })
}

