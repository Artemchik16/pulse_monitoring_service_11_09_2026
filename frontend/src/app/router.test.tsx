import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { setTokens } from '@/shared/api'
import { signIn } from '@/test/fixtures'
import { server } from '@/test/server'

import { App } from './App'

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<App history={history} />)
  return history
}

describe('route guards', () => {
  it('sends a guest to the login page and remembers where they were going', async () => {
    const history = renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(history.location.pathname).toBe('/login')
    expect(history.location.search).toContain('redirect=%2F')
  })

  it('shows the app to a signed-in user', async () => {
    signIn()

    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Мониторы' })).toBeInTheDocument()
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
  })

  it('redirects to login with a notice when the session cannot be refreshed', async () => {
    setTokens({ access: 'expired', refresh: 'revoked' })
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({}, { status: 401 })),
      http.post('/api/v1/auth/refresh', () => HttpResponse.json({}, { status: 401 })),
    )

    renderAt('/')

    expect(await screen.findByText(/Сессия истекла/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('shows a retryable error instead of a white screen when the API is down', async () => {
    setTokens({ access: 'a1', refresh: 'r1' })
    server.use(http.get('/api/v1/auth/me', () => HttpResponse.error()))

    renderAt('/')

    expect(await screen.findByText('Что-то пошло не так', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('logs out back to the login page', async () => {
    signIn()
    server.use(http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })))
    renderAt('/')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Выйти' }))

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(screen.queryByText(/Сессия истекла/)).not.toBeInTheDocument()
  })

  it('keeps a signed-in user away from the login page', async () => {
    signIn()

    renderAt('/login')

    expect(await screen.findByRole('heading', { name: 'Мониторы' })).toBeInTheDocument()
  })
})
