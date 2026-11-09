import { isAxiosError } from 'axios'

export type FieldErrors = Record<string, string[]>

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, unknown> }
}

/** Every failed API call is normalized to this shape (backend format: {"error": {...}}). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: FieldErrors
  readonly requestId: string | null

  constructor(params: {
    status: number
    code: string
    message: string
    fields?: FieldErrors
    requestId?: string | null
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.fields = params.fields ?? {}
    this.requestId = params.requestId ?? null
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isSessionExpired(): boolean {
    return this.code === SESSION_EXPIRED
  }

  get isNetwork(): boolean {
    return this.status === 0
  }
}

export const SESSION_EXPIRED = 'session_expired'

export function sessionExpiredError(): ApiError {
  return new ApiError({
    status: 401,
    code: SESSION_EXPIRED,
    message: 'Сессия истекла. Войдите снова.',
  })
}

/** Flatten nested DRF field errors ({"a": {"b": ["x"]}}) into {"a.b": ["x"]}. */
function flattenFields(source: Record<string, unknown>, prefix = ''): FieldErrors {
  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(source)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) result[name] = value.map(String)
    else if (value && typeof value === 'object')
      Object.assign(result, flattenFields(value as Record<string, unknown>, name))
    else if (value != null) result[name] = [String(value)]
  }
  return result
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({
        status: 0,
        code: 'network_error',
        message: 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.',
      })
    }
    const { status, data, headers } = error.response
    const body = (data ?? {}) as ErrorBody
    return new ApiError({
      status,
      code: body.error?.code ?? `http_${status}`,
      message: body.error?.message ?? 'Что-то пошло не так. Попробуйте ещё раз.',
      fields: body.error?.fields ? flattenFields(body.error.fields) : {},
      requestId: (headers?.['x-request-id'] as string | undefined) ?? null,
    })
  }
  return new ApiError({
    status: -1,
    code: 'unexpected',
    message: 'Непредвиденная ошибка. Обновите страницу.',
  })
}
