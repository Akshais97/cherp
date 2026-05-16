import { apiClient } from '../../lib/api/client'

export function requestPasswordReset(email: string) {
  return apiClient
    .post<{ message: string }>('/auth/forgot-password', { email })
    .then((response) => response.data)
}
