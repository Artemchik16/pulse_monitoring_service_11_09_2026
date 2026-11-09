import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { API_URL } from '@/shared/config/env'

import { toApiError } from './errors'
import { REFRESH_PATH, refreshAccessToken } from './refresh'
import { getTokens } from './session'

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

// Endpoints that authenticate by their body, not by the access token
const PUBLIC_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register', REFRESH_PATH]

/** The only HTTP client of the app: auth header, one-shot token refresh, normalized errors. */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens && !PUBLIC_PATHS.includes(config.url ?? '')) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const sentAccess = config?.headers?.Authorization?.toString().replace(/^Bearer /, '')

    if (error.response?.status === 401 && config && sentAccess && !config._retried) {
      config._retried = true
      try {
        const access = await refreshAccessToken(sentAccess)
        config.headers.Authorization = `Bearer ${access}`
        return apiClient(config)
      } catch (refreshError) {
        throw toApiError(refreshError)
      }
    }
    throw toApiError(error)
  },
)
