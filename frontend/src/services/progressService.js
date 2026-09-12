import { apiRequest } from './api'

export const getProgress = async (period = 'all') => {
  return apiRequest(
    `/api/progress?period=${encodeURIComponent(period)}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}