import { http, HttpResponse } from 'msw'

import { setTokens } from '@/shared/api'

import { server } from './server'

export const ME = { id: 1, email: 'owner@example.com', created_at: '2026-11-09T00:00:00Z' }

export function makeMonitor(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Example',
    url: 'https://example.com',
    method: 'GET',
    expected_status_from: 200,
    expected_status_to: 299,
    interval_sec: 60,
    timeout_ms: 5000,
    body_contains: '',
    expect_json: false,
    is_active: true,
    is_public: false,
    status: 'UP',
    consecutive_failures: 0,
    last_checked_at: new Date(Date.now() - 120_000).toISOString(),
    next_check_at: null,
    created_at: '2026-11-09T00:00:00Z',
    updated_at: '2026-11-09T00:00:00Z',
    ...overrides,
  }
}

export function makeSummary(monitorId: number, overrides: Record<string, unknown> = {}) {
  const now = Date.now()
  return {
    monitor_id: monitorId,
    last_check: {
      checked_at: new Date(now - 120_000).toISOString(),
      ok: true,
      status_code: 200,
      response_time_ms: 123,
      error_code: '',
    },
    uptime_24h: 99.5,
    checks_24h: 1440,
    sparkline: Array.from({ length: 24 }, (_, index) => ({
      ts: new Date(now - (23 - index) * 3_600_000).toISOString(),
      checks: 60,
      uptime_pct: index === 20 ? 90 : 100,
      avg_response_ms: 100 + index,
    })),
    ...overrides,
  }
}

/** A signed-in user with the given monitors and summaries. */
export function signIn({
  monitors = [] as unknown[],
  summaries = [] as unknown[],
} = {}) {
  setTokens({ access: 'a1', refresh: 'r1' })
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json(ME)),
    http.get('/api/v1/monitors', () =>
      HttpResponse.json({ count: monitors.length, next: null, previous: null, results: monitors }),
    ),
    http.get('/api/v1/monitors/summary', () => HttpResponse.json({ results: summaries })),
  )
}

export function makeStats(overrides: Record<string, unknown> = {}) {
  const now = Date.now()
  return {
    period: '24h',
    since: new Date(now - 86_400_000).toISOString(),
    until: new Date(now).toISOString(),
    bucket_sec: 900,
    checks_total: 1440,
    checks_failed: 7,
    uptime_pct: 99.514,
    avg_response_ms: 182.4,
    p95_response_ms: 412,
    incidents_count: 1,
    series: Array.from({ length: 96 }, (_, index) => ({
      ts: new Date(now - (95 - index) * 900_000).toISOString(),
      checks: 15,
      uptime_pct: index === 50 ? 80 : 100,
      avg_response_ms: 150 + (index % 10),
    })),
    ...overrides,
  }
}

const page = <T,>(results: T[], count = results.length, next: string | null = null) => ({
  count,
  next,
  previous: null,
  results,
})

/** Everything the monitor page loads, with empty history unless overridden. */
export function mockMonitorPage(
  monitor: ReturnType<typeof makeMonitor>,
  { stats = makeStats(), incidents = [] as unknown[], checks = [] as unknown[] } = {},
) {
  server.use(
    http.get(`/api/v1/monitors/${monitor.id}`, () => HttpResponse.json(monitor)),
    http.get(`/api/v1/monitors/${monitor.id}/stats`, () => HttpResponse.json(stats)),
    http.get('/api/v1/incidents', () => HttpResponse.json(page(incidents))),
    http.get(`/api/v1/monitors/${monitor.id}/checks`, () => HttpResponse.json(page(checks))),
  )
}
