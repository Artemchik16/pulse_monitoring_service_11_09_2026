import type { MonitorStatus } from './types'

interface StatusMeta {
  label: string
  /** Badge wash + ink (DESIGN.md: Monitor status -> tone) */
  badgeClassName: string
  dotClassName: string
}

export const STATUS_META: Record<MonitorStatus, StatusMeta> = {
  UP: { label: 'Работает', badgeClassName: 'bg-success-surface text-success-ink', dotClassName: 'bg-success' },
  DOWN: { label: 'Не работает', badgeClassName: 'bg-error-surface text-error-ink', dotClassName: 'bg-destructive' },
  PENDING: { label: 'Ожидает проверки', badgeClassName: 'bg-info-surface text-info-ink', dotClassName: 'bg-info' },
  PAUSED: { label: 'На паузе', badgeClassName: 'bg-neutral-surface text-neutral-ink', dotClassName: 'bg-neutral' },
}

/** Problems first: what needs attention is at the top of the dashboard. */
export const STATUS_ORDER: Record<MonitorStatus, number> = { DOWN: 0, PENDING: 1, UP: 2, PAUSED: 3 }
