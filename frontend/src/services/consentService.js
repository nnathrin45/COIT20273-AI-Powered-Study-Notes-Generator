import { apiRequest } from './api'

export const getConsentStatus = async () => {
  return apiRequest('/api/consent', {
    method: 'GET',
    requiresAuth: true,
  })
}

export const updateConsentStatus = async (status) => {
  if (status !== 'granted' && status !== 'revoked') {
    throw new Error(
      'Consent status must be either granted or revoked.'
    )
  }

  return apiRequest('/api/consent', {
    method: 'POST',
    requiresAuth: true,
    body: {
      status,
    },
  })
}

export const formatConsentTime = (recordedAt) => {
  if (!recordedAt) {
    return ''
  }

  const date = new Date(recordedAt)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString()
}