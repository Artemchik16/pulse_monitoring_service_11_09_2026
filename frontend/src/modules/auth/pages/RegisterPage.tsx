import { useNavigate } from '@tanstack/react-router'

import { AuthShell } from '../ui/AuthShell'
import { AuthSwitchLink } from '../ui/AuthSwitchLink'
import { RegisterForm } from '../ui/RegisterForm'

export function RegisterPage() {
  const navigate = useNavigate()

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы следить за своими сайтами"
      footer={<AuthSwitchLink question="Уже есть аккаунт?" action="Войти" to="/login" />}
    >
      <RegisterForm onSuccess={() => void navigate({ to: '/', replace: true })} />
    </AuthShell>
  )
}
