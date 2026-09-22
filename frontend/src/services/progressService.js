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

export const deleteSelectedActivities = async (
  activityIds
) => {
  return apiRequest(
    '/api/progress/activity/selected',
    {
      method: 'DELETE',
      requiresAuth: true,
      body: {
        activity_ids: activityIds,
      },
    }
  )
}

export const clearActivityHistory = async () => {
  return apiRequest(
    '/api/progress/activity/all',
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  )
}
