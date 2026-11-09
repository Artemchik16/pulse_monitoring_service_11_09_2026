import { z } from 'zod'

import type { HttpMethod, Monitor } from './types'

/** Mirrors the backend rules (TZ A2); the server stays the source of truth (SSRF, quota). */
export const LIMITS = {
  nameMax: 100,
  urlMax: 2048,
  intervalMinSec: 60,
  intervalMaxSec: 3600,
  timeoutMinSec: 1,
  timeoutMaxSec: 60,
  statusMin: 100,
  statusMax: 599,
} as const

export const HTTP_METHODS: readonly { value: HttpMethod; label: string }[] = [
  { value: 'GET', label: 'GET' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'POST', label: 'POST' },
]

export const INTERVAL_PRESETS_SEC = [60, 120, 300, 600, 900, 1800, 3600] as const

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** «Каждую минуту», «Каждые 5 минут», «Каждый час», «Каждые 90 секунд» */
export function intervalLabel(seconds: number): string {
  if (seconds === 60) return 'Каждую минуту'
  if (seconds === 3600) return 'Каждый час'
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return `Каждые ${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')}`
  }
  return `Каждые ${seconds} ${plural(seconds, 'секунду', 'секунды', 'секунд')}`
}

/** Preset options plus the monitor's own value if it was set to something custom via the API. */
export function intervalOptions(current: number) {
  const values: number[] = [...INTERVAL_PRESETS_SEC]
  if (!values.includes(current)) values.push(current)
  return values.sort((a, b) => a - b).map((seconds) => ({ value: String(seconds), label: intervalLabel(seconds) }))
}

const integer = (message: string) => z.number({ error: 'Введите число' }).int(message)

export const monitorFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название').max(LIMITS.nameMax, `Не длиннее ${LIMITS.nameMax} символов`),
    url: z
      .string()
      .trim()
      .min(1, 'Введите URL')
      .max(LIMITS.urlMax, `Не длиннее ${LIMITS.urlMax} символов`)
      .refine((value) => {
        try {
          const url = new URL(value)
          return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
        } catch {
          return false
        }
      }, 'Укажите корректный URL с протоколом http или https'),
    method: z.enum(['GET', 'HEAD', 'POST']),
    expected_status_from: integer('Целое число')
      .min(LIMITS.statusMin, `От ${LIMITS.statusMin} до ${LIMITS.statusMax}`)
      .max(LIMITS.statusMax, `От ${LIMITS.statusMin} до ${LIMITS.statusMax}`),
    expected_status_to: integer('Целое число')
      .min(LIMITS.statusMin, `От ${LIMITS.statusMin} до ${LIMITS.statusMax}`)
      .max(LIMITS.statusMax, `От ${LIMITS.statusMin} до ${LIMITS.statusMax}`),
    interval_sec: integer('Целое число')
      .min(LIMITS.intervalMinSec, 'Интервал от 1 минуты до 1 часа')
      .max(LIMITS.intervalMaxSec, 'Интервал от 1 минуты до 1 часа'),
    timeout_sec: z
      .number({ error: 'Введите число' })
      .min(LIMITS.timeoutMinSec, `От ${LIMITS.timeoutMinSec} до ${LIMITS.timeoutMaxSec} секунд`)
      .max(LIMITS.timeoutMaxSec, `От ${LIMITS.timeoutMinSec} до ${LIMITS.timeoutMaxSec} секунд`),
    body_contains: z.string().max(200, 'Не длиннее 200 символов'),
    expect_json: z.boolean(),
    is_active: z.boolean(),
    is_public: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.method === 'HEAD' && (values.body_contains.trim() || values.expect_json)) {
      ctx.addIssue({ code: 'custom', path: ['method'], message: 'HEAD-запрос без тела: проверку содержимого используйте с GET или POST' })
    }
    if (values.timeout_sec >= values.interval_sec) {
      ctx.addIssue({ code: 'custom', path: ['timeout_sec'], message: 'Таймаут должен быть меньше интервала проверки' })
    }
    if (values.expected_status_from > values.expected_status_to) {
      ctx.addIssue({
        code: 'custom',
        path: ['expected_status_to'],
        message: 'Верхняя граница кода ответа должна быть не меньше нижней',
      })
    }
  })

export type MonitorFormValues = z.input<typeof monitorFormSchema>

/** Body of POST/PUT /api/v1/monitors */
export interface MonitorPayload {
  name: string
  url: string
  method: HttpMethod
  expected_status_from: number
  expected_status_to: number
  interval_sec: number
  timeout_ms: number
  body_contains: string
  expect_json: boolean
  is_active: boolean
  is_public: boolean
}

export const MONITOR_FORM_FIELDS = [
  'name',
  'url',
  'method',
  'expected_status_from',
  'expected_status_to',
  'interval_sec',
  'timeout_sec',
  'body_contains',
  'expect_json',
  'is_active',
  'is_public',
] as const satisfies readonly (keyof MonitorFormValues)[]

/** The form edits the timeout in seconds; the API speaks milliseconds. */
export const MONITOR_FIELD_ALIASES = { timeout_ms: 'timeout_sec' } as const

export const DEFAULT_MONITOR_FORM: MonitorFormValues = {
  name: '',
  url: 'https://',
  method: 'GET',
  expected_status_from: 200,
  expected_status_to: 299,
  interval_sec: 300,
  timeout_sec: 10,
  body_contains: '',
  expect_json: false,
  is_active: true,
  is_public: false,
}

export function toFormValues(monitor: Monitor): MonitorFormValues {
  return {
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    expected_status_from: monitor.expected_status_from,
    expected_status_to: monitor.expected_status_to,
    interval_sec: monitor.interval_sec,
    timeout_sec: monitor.timeout_ms / 1000,
    body_contains: monitor.body_contains,
    expect_json: monitor.expect_json,
    is_active: monitor.is_active,
    is_public: monitor.is_public,
  }
}

export function toPayload(values: MonitorFormValues): MonitorPayload {
  return {
    name: values.name.trim(),
    url: values.url.trim(),
    method: values.method,
    expected_status_from: values.expected_status_from,
    expected_status_to: values.expected_status_to,
    interval_sec: values.interval_sec,
    timeout_ms: Math.round(values.timeout_sec * 1000),
    body_contains: values.body_contains,
    expect_json: values.expect_json,
    is_active: values.is_active,
    is_public: values.is_public,
  }
}
