import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'

import { apiClient } from './client'
import { ApiError } from './errors'
import { getTokens, sessionStore, setTokens } from './session'

const MONITORS = '/api/v1/monitors'
const REFRESH = '/api/v1/auth/refresh'

function bearer(request: Request): string | null {
  return request.headers.get('Authorization')
}

describe('apiClient auth', () => {
  it('sends the access token', async () => {
    setTokens({ access: 'a1', refresh: 'r1' })
    server.use(http.get(MONITORS, ({ request }) => HttpResponse.json({ auth: bearer(request) })))

    const { data } = await apiClient.get(MONITORS)

    expect(data.auth).toBe('Bearer a1')
  })

  it('refreshes once on 401 and retries every pending request with the new token', async () => {
    setTokens({ access: 'expired', refresh: 'r1' })
    let refreshCalls = 0
    server.use(
      http.get(MONITORS, ({ request }) =>
        bearer(request) === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ error: { code: 'token_not_valid', message: 'x' } }, { status: 401 }),
      ),
      http.post(REFRESH, async ({ request }) => {
        refreshCalls += 1
        expect(await request.json()).toEqual({ refresh: 'r1' })
        return HttpResponse.json({ access: 'fresh', refresh: 'r2' })
      }),
    )

    const results = await Promise.all([apiClient.get(MONITORS), apiClient.get(MONITORS), apiClient.get(MONITORS)])

    expect(results.map((r) => r.data.ok)).toEqual([true, true, true])
    expect(refreshCalls).toBe(1)
    expect(getTokens()).toEqual({ access: 'fresh', refresh: 'r2' })
    expect(JSON.parse(window.localStorage.getItem('pulse:session')!)).toEqual({ access: 'fresh', refresh: 'r2' })
  })

  it('reuses tokens already rotated by another tab instead of refreshing again', async () => {
    setTokens({ access: 'old', refresh: 'r1' })
    let refreshCalls = 0
    server.use(
      http.get(MONITORS, ({ request }) => {
        if (bearer(request) === 'Bearer old') {
          // Meanwhile another tab refreshed and stored a new pair
          setTokens({ access: 'from-other-tab', refresh: 'r2' })
          return HttpResponse.json({}, { status: 401 })
        }
        return HttpResponse.json({ auth: bearer(request) })
      }),
      http.post(REFRESH, () => {
        refreshCalls += 1
        return HttpResponse.json({ access: 'x', refresh: 'y' })
      }),
    )

    const { data } = await apiClient.get(MONITORS)

    expect(data.auth).toBe('Bearer from-other-tab')
    expect(refreshCalls).toBe(0)
  })

  it('ends the session as expired when the refresh token is rejected', async () => {
    setTokens({ access: 'expired', refresh: 'revoked' })
    server.use(
      http.get(MONITORS, () => HttpResponse.json({}, { status: 401 })),
      http.post(REFRESH, () =>
        HttpResponse.json({ error: { code: 'token_not_valid', message: 'x' } }, { status: 401 }),
      ),
    )

    const error = await apiClient.get(MONITORS).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isSessionExpired).toBe(true)
    expect(sessionStore.state).toEqual({ tokens: null, endedBy: 'expired' })
  })

  it('keeps the session when refresh fails because of the network', async () => {
    setTokens({ access: 'expired', refresh: 'r1' })
    server.use(
      http.get(MONITORS, () => HttpResponse.json({}, { status: 401 })),
      http.post(REFRESH, () => HttpResponse.error()),
    )

    const error = (await apiClient.get(MONITORS).catch((e: unknown) => e)) as ApiError

    expect(error.isNetwork).toBe(true)
    expect(getTokens()).toEqual({ access: 'expired', refresh: 'r1' })
  })

  it('does not try to refresh for login errors', async () => {
    let refreshCalls = 0
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'invalid_credentials', message: 'Неверный email или пароль' } },
          { status: 401, headers: { 'X-Request-ID': 'req-1' } },
        ),
      ),
      http.post(REFRESH, () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    const error = (await apiClient.post('/api/v1/auth/login', {}).catch((e: unknown) => e)) as ApiError

    expect(error.code).toBe('invalid_credentials')
    expect(error.message).toBe('Неверный email или пароль')
    expect(error.requestId).toBe('req-1')
    expect(refreshCalls).toBe(0)
  })
})
