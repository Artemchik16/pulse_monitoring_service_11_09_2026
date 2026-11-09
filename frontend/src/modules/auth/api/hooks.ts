import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { endSession, getTokens, setTokens } from '@/shared/api'

import { authKeys } from '../model/queryKeys'
import type { AuthResponse, Credentials } from '../model/types'
import { authApi } from './authApi'

export const meQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
  })

export function useMe() {
  return useQuery(meQueryOptions())
}

function useStartSession() {
  const queryClient = useQueryClient()
  return ({ user, tokens }: AuthResponse) => {
    setTokens(tokens)
    queryClient.setQueryData(authKeys.me(), user)
  }
}

export function useLogin() {
  const startSession = useStartSession()
  return useMutation({
    mutationFn: (credentials: Credentials) => authApi.login(credentials),
    onSuccess: startSession,
  })
}

export function useRegister() {
  const startSession = useStartSession()
  return useMutation({
    mutationFn: (credentials: Credentials) => authApi.register(credentials),
    onSuccess: startSession,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const tokens = getTokens()
      if (!tokens) return
      try {
        await authApi.logout(tokens.refresh)
      } catch {
        // Revoking on the server is best effort: the local session ends regardless
      }
    },
    onSettled: () => {
      endSession('logout')
      queryClient.clear()
    },
  })
}
