import { apiRequest } from './api'

export const uploadStudyMaterial = async (file) => {
  const formData = new FormData()

  formData.append('file', file)

  return apiRequest('/api/upload', {
    method: 'POST',
    body: formData,
    requiresAuth: true,
    isFormData: true,
  })
}