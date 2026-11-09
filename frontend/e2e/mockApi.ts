import type { Page, Route } from '@playwright/test'

const now = Date.now()
const iso = (msAgo: number) => new Date(now - msAgo).toISOString()

export const LONG_NAME = 'Очень длинное название монитора платёжного шлюза для проверки переносов'
export const LONG_URL = 'https://very-long-subdomain-for-layout-testing.payments.example.com/api/v2/health/check?full=1'

export function monitor(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Монитор ${id}`,
    url: `https://service-${id}.example.com/health`,
    method: 'GET',
    expected_status_from: 200,
    expected_status_to: 299,
    interval_sec: 60,
    timeout_ms: 5000,
    body_contains: '',
    expect_json: false,
    is_active: true,
    is_public: true,
    status: 'UP',
    consecutive_failures: 0,
    last_checked_at: iso(90_000),
    next_check_at: null,
    created_at: iso(86_400_000),
    updated_at: iso(3_600_000),
    ...overrides,
  }
}

export const MONITORS = [
  monitor(1, { name: LONG_NAME, url: LONG_URL, status: 'DOWN' }),
  monitor(2, { name: 'Сайт', status: 'UP' }),
  monitor(3, { name: 'API', status: 'PENDING', last_checked_at: null }),
  monitor(4, { name: 'Блог', status: 'PAUSED', is_active: false, is_public: false }),
]

function series(points: number, stepMs: number) {
  return Array.from({ length: points }, (_, index) => ({
    ts: iso((points - 1 - index) * stepMs),
    checks: index % 17 === 5 ? 0 : 15,
    uptime_pct: index % 17 === 5 ? null : index % 11 === 3 ? 86.7 : 100,
    avg_response_ms: index % 17 === 5 ? null : 140 + Math.round(60 * Math.sin(index / 4)) + (index % 23 === 7 ? 900 : 0),
  }))
}

export function summary(id: number) {
  return {
    monitor_id: id,
    last_check:
      id === 1
        ? { checked_at: iso(30_000), ok: false, status_code: null, response_time_ms: null, error_code: 'TIMEOUT' }
        : id === 3
          ? null
          : { checked_at: iso(60_000), ok: true, status_code: 200, response_time_ms: 120 + id, error_code: '' },
    uptime_24h: id === 1 ? 87.25 : id === 3 ? null : 99.93,
    checks_24h: id === 3 ? 0 : 1440,
    sparkline: id === 3 ? series(25, 3_600_000).map((p) => ({ ...p, checks: 0, uptime_pct: null, avg_response_ms: null })) : series(25, 3_600_000),
  }
}

export function stats(period = '24h') {
  const [points, step] = period === '24h' ? [97, 900_000] : period === '7d' ? [169, 3_600_000] : [121, 21_600_000]
  return {
    period,
    since: iso(points * step),
    until: iso(0),
    bucket_sec: step / 1000,
    checks_total: 1440,
    checks_failed: 12,
    uptime_pct: 99.17,
    avg_response_ms: 168.3,
    p95_response_ms: 412,
    incidents_count: 2,
    series: series(points, step),
  }
}

export const INCIDENTS = [
  { id: 2, monitor: { id: 1, name: LONG_NAME }, started_at: iso(420_000), resolved_at: null, duration_sec: null, is_open: true, cause_code: 'TIMEOUT', cause: 'Нет ответа за 5 с' },
  { id: 1, monitor: { id: 1, name: LONG_NAME }, started_at: iso(90_000_000), resolved_at: iso(89_000_000), duration_sec: 1000, is_open: false, cause_code: 'UNEXPECTED_STATUS', cause: 'Код ответа 503, ожидался 200–299' },
]

export const CHECKS = Array.from({ length: 20 }, (_, index) => {
  const ok = index % 4 !== 1
  return {
    id: 100 - index,
    checked_at: iso(index * 60_000),
    ok,
    status_code: ok ? 200 : index % 8 === 1 ? null : 503,
    response_time_ms: ok ? 130 + index : null,
    error_code: ok ? '' : index % 8 === 1 ? 'TOO_MANY_REDIRECTS' : 'UNEXPECTED_STATUS',
    error: ok ? '' : index % 8 === 1 ? 'Больше 5 редиректов подряд' : 'Код ответа 503, ожидался 200–299',
  }
})

export const STATUS_PAGES = [
  { id: 1, title: 'Статус Acme Corporation и всех её дочерних сервисов', slug: 'acme-corporation-status', monitor_ids: [1, 2], created_at: iso(0), updated_at: iso(0) },
  { id: 2, title: 'Внутренний', slug: 'internal', monitor_ids: [], created_at: iso(0), updated_at: iso(0) },
]

export const PUBLIC_PAGE = {
  title: 'Статус Acme Corporation',
  slug: 'acme',
  status: 'partial_outage',
  generated_at: iso(20_000),
  monitors: [
    { name: LONG_NAME, status: 'DOWN', uptime_24h: 87.25, uptime_30d: 98.61, last_checked_at: iso(30_000) },
    { name: 'Сайт', status: 'UP', uptime_24h: 100, uptime_30d: 99.98, last_checked_at: iso(30_000) },
    { name: 'API', status: 'PENDING', uptime_24h: null, uptime_30d: null, last_checked_at: null },
  ],
}

export type Responder = (route: Route) => Promise<void> | void

const json = (body: unknown, status = 200) => (route: Route) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'X-Request-ID': 'e2e-req-7f3a' } })
export const ok = (body: unknown) => json(body)
export const fail = (status = 500) => json({ error: { code: 'server_error', message: 'Внутренняя ошибка сервера' } }, status)
export const notFound = () => json({ error: { code: 'not_found', message: 'Не найдено' } }, 404)
/** Never answers: the screen stays in its loading state. */
export const hang: Responder = () => new Promise(() => {})

const page = (results: unknown[], count = results.length) => ({ count, next: count > results.length ? 'next' : null, previous: null, results })

export interface Scenario {
  signedIn?: boolean
  monitors?: Responder
  summary?: Responder
  monitor?: Responder
  stats?: Responder
  incidents?: Responder
  checks?: Responder
  statusPages?: Responder
  statusPage?: Responder
  publicPage?: Responder
}

export const defaults: Required<Omit<Scenario, 'signedIn'>> = {
  monitors: ok(page(MONITORS)),
  summary: ok({ results: MONITORS.map((m) => summary(m.id)) }),
  monitor: ok(MONITORS[0]),
  stats: (route) => json(stats(new URL(route.request().url()).searchParams.get('period') ?? '24h'))(route),
  incidents: ok(page(INCIDENTS, 14)),
  checks: ok(page(CHECKS, 1440)),
  statusPages: ok(page(STATUS_PAGES)),
  statusPage: ok(STATUS_PAGES[0]),
  publicPage: ok(PUBLIC_PAGE),
}

/** Route every /api call of the app to the scenario's responders. */
export async function mockApi(target: Page, scenario: Scenario = {}) {
  const s = { ...defaults, ...scenario }
  if (scenario.signedIn !== false) {
    await target.addInitScript(() => {
      window.localStorage.setItem('pulse:session', JSON.stringify({ access: 'e2e', refresh: 'e2e' }))
    })
  }
  await target.route('**/api/v1/**', (route) => {
    const { pathname } = new URL(route.request().url())
    const path = pathname.replace(/^\/api\/v1/, '')
    if (path === '/auth/me') return ok({ id: 1, email: 'owner-with-a-long-email@example-company.com', created_at: iso(0) })(route)
    if (path === '/monitors') return s.monitors(route)
    if (path === '/monitors/summary') return s.summary(route)
    if (/^\/monitors\/\d+$/.test(path)) return s.monitor(route)
    if (/^\/monitors\/\d+\/stats$/.test(path)) return s.stats(route)
    if (/^\/monitors\/\d+\/checks$/.test(path)) return s.checks(route)
    if (path === '/incidents') return s.incidents(route)
    if (path === '/status-pages') return s.statusPages(route)
    if (/^\/status-pages\/\d+$/.test(path)) return s.statusPage(route)
    if (path.startsWith('/public/status-pages/')) return s.publicPage(route)
    return route.fulfill({ status: 599, body: `unmocked ${path}` })
  })
}

export { page as paginated }
