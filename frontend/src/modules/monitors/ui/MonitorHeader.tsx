import { Link } from '@tanstack/react-router'
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { formatDateTime } from '@/shared/lib/format'
import { Button, buttonVariants, InlineAlert, LiveIndicator } from '@/shared/ui'

import { useSetMonitorActive } from '../api/hooks'
import { intervalLabel } from '../model/form'
import type { Monitor } from '../model/types'
import { MonitorStatusBadge } from './MonitorStatusBadge'

interface MonitorHeaderProps {
  monitor: Monitor
  updatedAt: number
  fetching: boolean
  onDelete: () => void
}

export function MonitorHeader({ monitor, updatedAt, fetching, onDelete }: MonitorHeaderProps) {
  const setActive = useSetMonitorActive(monitor.id)

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-(--radius-control-sm) px-2 text-caption font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Мониторы
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-title font-bold break-words">{monitor.name}</h1>
            <MonitorStatusBadge status={monitor.status} />
            <LiveIndicator updatedAt={updatedAt} fetching={fetching} />
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noreferrer noopener"
            className="w-fit max-w-full truncate text-caption text-primary-ink hover:underline"
          >
            <span className="font-semibold">{monitor.method}</span> {monitor.url}
          </a>
          <p className="text-micro text-muted-foreground">
            {intervalLabel(monitor.interval_sec)} · таймаут {monitor.timeout_ms / 1000} с · ожидаемый код{' '}
            {monitor.expected_status_from}–{monitor.expected_status_to}
            {monitor.last_checked_at ? ` · последняя проверка ${formatDateTime(monitor.last_checked_at)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/monitors/$monitorId/edit"
            params={{ monitorId: monitor.id }}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil />
            Изменить
          </Link>
          <Button
            variant="outline"
            size="sm"
            icon={monitor.is_active ? <Pause /> : <Play />}
            loading={setActive.isPending}
            onClick={() => setActive.mutate(!monitor.is_active)}
          >
            {monitor.is_active ? 'Пауза' : 'Возобновить'}
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={onDelete} className="text-error-ink">
            Удалить
          </Button>
        </div>
      </div>

      {setActive.isError ? <InlineAlert tone="error">{toApiError(setActive.error).message}</InlineAlert> : null}
    </div>
  )
}
