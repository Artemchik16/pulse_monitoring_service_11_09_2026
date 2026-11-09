import { cn } from '@/shared/lib/cn'

import { STATUS_META } from '../model/status'
import type { MonitorStatus } from '../model/types'

/** Status as colour + text (never colour alone). */
export function MonitorStatusBadge({ status, className }: { status: MonitorStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2 py-0.5 text-micro font-semibold whitespace-nowrap',
        meta.badgeClassName,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} aria-hidden />
      {meta.label}
    </span>
  )
}
