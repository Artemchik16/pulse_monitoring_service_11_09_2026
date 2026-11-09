import { getRouteApi } from '@tanstack/react-router'

import { InlineAlert } from '@/shared/ui'

import { safeRedirect } from '../model/schemas'
import { AuthShell } from '../ui/AuthShell'
import { AuthSwitchLink } from '../ui/AuthSwitchLink'
import { LoginForm } from '../ui/LoginForm'

const route = getRouteApi('/login')

export function LoginPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <AuthShell
      title="Вход"
      subtitle="Мониторинг доступности ваших сайтов и API"
      footer={<AuthSwitchLink question="Нет аккаунта?" action="Зарегистрироваться" to="/register" />}
    >
      {search.reason === 'expired' ? (
        <InlineAlert tone="info">Сессия истекла. Войдите снова, чтобы продолжить.</InlineAlert>
      ) : null}
      <LoginForm onSuccess={() => void navigate({ to: safeRedirect(search.redirect), replace: true })} />
    </AuthShell>
  )
}
