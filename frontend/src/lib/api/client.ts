import axios from 'axios'
import { supabase } from '../auth/supabase'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !data.session) {
          throw new Error('Refresh session failed')
        }
        const token = data.session.access_token
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      } catch (refreshFailed) {
        await supabase.auth.signOut()
        window.location.href = '/login'
        return Promise.reject(refreshFailed)
      }
    }
    return Promise.reject(error)
  }
)
