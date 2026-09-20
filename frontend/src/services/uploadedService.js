import { apiRequest } from './api'

export const getUploadedFiles = async () => {
  return apiRequest('/api/uploaded', {
    method: 'GET',
    requiresAuth: true,
  })
}

export const getUploadedFile = async (fileId) => {
  return apiRequest(`/api/uploaded/${fileId}`, {
    method: 'GET',
    requiresAuth: true,
  })
}

export const deleteUploadedFile = async (fileId) => {
  return apiRequest(`/api/uploaded/${fileId}`, {
    method: 'DELETE',
    requiresAuth: true,
  })
}