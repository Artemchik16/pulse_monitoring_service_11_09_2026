import type { OverallStatus } from './types'

export const OVERALL_META: Record<OverallStatus, { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' }> = {
  operational: { label: 'Все системы работают', tone: 'success' },
  partial_outage: { label: 'Частичный сбой', tone: 'warning' },
  major_outage: { label: 'Серьёзный сбой', tone: 'error' },
  unknown: { label: 'Нет данных о состоянии', tone: 'neutral' },
}
