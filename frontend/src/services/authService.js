import {
  apiRequest,
  removeAuthToken,
  setAuthToken,
} from './api'


const getCurrentTheme = () => {
  return localStorage.getItem(
    'studya-theme'
  ) === 'light'
    ? 'light'
    : 'dark'
}


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
      theme: getCurrentTheme(),
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
        theme: getCurrentTheme(),
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


export const verifyLoginCode = async (
  challengeToken,
  code
) => {
  const response = await apiRequest(
    '/api/users/verify-login-code',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        challenge_token: challengeToken,
        code,
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


export const resendLoginCode = async (
  challengeToken
) => {
  return apiRequest(
    '/api/users/resend-login-code',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        challenge_token: challengeToken,
        theme: getCurrentTheme(),
      },
    }
  )
}


export const requestPasswordReset = async (
  email
) => {
  return apiRequest(
    '/api/users/forgot-password',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        email,
        theme: getCurrentTheme(),
      },
    }
  )
}


export const verifyPasswordResetCode = async (
  email,
  code
) => {
  return apiRequest(
    '/api/users/verify-reset-code',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        email,
        code,
      },
    }
  )
}


export const resetUserPassword = async (
  resetToken,
  newPassword
) => {
  return apiRequest(
    '/api/users/reset-password',
    {
      method: 'POST',
      requiresAuth: false,
      body: {
        reset_token: resetToken,
        new_password: newPassword,
      },
    }
  )
}


export const logoutUser = () => {
  removeAuthToken()
}


export const verifyEmail = async (
  email,
  code
) => {
  return apiRequest(
    '/api/users/verify-email',
    {
      method: 'POST',
      body: {
        email,
        code,
      },
    }
  )
}


export const resendVerificationCode = async (
  email
) => {
  return apiRequest(
    '/api/users/resend-verification',
    {
      method: 'POST',
      body: {
        email,
        theme: getCurrentTheme(),
      },
    }
  )
}