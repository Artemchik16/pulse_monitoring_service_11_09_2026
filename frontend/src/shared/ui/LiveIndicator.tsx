import { useEffect, useState } from 'react'

import { cn } from '@/shared/lib/cn'
import { formatDateTime } from '@/shared/lib/format'

interface LiveIndicatorProps {
  /** dataUpdatedAt of the screen's main query */
  updatedAt: number
  fetching: boolean
  className?: string
}

function ago(updatedAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (seconds < 5) return 'только что'
  if (seconds < 60) return `${seconds} с назад`
  return `${Math.floor(seconds / 60)} мин назад`
}

/** "Live · обновлено 10 с назад": the screen refreshes itself. */
export function LiveIndicator({ updatedAt, fetching, className }: LiveIndicatorProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // Re-render the label only; data polling is TanStack Query's job
    const timer = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!updatedAt) return null
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-micro text-muted-foreground', className)}
      title={`Обновлено ${formatDateTime(new Date(updatedAt).toISOString())}`}
    >
      <span className={cn('size-1.5 rounded-full bg-success', fetching && 'motion-safe:animate-ping')} aria-hidden />
      Обновлено {ago(updatedAt, Math.max(now, updatedAt))}
    </span>
  )
}
