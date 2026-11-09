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
import {
  EditStatusPagePage,
  NewStatusPagePage,
  PublicStatusPage,
  StatusPagesPage,
  statusPageQueryOptions,
} from '@/modules/status-pages'
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

/** Numeric path ids: anything that is not a positive integer is "not found". */
function parseId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  return id
}

const monitorParams = {
  parse: ({ monitorId }: { monitorId: string }) => ({ monitorId: parseId(monitorId) }),
  stringify: ({ monitorId }: { monitorId: number }) => ({ monitorId: String(monitorId) }),
}

/** Missing or someone else's object: the API answers 404 for both. */
async function ensureOr404(load: () => Promise<unknown>) {
  try {
    await load()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}

function loadMonitor({ context, params }: { context: RouterContext; params: { monitorId: number } }) {
  return ensureOr404(() => context.queryClient.ensureQueryData(monitorQueryOptions(params.monitorId)))
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

const statusPagesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/status-pages',
  component: StatusPagesPage,
})

const newStatusPageRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/status-pages/new',
  component: NewStatusPagePage,
})

const editStatusPageRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/status-pages/$pageId/edit',
  params: {
    parse: ({ pageId }: { pageId: string }) => ({ pageId: parseId(pageId) }),
    stringify: ({ pageId }: { pageId: number }) => ({ pageId: String(pageId) }),
  },
  loader: ({ context, params }) =>
    ensureOr404(() => context.queryClient.ensureQueryData(statusPageQueryOptions(params.pageId))),
  component: EditStatusPagePage,
})

/** Public status page: no auth guard, no app shell; works for signed-in users too. */
const publicStatusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/status/$slug',
  component: PublicStatusPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  publicStatusRoute,
  appRoute.addChildren([
    dashboardRoute,
    newMonitorRoute,
    monitorDetailRoute,
    editMonitorRoute,
    statusPagesRoute,
    newStatusPageRoute,
    editStatusPageRoute,
  ]),
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
