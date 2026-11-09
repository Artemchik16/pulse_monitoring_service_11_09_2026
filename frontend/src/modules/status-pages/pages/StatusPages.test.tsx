import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { makeMonitor, signIn } from '@/test/fixtures'
import { server } from '@/test/server'

function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<App history={history} />)
  return history
}

const publicPage = {
  title: 'Статус Acme',
  slug: 'acme',
  status: 'partial_outage',
  generated_at: new Date().toISOString(),
  monitors: [
    { name: 'Сайт', status: 'UP', uptime_24h: 100, uptime_30d: 99.95, last_checked_at: new Date().toISOString() },
    { name: 'API', status: 'DOWN', uptime_24h: 87.5, uptime_30d: 98.1, last_checked_at: new Date().toISOString() },
  ],
}

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results })

describe('public status page', () => {
  it('opens without signing in and shows only names, statuses and uptime', async () => {
    server.use(http.get('/api/v1/public/status-pages/acme', () => HttpResponse.json(publicPage)))
    const history = renderAt('/status/acme')

    expect(await screen.findByRole('heading', { name: 'Статус Acme' })).toBeInTheDocument()
    expect(history.location.pathname).toBe('/status/acme')
    expect(screen.getByText('Частичный сбой')).toBeInTheDocument()
    expect(screen.getByText('Не работает')).toBeInTheDocument()
    expect(screen.getByText('87,5 %')).toBeInTheDocument()
    expect(screen.getByText('99,95 %')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/https?:\/\//)
    expect(screen.queryByRole('button', { name: 'Выйти' })).not.toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Статус Acme — статус'))
  })

  it('says "all systems operational" when everything is up', async () => {
    server.use(
      http.get('/api/v1/public/status-pages/acme', () =>
        HttpResponse.json({ ...publicPage, status: 'operational', monitors: [publicPage.monitors[0]] }),
      ),
    )
    renderAt('/status/acme')

    expect(await screen.findByText('Все системы работают')).toBeInTheDocument()
  })

  it('shows "not found" for an unknown address', async () => {
    server.use(
      http.get('/api/v1/public/status-pages/nope', () =>
        HttpResponse.json({ error: { code: 'not_found', message: 'Не найдено' } }, { status: 404 }),
      ),
    )
    renderAt('/status/nope')

    expect(await screen.findByText('Статус-страница не найдена')).toBeInTheDocument()
  })

  it('stays public for a signed-in user (no app shell, no guard)', async () => {
    signIn()
    server.use(http.get('/api/v1/public/status-pages/acme', () => HttpResponse.json(publicPage)))
    renderAt('/status/acme')

    expect(await screen.findByRole('heading', { name: 'Статус Acme' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Разделы' })).not.toBeInTheDocument()
  })
})

describe('managing status pages', () => {
  const site = makeMonitor({ id: 1, name: 'Сайт', is_public: true })
  const internal = makeMonitor({ id: 2, name: 'Внутренний', is_public: false })

  it('creates a page: slug suggested from the title, only public monitors selectable', async () => {
    signIn({ monitors: [site, internal] })
    let body: unknown
    server.use(
      http.get('/api/v1/status-pages', () => HttpResponse.json(page([]))),
      http.post('/api/v1/status-pages', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 1, ...(body as object), created_at: '', updated_at: '' }, { status: 201 })
      }),
    )
    const history = renderAt('/status-pages/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Название'), 'Статус Acme')
    expect(screen.getByLabelText('Адрес страницы')).toHaveValue('status-acme')

    expect(await screen.findByRole('checkbox', { name: /Внутренний/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /Сайт/ }))
    await user.click(screen.getByRole('button', { name: 'Создать страницу' }))

    await waitFor(() => expect(history.location.pathname).toBe('/status-pages'))
    expect(body).toEqual({ title: 'Статус Acme', slug: 'status-acme', monitor_ids: [1] })
  })

  it('stops suggesting once the address is edited and shows a taken slug at the field', async () => {
    signIn({ monitors: [site] })
    server.use(
      http.post('/api/v1/status-pages', () =>
        HttpResponse.json(
          { error: { code: 'validation_error', message: 'Некорректные данные', fields: { slug: ['Этот адрес уже занят, выберите другой'] } } },
          { status: 422 },
        ),
      ),
    )
    renderAt('/status-pages/new')
    const user = userEvent.setup()

    const slug = await screen.findByLabelText('Адрес страницы')
    await user.type(slug, 'my-page')
    await user.type(screen.getByLabelText('Название'), 'Другое название')
    expect(slug).toHaveValue('my-page')

    await user.click(screen.getByRole('button', { name: 'Создать страницу' }))
    expect(await screen.findByText('Этот адрес уже занят, выберите другой')).toBeInTheDocument()
    expect(slug).toHaveAttribute('aria-invalid', 'true')
  })

  it('lists pages with their public link and deletes after confirmation', async () => {
    signIn()
    let deleted = false
    let pages = [{ id: 4, title: 'Статус Acme', slug: 'acme', monitor_ids: [1, 2], created_at: '', updated_at: '' }]
    server.use(
      http.get('/api/v1/status-pages', () => HttpResponse.json(page(pages))),
      http.delete('/api/v1/status-pages/4', () => {
        deleted = true
        pages = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderAt('/status-pages')
    const user = userEvent.setup()

    expect(await screen.findByRole('link', { name: /\/status\/acme/ })).toHaveAttribute('href', '/status/acme')
    expect(screen.getByText('Мониторов: 2')).toBeInTheDocument()
    // Desktop and phone navs (one is display:none in a real browser; jsdom renders both)
    for (const link of screen.getAllByRole('link', { name: 'Статус-страницы' })) {
      expect(link).toHaveAttribute('aria-current', 'page')
    }

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText('Статус-страниц пока нет')).toBeInTheDocument()
    expect(deleted).toBe(true)
  })

  it('edits an existing page', async () => {
    signIn({ monitors: [site] })
    let body: unknown
    server.use(
      http.get('/api/v1/status-pages/4', () =>
        HttpResponse.json({ id: 4, title: 'Старое', slug: 'acme', monitor_ids: [1], created_at: '', updated_at: 'v1' }),
      ),
      http.put('/api/v1/status-pages/4', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 4, ...(body as object), created_at: '', updated_at: 'v2' })
      }),
      http.get('/api/v1/status-pages', () => HttpResponse.json(page([]))),
    )
    const history = renderAt('/status-pages/4/edit')
    const user = userEvent.setup()

    const title = await screen.findByLabelText('Название')
    expect(screen.getByLabelText('Адрес страницы')).toHaveValue('acme')
    expect(await screen.findByRole('checkbox', { name: /Сайт/ })).toBeChecked()
    await user.clear(title)
    await user.type(title, 'Новое')
    // Editing the title of an existing page never rewrites its public address
    expect(screen.getByLabelText('Адрес страницы')).toHaveValue('acme')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(history.location.pathname).toBe('/status-pages'))
    expect(body).toEqual({ title: 'Новое', slug: 'acme', monitor_ids: [1] })
  })
})
