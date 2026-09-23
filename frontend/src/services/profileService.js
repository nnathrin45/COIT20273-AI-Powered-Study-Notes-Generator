import {
  apiRequest,
  getApiUrl,
  getAuthToken,
  removeAuthToken,
} from './api'


export const getUserProfile = async () => {
  return apiRequest('/api/users/profile', {
    method: 'GET',
    requiresAuth: true,
  })
}


export const updateUserProfile = async (
  fullName
) => {
  return apiRequest('/api/users/profile', {
    method: 'PUT',
    requiresAuth: true,
    body: {
      full_name: fullName,
    },
  })
}


export const uploadProfilePicture = async (
  file
) => {
  const formData = new FormData()

  formData.append(
    'profile_picture',
    file
  )

  return apiRequest(
    '/api/users/profile-picture',
    {
      method: 'POST',
      requiresAuth: true,
      isFormData: true,
      body: formData,
    }
  )
}


export const deleteProfilePicture = async () => {
  return apiRequest(
    '/api/users/profile-picture',
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  )
}


export const getProfilePicture = async () => {
  const token = getAuthToken()

  const response = await fetch(
    getApiUrl(
      '/api/users/profile-picture'
    ),
    {
      method: 'GET',
      headers: token
        ? {
            Authorization:
              `Bearer ${token}`,
          }
        : {},
    }
  )

  if (response.status === 401) {
    removeAuthToken()

    if (
      window.location.pathname !==
      '/login'
    ) {
      window.location.replace(
        '/login'
      )
    }

    return {
      ok: false,
      status: 401,
      blob: null,
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      blob: null,
    }
  }

  const blob = await response.blob()

  return {
    ok: true,
    status: response.status,
    blob,
  }
}

export const changeUserPassword = async (
  currentPassword,
  newPassword
) => {
  return apiRequest('/api/users/password', {
    method: 'PUT',
    requiresAuth: true,
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  })
}