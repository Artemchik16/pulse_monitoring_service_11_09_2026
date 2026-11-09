import { useForm } from '@tanstack/react-form'

import { submitWithServerErrors } from '@/shared/lib/form'
import { Button, FormField, Input, PasswordInput } from '@/shared/ui'

import { useRegister } from '../api/hooks'
import { type RegisterValues, registerSchema } from '../model/schemas'
import { FormError } from './FormError'

interface RegisterFormProps {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const register = useRegister()
  const form = useForm({
    defaultValues: { email: '', password: '', passwordConfirm: '' } satisfies RegisterValues,
    validators: {
      onSubmit: registerSchema,
      onSubmitAsync: submitWithServerErrors(
        (values: RegisterValues) =>
          register.mutateAsync({ email: values.email.trim(), password: values.password }),
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
          <FormField
            label="Пароль"
            hint="Не короче 8 символов, не только цифры и не похож на email"
            errors={field.state.meta.errors}
          >
            <PasswordInput
              name={field.name}
              autoComplete="new-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="passwordConfirm">
        {(field) => (
          <FormField label="Повторите пароль" errors={field.state.meta.errors}>
            <PasswordInput
              name={field.name}
              autoComplete="new-password"
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
            Создать аккаунт
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
