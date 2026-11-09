import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { makeMonitor, makeStats, mockMonitorPage, signIn } from '@/test/fixtures'
import { server } from '@/test/server'

const monitor = makeMonitor({ id: 7, name: 'Оплата API', url: 'https://pay.example.com/health', status: 'DOWN' })

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<App history={history} />)
  return history
}

const resolved = {
  id: 1,
  monitor: { id: 7, name: 'Оплата API' },
  started_at: '2026-11-08T10:00:00Z',
  resolved_at: '2026-11-08T10:12:00Z',
  duration_sec: 720,
  is_open: false,
  cause_code: 'TIMEOUT',
  cause: 'Нет ответа за 5 с',
}
const open = { ...resolved, id: 2, resolved_at: null, duration_sec: null, is_open: true, started_at: new Date(Date.now() - 300_000).toISOString(), cause: 'Код ответа 503, ожидался 200–299' }

function check(id: number, ok: boolean) {
  return {
    id,
    checked_at: new Date(Date.now() - id * 60_000).toISOString(),
    ok,
    status_code: ok ? 200 : 503,
    response_time_ms: ok ? 120 : 45,
    error_code: ok ? '' : 'UNEXPECTED_STATUS',
    error: ok ? '' : 'Код ответа 503, ожидался 200–299',
  }
}

describe('MonitorDetailPage', () => {
  it('shows the monitor, period stats, incidents and recent checks', async () => {
    signIn()
    mockMonitorPage(monitor, { incidents: [open, resolved], checks: [check(1, false), check(2, true)] })
    renderAt('/monitors/7')

    expect(await screen.findByRole('heading', { name: 'Оплата API', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Не работает')).toBeInTheDocument()

    expect(await screen.findByText('99,51 %')).toBeInTheDocument()
    expect(screen.getByText('182 мс')).toBeInTheDocument()
    expect(screen.getByText('412 мс')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Интервалов со сбоями: 1 из 96' })).toBeInTheDocument()

    expect(await screen.findByText('Идёт сейчас')).toBeInTheDocument()
    expect(screen.getByText('уже 5 мин')).toBeInTheDocument()
    expect(screen.getByText('простой 12 мин')).toBeInTheDocument()
    expect(screen.getByText('Причина: Нет ответа за 5 с')).toBeInTheDocument()

    expect(await screen.findByText('Код 503')).toBeInTheDocument()
    expect(screen.getAllByText('Код ответа 503, ожидался 200–299').length).toBeGreaterThan(0)
    expect(screen.getByText('Успешно')).toBeInTheDocument()
  })

  it('switches the stats period through the URL', async () => {
    signIn()
    mockMonitorPage(monitor)
    const periods: string[] = []
    server.use(
      http.get('/api/v1/monitors/7/stats', ({ request }) => {
        const period = new URL(request.url).searchParams.get('period')!
        periods.push(period)
        return HttpResponse.json(makeStats({ period, uptime_pct: period === '7d' ? 97 : 99.514 }))
      }),
    )
    const history = renderAt('/monitors/7')

    await screen.findByText('99,51 %')
    await userEvent.setup().click(screen.getByRole('radio', { name: '7 дней' }))

    expect(await screen.findByText('97 %')).toBeInTheDocument()
    expect(history.location.search).toContain('period=7d')
    expect(periods).toEqual(['24h', '7d'])
  })

  it('paginates checks and keeps the page in the URL', async () => {
    signIn()
    mockMonitorPage(monitor)
    const pages: string[] = []
    server.use(
      http.get('/api/v1/monitors/7/checks', ({ request }) => {
        const pageNumber = new URL(request.url).searchParams.get('page')!
        pages.push(pageNumber)
        const results = pageNumber === '1' ? [check(1, true)] : [check(21, false)]
        return HttpResponse.json({ count: 45, next: null, previous: null, results })
      }),
    )
    const history = renderAt('/monitors/7')

    expect(await screen.findByRole('navigation', { name: 'Страницы' })).toHaveTextContent('Страница 1 из 3')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Вперёд' }))

    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Страницы' })).toHaveTextContent('Страница 2 из 3'))
    expect(await screen.findByText('Код 503')).toBeInTheDocument()
    expect(history.location.search).toContain('page=2')
    expect(pages).toEqual(['1', '2'])
  })

  it('loads more incidents on demand', async () => {
    signIn()
    mockMonitorPage(monitor)
    server.use(
      http.get('/api/v1/incidents', ({ request }) => {
        const pageNumber = new URL(request.url).searchParams.get('page')
        return pageNumber === '1'
          ? HttpResponse.json({ count: 2, next: 'next', previous: null, results: [open] })
          : HttpResponse.json({ count: 2, next: null, previous: 'prev', results: [resolved] })
      }),
    )
    renderAt('/monitors/7')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Показать ещё' }))

    expect(await screen.findByText('простой 12 мин')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
  })

  it('pauses and resumes the monitor', async () => {
    signIn()
    mockMonitorPage(monitor)
    let body: unknown
    server.use(
      http.patch('/api/v1/monitors/7', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...monitor, is_active: false, status: 'PAUSED' })
      }),
    )
    renderAt('/monitors/7')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Пауза' }))

    expect(await screen.findByRole('button', { name: 'Возобновить' })).toBeInTheDocument()
    expect(screen.getByText('На паузе')).toBeInTheDocument()
    expect(body).toEqual({ is_active: false })
  })

  it('deletes after confirmation and returns to the dashboard', async () => {
    signIn()
    mockMonitorPage(monitor)
    let deleted = false
    server.use(
      http.delete('/api/v1/monitors/7', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const history = renderAt('/monitors/7')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Удалить' }))
    const dialog = screen.getByRole('dialog', { name: 'Удалить монитор?' })
    expect(within(dialog).getByText(/будет удалён вместе с историей/)).toBeInTheDocument()
    expect(deleted).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(history.location.pathname).toBe('/'))
    expect(deleted).toBe(true)
  })

  it('shows "not found" for a missing monitor', async () => {
    signIn()
    server.use(http.get('/api/v1/monitors/404', () => HttpResponse.json({}, { status: 404 })))
    renderAt('/monitors/404')

    expect(await screen.findByText('Страница не найдена')).toBeInTheDocument()
  })

  it('is reachable from the dashboard card', async () => {
    signIn({ monitors: [monitor] })
    renderAt('/')

    expect(await screen.findByRole('link', { name: 'Оплата API' })).toHaveAttribute('href', '/monitors/7')
  })
})
