import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'

import { toFormErrors } from './form'

describe('toFormErrors', () => {
  it('puts field messages next to known fields', () => {
    const error = new ApiError({
      status: 422,
      code: 'validation_error',
      message: 'Некорректные данные',
      fields: { email: ['Уже зарегистрирован', 'второе'] },
    })

    expect(toFormErrors(error, ['email', 'password'])).toEqual({
      form: undefined,
      fields: { email: 'Уже зарегистрирован' },
    })
  })

  it('shows unknown-field and non-field messages at form level', () => {
    const error = new ApiError({
      status: 422,
      code: 'validation_error',
      message: 'Некорректные данные',
      fields: { non_field_errors: ['Общая ошибка'] },
    })

    expect(toFormErrors(error, ['email'])).toEqual({ form: 'Общая ошибка', fields: {} })
  })

  it('uses the error message when there are no field errors', () => {
    const error = new ApiError({ status: 429, code: 'throttled', message: 'Слишком много попыток' })

    expect(toFormErrors(error, ['email']).form).toBe('Слишком много попыток')
  })
})
