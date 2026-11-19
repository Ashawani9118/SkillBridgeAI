const USER_KEY = 'skillbridge_user'
const LOGIN_KEY = 'skillbridge_logged_in'
const TOKEN_KEY = 'skillbridge_access_token'

export function saveUser(user) {
  const safeUser = { ...(user || {}) }

  // Never persist passwords in browser storage.
  delete safeUser.password

  localStorage.setItem(USER_KEY, JSON.stringify(safeUser))
  window.dispatchEvent(new Event('userUpdated'))

  return safeUser
}

export function getUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    const user = JSON.parse(rawUser)

    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      localStorage.removeItem(USER_KEY)
      return null
    }

    // Remove plaintext passwords left by the previous local-only login.
    if (Object.prototype.hasOwnProperty.call(user, 'password')) {
      delete user.password
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }

    return user
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function updateUser(updatedData) {
  const currentUser = getUser() || {}
  return saveUser({
    ...currentUser,
    ...(updatedData || {}),
  })
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function loginUser(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('A valid access token is required to log in.')
  }

  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(LOGIN_KEY, 'true')
}

export function logoutUser() {
  localStorage.removeItem(LOGIN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn() {
  return localStorage.getItem(LOGIN_KEY) === 'true'
}
