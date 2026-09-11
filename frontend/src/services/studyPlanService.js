import { apiRequest } from './api'

export const createStudyPlan = async (plan) => {
  return apiRequest('/api/study-plans', {
    method: 'POST',
    body: plan,
    requiresAuth: true,
  })
}

export const getStudyPlans = async () => {
  return apiRequest('/api/study-plans', {
    method: 'GET',
    requiresAuth: true,
  })
}

export const getStudyPlanById = async (planId) => {
  return apiRequest(`/api/study-plans/${planId}`, {
    method: 'GET',
    requiresAuth: true,
  })
}

export const deleteStudyPlan = async (planId) => {
  return apiRequest(`/api/study-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  })
}