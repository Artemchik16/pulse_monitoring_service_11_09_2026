import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

/** Render a component inside QueryClient + a minimal router (for Link/useNavigate). */
export function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute()
  const routes = ['/', '/login', '/register'].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => ui }),
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return { queryClient, ...render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>) }
}
