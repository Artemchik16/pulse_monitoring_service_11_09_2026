import { getRouteApi, Link } from '@tanstack/react-router'
import { Activity, Plus, SearchX } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button, buttonVariants, EmptyState, ErrorState, InlineAlert } from '@/shared/ui'

import { useMonitors, useMonitorsSummary } from '../api/hooks'
import { MAX_MONITORS_PER_USER } from '../model/constants'
import { countByStatus, toDashboardMonitors } from '../model/dashboard'
import { STATUS_META } from '../model/status'
import { MonitorCard, MonitorCardSkeleton } from '../ui/MonitorCard'
import { StatusFilter } from '../ui/StatusFilter'

const route = getRouteApi('/app/')

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

/** The view's one CTA; at the quota it turns into a disabled button that says why. */
function AddMonitorButton({ atLimit }: { atLimit: boolean }) {
  if (atLimit) {
    return (
      <Button disabled icon={<Plus />} title={`Достигнут лимит: ${MAX_MONITORS_PER_USER} мониторов`}>
        Лимит {MAX_MONITORS_PER_USER} мониторов
      </Button>
    )
  }
  return (
    <Link to="/monitors/new" className={buttonVariants()}>
      <Plus />
      Добавить монитор
    </Link>
  )
}

export function DashboardPage() {
  const { status } = route.useSearch()
  const navigate = route.useNavigate()
  const monitors = useMonitors()
  const summary = useMonitorsSummary()

  const setStatus = (next: typeof status) =>
    void navigate({ search: (prev) => ({ ...prev, status: next }), replace: true })

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold">Мониторы</h1>
        {monitors.data ? (
          <p className="text-caption text-muted-foreground">
            {monitors.data.length} из {MAX_MONITORS_PER_USER}
          </p>
        ) : null}
      </div>
      {monitors.data?.length ? (
        <AddMonitorButton atLimit={monitors.data.length >= MAX_MONITORS_PER_USER} />
      ) : null}
    </div>
  )

  if (monitors.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className={GRID} role="status" aria-label="Загрузка мониторов">
          {Array.from({ length: 6 }, (_, index) => (
            <MonitorCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (monitors.isError) {
    const error = toApiError(monitors.error)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Не удалось загрузить мониторы"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void monitors.refetch()}
        />
      </div>
    )
  }

  if (!monitors.data.length) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={Activity}
          title="Мониторов пока нет"
          description="Добавьте сайт или API — Pulse будет проверять его по расписанию и сообщит, если он перестанет отвечать."
          action={<AddMonitorButton atLimit={false} />}
        />
      </div>
    )
  }

  const rows = toDashboardMonitors(monitors.data, summary.data)
  const visible = status ? rows.filter((monitor) => monitor.status === status) : rows

  return (
    <div className="flex flex-col gap-6">
      {header}

      <StatusFilter
        value={status}
        counts={countByStatus(monitors.data)}
        total={monitors.data.length}
        onChange={setStatus}
      />

      {summary.isError ? (
        <InlineAlert tone="warning">
          <span>Не удалось загрузить статистику за 24 часа. </span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => void summary.refetch()}
          >
            Повторить
          </button>
        </InlineAlert>
      ) : null}

      {visible.length ? (
        <ul className={GRID}>
          {visible.map((monitor) => (
            <li key={monitor.id}>
              <MonitorCard monitor={monitor} summaryLoading={summary.isPending} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={SearchX}
          title={`Нет мониторов со статусом «${STATUS_META[status!].label}»`}
          action={
            <Button variant="outline" onClick={() => setStatus(undefined)}>
              Показать все
            </Button>
          }
        />
      )}
    </div>
  )
}
