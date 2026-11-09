import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

import { OVERALL_META } from '../model/overall'
import type { OverallStatus } from '../model/types'

const styles = {
  success: { box: 'bg-success-surface text-success-ink', Icon: CircleCheck },
  warning: { box: 'bg-warning-surface text-warning-ink', Icon: TriangleAlert },
  error: { box: 'bg-error-surface text-error-ink', Icon: CircleAlert },
  neutral: { box: 'bg-neutral-surface text-neutral-ink', Icon: CircleHelp },
}

/** "Все системы работают" / "Частичный сбой" — the first thing a visitor reads. */
export function OverallBanner({ status }: { status: OverallStatus }) {
  const meta = OVERALL_META[status]
  const { box, Icon } = styles[meta.tone]
  return (
    <div className={cn('flex items-center gap-3 rounded-(--radius-card) px-4 py-4 sm:px-5', box)} role="status">
      <Icon className="size-6 shrink-0" aria-hidden />
      <p className="text-h3 font-semibold">{meta.label}</p>
    </div>
  )
}
