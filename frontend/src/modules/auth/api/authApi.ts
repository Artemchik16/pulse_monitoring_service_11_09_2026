import { apiClient } from '@/shared/api'

import type { AuthResponse, Credentials, User } from '../model/types'

export const authApi = {
  async login(credentials: Credentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/login', credentials)
    return data
  },

  async register(credentials: Credentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/v1/auth/register', credentials)
    return data
  },

  async logout(refresh: string): Promise<void> {
    await apiClient.post('/api/v1/auth/logout', { refresh })
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/v1/auth/me')
    return data
  },
}
