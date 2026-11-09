import type { LastCheck } from './types'

const SHORT_LABELS: Record<string, string> = {
  TIMEOUT: 'Таймаут',
  DNS_ERROR: 'Ошибка DNS',
  CONNECTION_ERROR: 'Нет соединения',
  SSL_ERROR: 'Ошибка SSL',
  TOO_MANY_REDIRECTS: 'Много редиректов',
  BODY_TOO_LARGE: 'Слишком большой ответ',
  INVALID_URL: 'Некорректный URL',
  BLOCKED_ADDRESS: 'Запрещённый адрес',
}

/** Short reason of a failed check for compact places (cards, table cells). */
export function failureLabel(check: LastCheck): string {
  if (check.error_code === 'UNEXPECTED_STATUS' && check.status_code) return `Код ${check.status_code}`
  return SHORT_LABELS[check.error_code] ?? 'Ошибка'
}
