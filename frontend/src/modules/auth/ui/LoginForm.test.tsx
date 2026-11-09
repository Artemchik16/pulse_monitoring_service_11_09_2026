import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { getTokens } from '@/shared/api'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'

import { LoginForm } from './LoginForm'

const LOGIN = '/api/v1/auth/login'

async function fill(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Пароль'), password)
  await user.click(screen.getByRole('button', { name: 'Войти' }))
  return user
}

describe('LoginForm', () => {
  it('validates on the client without calling the API', async () => {
    const onSuccess = vi.fn()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await fill('not-an-email', '')

    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument()
    expect(screen.getByText('Введите пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows wrong credentials as a form error', async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(
          { error: { code: 'invalid_credentials', message: 'Неверный email или пароль' } },
          { status: 401 },
        ),
      ),
    )
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />)

    await fill('user@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль')
  })

  it('shows server field errors next to the field and clears them on edit', async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(
          { error: { code: 'validation_error', message: 'Некорректные данные', fields: { email: ['Слишком длинный email'] } } },
          { status: 422 },
        ),
      ),
    )
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />)

    const user = await fill('user@example.com', 'secret')
    expect(await screen.findByText('Слишком длинный email')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'x')
    await waitFor(() => expect(screen.queryByText('Слишком длинный email')).not.toBeInTheDocument())
  })

  it('stores the session and reports success', async () => {
    server.use(
      http.post(LOGIN, async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'user@example.com', password: 'secret' })
        return HttpResponse.json({
          user: { id: 1, email: 'user@example.com', created_at: '2026-11-09T00:00:00Z' },
          tokens: { access: 'a1', refresh: 'r1' },
        })
      }),
    )
    const onSuccess = vi.fn()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await fill('  user@example.com ', 'secret')

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(getTokens()).toEqual({ access: 'a1', refresh: 'r1' })
  })
})
