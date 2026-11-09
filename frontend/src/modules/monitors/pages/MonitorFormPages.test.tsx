import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { makeMonitor, mockMonitorPage, signIn } from '@/test/fixtures'
import { server } from '@/test/server'

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<App history={history} />)
  return history
}

function validationError(fields: Record<string, string[]>) {
  return HttpResponse.json({ error: { code: 'validation_error', message: 'Некорректные данные', fields } }, { status: 422 })
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Название'), 'Основной сайт')
  const url = screen.getByLabelText('URL')
  await user.clear(url)
  await user.type(url, 'https://example.com/health')
}

describe('create monitor', () => {
  it('sends the form in API units and opens the new monitor', async () => {
    signIn()
    mockMonitorPage(makeMonitor({ id: 9 }))
    let body: unknown
    server.use(
      http.post('/api/v1/monitors', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(makeMonitor({ id: 9 }), { status: 201 })
      }),
    )
    const history = renderAt('/monitors/new')
    const user = userEvent.setup()

    await fillRequired(user)
    await user.click(screen.getByRole('radio', { name: 'POST' }))
    await user.selectOptions(screen.getByLabelText('Интервал проверки'), 'Каждую минуту')
    const timeout = screen.getByLabelText('Таймаут, секунд')
    await user.clear(timeout)
    await user.type(timeout, '5')
    await user.click(screen.getByRole('switch', { name: 'Публичный' }))
    await user.click(screen.getByRole('button', { name: 'Создать монитор' }))

    await waitFor(() => expect(history.location.pathname).toBe('/monitors/9'))
    expect(body).toEqual({
      name: 'Основной сайт',
      url: 'https://example.com/health',
      method: 'POST',
      expected_status_from: 200,
      expected_status_to: 299,
      interval_sec: 60,
      timeout_ms: 5000,
      is_active: true,
      is_public: true,
    })
  })

  it('validates on the client before calling the API', async () => {
    signIn()
    let calls = 0
    server.use(http.post('/api/v1/monitors', () => { calls += 1; return HttpResponse.json({}) }))
    renderAt('/monitors/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Название'), 'x')
    await user.selectOptions(screen.getByLabelText('Интервал проверки'), 'Каждую минуту')
    const timeout = screen.getByLabelText('Таймаут, секунд')
    await user.clear(timeout)
    await user.type(timeout, '60')
    await user.click(screen.getByRole('button', { name: 'Создать монитор' }))

    expect(await screen.findByText('Таймаут должен быть меньше интервала проверки')).toBeInTheDocument()
    expect(screen.getByText('Укажите корректный URL с протоколом http или https')).toBeInTheDocument()
    expect(screen.getByLabelText('Таймаут, секунд')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
  })

  it('shows backend validation errors next to their fields (incl. timeout_ms -> seconds field)', async () => {
    signIn()
    server.use(
      http.post('/api/v1/monitors', () =>
        validationError({
          url: ['Адрес internal.example ведёт во внутреннюю сеть (10.0.0.5)'],
          timeout_ms: ['Таймаут должен быть меньше интервала проверки'],
        }),
      ),
    )
    renderAt('/monitors/new')
    const user = userEvent.setup()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Создать монитор' }))

    expect(await screen.findByText(/ведёт во внутреннюю сеть/)).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Таймаут, секунд')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the quota error at form level', async () => {
    signIn()
    server.use(
      http.post('/api/v1/monitors', () =>
        HttpResponse.json(
          { error: { code: 'monitor_limit_reached', message: 'Можно создать не больше 20 мониторов' } },
          { status: 422 },
        ),
      ),
    )
    renderAt('/monitors/new')
    const user = userEvent.setup()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Создать монитор' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Можно создать не больше 20 мониторов')
  })

  it('explains the limit instead of showing the form', async () => {
    signIn({ monitors: Array.from({ length: 20 }, (_, i) => makeMonitor({ id: i + 1 })) })
    renderAt('/monitors/new')

    expect(await screen.findByText(/Достигнут лимит: 20 мониторов/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Создать монитор' })).not.toBeInTheDocument()
  })
})

describe('edit monitor', () => {
  const stored = makeMonitor({ id: 5, name: 'API', url: 'https://api.example.com', interval_sec: 600, timeout_ms: 7500, method: 'HEAD' })

  it('loads the monitor, saves with PUT and returns to the monitor page', async () => {
    signIn()
    mockMonitorPage(stored)
    let body: Record<string, unknown> | undefined
    server.use(
      http.put('/api/v1/monitors/5', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...stored, ...body })
      }),
    )
    const history = renderAt('/monitors/5/edit')
    const user = userEvent.setup()

    const name = await screen.findByLabelText('Название')
    expect(name).toHaveValue('API')
    expect(screen.getByLabelText('Таймаут, секунд')).toHaveValue(7.5)
    expect(screen.getByLabelText('Интервал проверки')).toHaveValue('600')
    expect(screen.getByRole('radio', { name: 'HEAD' })).toHaveAttribute('aria-checked', 'true')

    await user.clear(name)
    await user.type(name, 'API v2')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(history.location.pathname).toBe('/monitors/5'))
    expect(body).toMatchObject({ name: 'API v2', method: 'HEAD', interval_sec: 600, timeout_ms: 7500 })
  })

  it('shows "not found" for a missing or foreign monitor', async () => {
    signIn()
    server.use(
      http.get('/api/v1/monitors/404', () =>
        HttpResponse.json({ error: { code: 'not_found', message: 'Не найдено' } }, { status: 404 }),
      ),
    )
    renderAt('/monitors/404/edit')

    expect(await screen.findByText('Страница не найдена')).toBeInTheDocument()
  })

  it('treats a non-numeric id as not found', async () => {
    signIn()
    renderAt('/monitors/abc/edit')

    expect(await screen.findByText('Страница не найдена')).toBeInTheDocument()
  })
})

describe('dashboard entry points', () => {
  it('links to the create form and to editing each monitor', async () => {
    signIn({ monitors: [makeMonitor({ id: 3, name: 'Сайт' })] })
    renderAt('/')

    expect(await screen.findByRole('link', { name: /Добавить монитор/ })).toHaveAttribute('href', '/monitors/new')
    expect(screen.getByRole('link', { name: 'Изменить «Сайт»' })).toHaveAttribute('href', '/monitors/3/edit')
  })

  it('disables adding at the quota', async () => {
    signIn({ monitors: Array.from({ length: 20 }, (_, i) => makeMonitor({ id: i + 1, name: `m${i}` })) })
    renderAt('/')

    expect(await screen.findByRole('button', { name: /Лимит 20 мониторов/ })).toBeDisabled()
  })
})
