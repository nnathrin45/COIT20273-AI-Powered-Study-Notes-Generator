const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`
}

export const getAuthToken = () => {
  return localStorage.getItem('token')
}

export const setAuthToken = (token) => {
  localStorage.setItem('token', token)
}

export const removeAuthToken = () => {
  localStorage.removeItem('token')
}

export const apiRequest = async (
  endpoint,
  {
    method = 'GET',
    body = null,
    requiresAuth = true,
    isFormData = false,
  } = {}
) => {
  const headers = {}

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (requiresAuth) {
    const token = getAuthToken()

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const options = {
    method,
    headers,
  }

  if (body) {
    options.body = isFormData
      ? body
      : JSON.stringify(body)
  }

  const response = await fetch(
    getApiUrl(endpoint),
    options
  )

  // If an authenticated request is rejected because the
  // session token is missing, invalid or expired, remove the
  // stored token and return the user to the Login page.
  if (requiresAuth && response.status === 401) {
    removeAuthToken()

    if (window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }

  let data

  try {
    data = await response.json()
  } catch {
    data = {
      status: 'error',
      message: 'The server returned an invalid response.',
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}

export default API_BASE_URL