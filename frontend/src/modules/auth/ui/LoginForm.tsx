import { useForm } from '@tanstack/react-form'

import { submitWithServerErrors } from '@/shared/lib/form'
import { Button, FormField, Input, PasswordInput } from '@/shared/ui'

import { useLogin } from '../api/hooks'
import { type LoginValues, loginSchema } from '../model/schemas'
import { FormError } from './FormError'

interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useLogin()
  const form = useForm({
    defaultValues: { email: '', password: '' } satisfies LoginValues,
    validators: {
      onSubmit: loginSchema,
      onSubmitAsync: submitWithServerErrors(
        (values: LoginValues) =>
          login.mutateAsync({ email: values.email.trim(), password: values.password }),
        ['email', 'password'],
      ),
    },
    onSubmit: onSuccess,
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FormError error={error} />}
      </form.Subscribe>

      <form.Field name="email">
        {(field) => (
          <FormField label="Email" errors={field.state.meta.errors}>
            <Input
              name={field.name}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField label="Пароль" errors={field.state.meta.errors}>
            <PasswordInput
              name={field.name}
              autoComplete="current-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" size="lg" className="mt-1 w-full" loading={isSubmitting}>
            Войти
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
