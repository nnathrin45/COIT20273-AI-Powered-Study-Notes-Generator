import { apiRequest } from './api'

export const generateAIContent = async ({
  fileId,
  outputType,
  concept,
  level,
}) => {
  const body = {
    file_id: fileId,
    output_type: outputType,
  }

  if (concept !== undefined) {
    body.concept = concept
  }

  if (level !== undefined) {
    body.level = level
  }

  return apiRequest('/api/ai/generate', {
    method: 'POST',
    requiresAuth: true,
    body,
  })
}