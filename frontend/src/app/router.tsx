import type { QueryClient } from '@tanstack/react-query'
import {
  type RouterHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { LoginPage, loginSearchSchema, meQueryOptions, RegisterPage } from '@/modules/auth'
import {
  DashboardPage,
  dashboardSearchSchema,
  EditMonitorPage,
  MonitorDetailPage,
  monitorDetailSearchSchema,
  monitorQueryOptions,
  NewMonitorPage,
} from '@/modules/monitors'
import { ApiError, isAuthenticated, sessionStore } from '@/shared/api'

import { AppShell } from './layout/AppShell'
import { RouteError, RouteNotFound, RoutePending } from './layout/RouteStates'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: RouteNotFound,
})

/** Login/register are for guests only. */
function guestOnly() {
  if (isAuthenticated()) throw redirect({ to: '/' })
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: guestOnly,
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: guestOnly,
  component: RegisterPage,
})

function toLogin(href: string): never {
  const reason = sessionStore.state.endedBy === 'expired' ? 'expired' : undefined
  throw redirect({ to: '/login', search: { redirect: href, reason }, replace: true })
}

/** Everything behind auth: no session -> login; a dead session found while loading -> login. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) toLogin(location.href)
  },
  loader: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions())
    } catch (error) {
      if (error instanceof ApiError && error.isSessionExpired) toLogin(location.href)
      throw error
    }
  },
  component: AppShell,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  validateSearch: dashboardSearchSchema,
  component: DashboardPage,
})

const newMonitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitors/new',
  component: NewMonitorPage,
})

/** `/monitors/$monitorId/...`: the id is a positive integer, anything else is "not found". */
const monitorParams = {
  parse: ({ monitorId }: { monitorId: string }) => {
    const id = Number(monitorId)
    if (!Number.isInteger(id) || id <= 0) throw notFound()
    return { monitorId: id }
  },
  stringify: ({ monitorId }: { monitorId: number }) => ({ monitorId: String(monitorId) }),
}

async function loadMonitor({ context, params }: { context: RouterContext; params: { monitorId: number } }) {
  try {
    await context.queryClient.ensureQueryData(monitorQueryOptions(params.monitorId))
  } catch (error) {
    // Missing or someone else's monitor: the API answers 404 for both
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}

const monitorDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitors/$monitorId',
  params: monitorParams,
  validateSearch: monitorDetailSearchSchema,
  loader: loadMonitor,
  component: MonitorDetailPage,
})

const editMonitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitors/$monitorId/edit',
  params: monitorParams,
  loader: loadMonitor,
  component: EditMonitorPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  appRoute.addChildren([dashboardRoute, newMonitorRoute, monitorDetailRoute, editMonitorRoute]),
])

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: 'intent',
    // Loader data lives in TanStack Query; the router should always ask it
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultPendingComponent: RoutePending,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
