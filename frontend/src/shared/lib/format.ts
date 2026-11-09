const LOCALE = 'ru-RU'

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const seconds = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const DASH = '—'

/** 87 мс, 1,2 с */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return DASH
  return ms < 1000 ? `${integer.format(ms)} мс` : `${seconds.format(ms / 1000)} с`
}

/** 99,93 % */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return DASH
  return `${percent.format(value)} %`
}

/** «только что», «5 минут назад», «вчера» */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return DASH
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 45) return 'только что'
  if (abs < 3600) return relative.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(diffSec / 3600), 'hour')
  return relative.format(Math.round(diffSec / 86_400), 'day')
}

/** 9 нояб. 2026, 14:05 — for tooltips and titles */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return DASH
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
