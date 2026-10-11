import { apiRequest } from './api'


export const getStudySessionNotifications =
  async () => {
    return apiRequest(
      '/api/notifications',
      {
        method: 'GET',
        requiresAuth: true,
      }
    )
  }


export const markStudySessionNotificationRead =
  async (notificationId) => {
    return apiRequest(
      `/api/notifications/${notificationId}/read`,
      {
        method: 'PUT',
        requiresAuth: true,
      }
    )
  }


export const markAllStudySessionNotificationsRead =
  async () => {
    return apiRequest(
      '/api/notifications/read-all',
      {
        method: 'PUT',
        requiresAuth: true,
      }
    )
  }