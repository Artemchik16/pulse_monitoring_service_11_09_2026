export const PLAYGROUND_MODES = [
  'ok',
  'error',
  'slow',
  'hang',
  'flapping',
  'redirect-loop',
  'huge-body',
  'wrong-content',
] as const
export type PlaygroundMode = (typeof PLAYGROUND_MODES)[number]

export interface PlaygroundTarget {
  slug: string
  mode: PlaygroundMode
  /** Relative to the API origin */
  path: string
  updated_at: string
}

/** What the endpoint does and what the monitoring must do about it (TZ D1). */
export const MODE_META: Record<PlaygroundMode, { label: string; does: string; expect: string }> = {
  ok: { label: 'ok', does: '200 за 100 мс', expect: 'Работает, время ответа ~100 мс' },
  error: { label: 'error', does: 'Отвечает 500', expect: 'После 2 проверок подряд — «Не работает» и инцидент «Код 500»' },
  slow: { label: 'slow', does: '200 через 5–10 с', expect: 'Работает, но время ответа 5–10 с (при таймауте меньше — «Таймаут»)' },
  hang: { label: 'hang', does: 'Принимает соединение и молчит 75 с', expect: 'Проверка обрывается по таймауту, не зависает: «Таймаут»' },
  flapping: { label: 'flapping', does: '200 или 503, ~30% ошибок', expect: 'Одиночные сбои видны в истории, но инцидент не открывается на каждый' },
  'redirect-loop': { label: 'redirect-loop', does: 'Бесконечная цепочка редиректов', expect: 'Проверка останавливается на 5 редиректах: «Много редиректов»' },
  'huge-body': { label: 'huge-body', does: '50 МБ потоком', expect: 'Чтение обрывается на 1 МБ: «Слишком большой ответ»' },
  'wrong-content': { label: 'wrong-content', does: '200, но HTML-страница ошибки', expect: 'С проверкой «валидный JSON» — «Не JSON», хотя код 200' },
}
