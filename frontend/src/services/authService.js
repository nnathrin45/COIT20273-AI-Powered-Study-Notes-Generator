import {
  apiRequest,
  removeAuthToken,
  setAuthToken,
} from './api'

export const registerUser = async (
  fullName,
  email,
  password
) => {
  return apiRequest('/api/users/register', {
    method: 'POST',
    requiresAuth: false,
    body: {
      full_name: fullName,
      email,
      password,
    },
  })
}

export const loginUser = async (
  email,
  password
) => {
  const response = await apiRequest(
    '/api/users/login',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        email,
        password,
      },
    }
  )

  if (
    response.ok &&
    response.data.status === 'success' &&
    response.data.token
  ) {
    setAuthToken(response.data.token)
  }

  return response
}

export const logoutUser = () => {
  removeAuthToken()
}