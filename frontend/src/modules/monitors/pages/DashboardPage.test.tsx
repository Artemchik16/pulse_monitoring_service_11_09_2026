import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { makeMonitor, makeSummary, signIn } from '@/test/fixtures'
import { server } from '@/test/server'

function renderDashboard(path = '/') {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<App history={history} />)
  return history
}

const up = makeMonitor({ id: 1, name: 'Сайт', status: 'UP' })
const down = makeMonitor({ id: 2, name: 'API', status: 'DOWN', url: 'https://api.example.com' })
const paused = makeMonitor({ id: 3, name: 'Блог', status: 'PAUSED', is_active: false })

describe('DashboardPage', () => {
  it('shows each monitor with status, last response, 24h uptime and a mini chart', async () => {
    signIn({
      monitors: [up, down],
      summaries: [
        makeSummary(1),
        makeSummary(2, {
          uptime_24h: 87.25,
          last_check: { checked_at: new Date().toISOString(), ok: false, status_code: 503, response_time_ms: 40, error_code: 'UNEXPECTED_STATUS' },
        }),
      ],
    })
    renderDashboard()

    const cards = await screen.findAllByRole('listitem')
    // Problems first
    expect(within(cards[0]).getByRole('heading', { name: 'API' })).toBeInTheDocument()
    expect(within(cards[0]).getByText('Не работает')).toBeInTheDocument()
    expect(within(cards[0]).getByText('Код 503')).toBeInTheDocument()
    expect(within(cards[0]).getByText('87,25 %')).toBeInTheDocument()

    expect(within(cards[1]).getByText('Работает')).toBeInTheDocument()
    expect(within(cards[1]).getByText('123 мс')).toBeInTheDocument()
    expect(within(cards[1]).getByText('99,5 %')).toBeInTheDocument()
    expect(within(cards[1]).getByText('2 минуты назад')).toBeInTheDocument()
    expect(within(cards[1]).getByRole('img', { name: /Время ответа «Сайт»/ })).toBeInTheDocument()
    expect(screen.getByText('2 из 20')).toBeInTheDocument()
  })

  it('filters by status through the URL', async () => {
    signIn({ monitors: [up, down, paused], summaries: [] })
    const history = renderDashboard()

    await userEvent.setup().click(await screen.findByRole('button', { name: /Не работает/ }))

    expect(history.location.search).toContain('status=DOWN')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'API' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Не работает/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a filtered link and offers to reset an empty filter', async () => {
    signIn({ monitors: [up], summaries: [] })
    renderDashboard('/?status=DOWN')

    expect(await screen.findByText('Нет мониторов со статусом «Не работает»')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Показать все' }))
    expect(await screen.findByRole('heading', { name: 'Сайт' })).toBeInTheDocument()
  })

  it('shows the empty state for a new account', async () => {
    signIn({ monitors: [], summaries: [] })
    renderDashboard()

    expect(await screen.findByText('Мониторов пока нет')).toBeInTheDocument()
  })

  it('shows a retryable error when monitors cannot be loaded', async () => {
    signIn()
    let attempts = 0
    server.use(
      http.get('/api/v1/monitors', () => {
        attempts += 1
        // Initial request + 2 automatic retries fail; the user's retry succeeds
        return attempts <= 3
          ? HttpResponse.json({ error: { code: 'server_error', message: 'Внутренняя ошибка сервера' } }, { status: 500, headers: { 'X-Request-ID': 'req-42' } })
          : HttpResponse.json({ count: 1, next: null, previous: null, results: [up] })
      }),
    )
    renderDashboard()

    expect(await screen.findByText('Не удалось загрузить мониторы', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByText('Код запроса: req-42')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByRole('heading', { name: 'Сайт' })).toBeInTheDocument()
  }, 15_000)

  it('still shows monitors when only the 24h summary fails', async () => {
    signIn({ monitors: [up] })
    server.use(http.get('/api/v1/monitors/summary', () => HttpResponse.json({}, { status: 500 })))
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Сайт' })).toBeInTheDocument()
    expect(await screen.findByText(/Не удалось загрузить статистику/, {}, { timeout: 8000 })).toBeInTheDocument()
  }, 15_000)
})
