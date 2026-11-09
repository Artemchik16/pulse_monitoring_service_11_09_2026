import { cn } from '@/shared/lib/cn'
import { formatDateTime, formatPercent } from '@/shared/lib/format'

import type { StatsPoint } from '../model/types'
import { uptimeToneClass } from '../model/uptime'

/** One bar per bucket coloured by uptime; hover shows the exact value. */
export function UptimeStrip({ points }: { points: StatsPoint[] }) {
  const failed = points.filter((point) => point.uptime_pct != null && point.uptime_pct < 100).length
  return (
    <div
      className="flex h-6 items-stretch gap-px"
      role="img"
      aria-label={failed ? `Интервалов со сбоями: ${failed} из ${points.length}` : 'Сбоев за период не было'}
    >
      {points.map((point) => (
        <span
          key={point.ts}
          className={cn('min-w-px flex-1 rounded-[2px]', uptimeToneClass(point.uptime_pct))}
          title={`${formatDateTime(point.ts)} — ${point.checks ? `uptime ${formatPercent(point.uptime_pct)}` : 'нет проверок'}`}
        />
      ))}
    </div>
  )
}
