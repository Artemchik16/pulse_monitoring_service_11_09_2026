import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { buttonVariants, Card } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { formatDateTime, formatMs, formatPercent, formatRelative } from '@/shared/lib/format'

import { failureLabel } from '../model/checkErrors'
import type { DashboardMonitor } from '../model/types'
import { MonitorStatusBadge } from './MonitorStatusBadge'
import { Sparkline } from './Sparkline'

interface MonitorCardProps {
  monitor: DashboardMonitor
  summaryLoading: boolean
}

function Metric({ label, value, tone, title }: { label: string; value: string; tone?: 'error'; title?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-micro text-muted-foreground">{label}</dt>
      <dd
        className={cn('truncate text-caption font-semibold tabular-nums', tone === 'error' ? 'text-error-ink' : 'text-foreground')}
        title={title}
      >
        {value}
      </dd>
    </div>
  )
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-micro text-muted-foreground">{label}</dt>
      <dd className="h-5 w-14 rounded-md bg-skeleton motion-safe:animate-pulse" aria-hidden />
    </div>
  )
}

export function MonitorCard({ monitor, summaryLoading }: MonitorCardProps) {
  const { summary } = monitor
  const last = summary?.last_check ?? null
  const failed = last != null && !last.ok

  return (
    <Card
      className={cn(
        'relative flex flex-col gap-4 p-4 transition-colors has-[a[data-card-link]:hover]:border-border-strong',
        monitor.status === 'PAUSED' && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate text-body font-semibold text-foreground" title={monitor.name}>
            {/* Stretched link: the whole card opens the monitor page */}
            <Link
              to="/monitors/$monitorId"
              params={{ monitorId: monitor.id }}
              data-card-link
              className="rounded-(--radius-card) after:absolute after:inset-0 after:content-['']"
            >
              {monitor.name}
            </Link>
          </h2>
          <p className="truncate text-micro text-muted-foreground" title={monitor.url}>
            <span className="font-semibold">{monitor.method}</span> {monitor.url}
          </p>
        </div>
        <div className="relative -mt-1.5 -mr-1.5 flex shrink-0 items-center gap-1">
          <MonitorStatusBadge status={monitor.status} />
          <Link
            to="/monitors/$monitorId/edit"
            params={{ monitorId: monitor.id }}
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            aria-label={`Изменить «${monitor.name}»`}
          >
            <Pencil />
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {summaryLoading ? (
          <>
            <MetricSkeleton label="Ответ" />
            <MetricSkeleton label="Uptime 24 ч" />
            <MetricSkeleton label="Проверка" />
          </>
        ) : (
          <>
            <Metric
              label="Ответ"
              value={failed ? failureLabel(last) : formatMs(last?.response_time_ms)}
              tone={failed ? 'error' : undefined}
            />
            <Metric label="Uptime 24 ч" value={formatPercent(summary?.uptime_24h)} />
            <Metric
              label="Проверка"
              value={formatRelative(last?.checked_at ?? monitor.last_checked_at)}
              title={formatDateTime(last?.checked_at ?? monitor.last_checked_at)}
            />
          </>
        )}
      </dl>

      {summaryLoading ? (
        <div className="h-8 rounded-md bg-skeleton motion-safe:animate-pulse" aria-hidden />
      ) : (
        <Sparkline
          points={summary?.sparkline ?? []}
          label={`Время ответа «${monitor.name}» за 24 часа`}
        />
      )}
    </Card>
  )
}

export function MonitorCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-4" aria-hidden>
      <div className="flex justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-36 rounded-md bg-skeleton motion-safe:animate-pulse" />
          <div className="h-3.5 w-48 rounded-md bg-skeleton motion-safe:animate-pulse" />
        </div>
        <div className="h-5 w-20 rounded-(--radius-pill) bg-skeleton motion-safe:animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-9 rounded-md bg-skeleton motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="h-8 rounded-md bg-skeleton motion-safe:animate-pulse" />
    </Card>
  )
}
