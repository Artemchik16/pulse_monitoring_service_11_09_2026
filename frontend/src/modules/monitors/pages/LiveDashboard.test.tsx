import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { makeMonitor, signIn } from '@/test/fixtures'
import { server } from '@/test/server'

vi.mock('@/shared/config/live', () => ({ LIVE_REFRESH_MS: 200 }))

describe('live dashboard (D3)', () => {
  it('picks up a status change without a reload', async () => {
    signIn()
    let status = 'UP'
    server.use(
      http.get('/api/v1/monitors', () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [makeMonitor({ id: 1, name: 'API', status })] }),
      ),
    )
    render(<App history={createMemoryHistory({ initialEntries: ['/'] })} />)

    expect(await screen.findByText('Работает', { selector: 'li *' })).toBeInTheDocument()
    expect(screen.getByText(/Обновлено/)).toBeInTheDocument()

    status = 'DOWN' // the playground switched, the backend now reports DOWN
    expect(await screen.findByText('Не работает', { selector: 'li *' }, { timeout: 3000 })).toBeInTheDocument()
  })
})
