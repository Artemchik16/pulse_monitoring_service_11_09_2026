import axios from 'axios'

import { API_URL } from '@/shared/config/env'

import { sessionExpiredError, toApiError } from './errors'
import { endSession, getTokens, setTokens, type TokenPair } from './session'

export const REFRESH_PATH = '/api/v1/auth/refresh'

// Bare client: refresh must not go through the interceptors it serves
const refreshClient = axios.create({ baseURL: API_URL, timeout: 15_000 })

let inflight: Promise<string> | null = null

/**
 * Get a fresh access token after `staleAccess` was rejected.
 *
 * - One refresh per tab at a time: concurrent 401s share the same promise.
 * - One refresh across tabs: the Web Locks API serializes tabs. Refresh tokens are single-use
 *   (rotation + blacklist), so two tabs refreshing with the same token would log one out.
 * - If another tab already rotated the tokens, the new access token is reused without a call.
 */
export function refreshAccessToken(staleAccess: string): Promise<string> {
  inflight ??= withCrossTabLock(() => refreshOnce(staleAccess)).finally(() => {
    inflight = null
  })
  return inflight
}

async function refreshOnce(staleAccess: string): Promise<string> {
  const current = getTokens()
  if (!current) throw sessionExpiredError()
  if (current.access !== staleAccess) return current.access

  try {
    const { data } = await refreshClient.post<TokenPair>(REFRESH_PATH, { refresh: current.refresh })
    setTokens(data)
    return data.access
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError.status === 401) {
      endSession('expired')
      throw sessionExpiredError()
    }
    // Network or server failure: keep the session, the caller shows a retryable error
    throw apiError
  }
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('pulse:token-refresh', task)
  }
  return task()
}
