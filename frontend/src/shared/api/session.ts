import { createStore } from '@tanstack/react-store'

import { safeStorage } from '@/shared/lib/storage'

export interface TokenPair {
  access: string
  refresh: string
}

export type LogoutReason = 'logout' | 'expired'

export interface SessionState {
  tokens: TokenPair | null
  /** Why the last session ended: the login page explains an expired session. */
  endedBy: LogoutReason | null
}

const STORAGE_KEY = 'pulse:session'

function readTokens(): TokenPair | null {
  const raw = safeStorage.get(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TokenPair>
    return parsed.access && parsed.refresh ? { access: parsed.access, refresh: parsed.refresh } : null
  } catch {
    return null
  }
}

/** Auth session shared by every module; persisted and synced across tabs. */
export const sessionStore = createStore<SessionState>({ tokens: readTokens(), endedBy: null })

export function getTokens(): TokenPair | null {
  return sessionStore.state.tokens
}

export function isAuthenticated(): boolean {
  return sessionStore.state.tokens !== null
}

export function setTokens(tokens: TokenPair): void {
  safeStorage.set(STORAGE_KEY, JSON.stringify(tokens))
  sessionStore.setState(() => ({ tokens, endedBy: null }))
}

export function endSession(reason: LogoutReason): void {
  safeStorage.remove(STORAGE_KEY)
  sessionStore.setState(() => ({ tokens: null, endedBy: reason }))
}

// Another tab logged in, rotated tokens or logged out: follow it
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const tokens = readTokens()
    sessionStore.setState((state) => ({
      tokens,
      endedBy: tokens ? null : (state.endedBy ?? 'logout'),
    }))
  })
}
