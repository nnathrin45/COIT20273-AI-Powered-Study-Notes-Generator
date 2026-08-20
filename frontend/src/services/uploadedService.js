import { apiRequest } from './api'

export const getUploadedFiles = async () => {
  return apiRequest('/api/uploaded', {
    method: 'GET',
    requiresAuth: true,
  })
}