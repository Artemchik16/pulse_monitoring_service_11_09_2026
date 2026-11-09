import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type RouterHistory, RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { sessionStore } from '@/shared/api'

import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

export function App({ history }: { history?: RouterHistory }) {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient, history))

  useEffect(() => {
    // Session ended (logout, expired refresh, other tab): drop cached data, re-run route guards
    const subscription = sessionStore.subscribe((state) => {
      if (state.tokens) return
      queryClient.clear()
      void router.invalidate()
    })
    return () => subscription.unsubscribe()
  }, [queryClient, router])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
