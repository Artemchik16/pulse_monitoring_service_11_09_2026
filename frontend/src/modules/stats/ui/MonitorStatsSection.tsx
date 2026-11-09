import { lazy, Suspense } from 'react'

import { toApiError } from '@/shared/api'
import { formatMs, formatPercent } from '@/shared/lib/format'
import { Button, Card, ErrorBoundary, ErrorState, SegmentedControl } from '@/shared/ui'

import { useMonitorStats } from '../api/hooks'
import { PERIOD_OPTIONS, type StatsPeriod } from '../model/types'
import { StatTile } from './StatTile'
import { UptimeStrip } from './UptimeStrip'

// recharts is the heaviest dependency: load it only on the monitor page
const ResponseTimeChart = lazy(() => import('./ResponseTimeChart'))

interface MonitorStatsSectionProps {
  monitorId: number
  period: StatsPeriod
  onPeriodChange: (period: StatsPeriod) => void
}

function uptimeTone(uptime: number | null) {
  if (uptime == null) return undefined
  if (uptime >= 99.9) return 'success' as const
  if (uptime >= 95) return 'warning' as const
  return 'error' as const
}

const chartSkeleton = <div className="h-full rounded-(--radius-field) bg-skeleton motion-safe:animate-pulse" />

// The chart chunk failed to load (network, or an old chunk after a new deploy). React.lazy keeps
// the failed import, so only a reload can fetch it again; the numbers above stay usable.
const chartFailed = (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-(--radius-field) bg-surface-sunken px-4 text-center" role="alert">
    <p className="text-caption text-muted-foreground">Не удалось показать график.</p>
    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
      Обновить страницу
    </Button>
  </div>
)

export function MonitorStatsSection({ monitorId, period, onPeriodChange }: MonitorStatsSectionProps) {
  const stats = useMonitorStats(monitorId, period)
  const data = stats.data

  return (
    <Card className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-h3 font-semibold">Время ответа и доступность</h2>
        <SegmentedControl<StatsPeriod>
          label="Период"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={onPeriodChange}
          className="sm:w-80"
        />
      </div>

      {stats.isError && !data ? (
        <ErrorState
          title="Не удалось загрузить статистику"
          message={toApiError(stats.error).message}
          requestId={toApiError(stats.error).requestId}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <div className={stats.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={stats.isFetching}>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {data ? (
              <>
                <StatTile label="Uptime" value={formatPercent(data.uptime_pct)} tone={uptimeTone(data.uptime_pct)} />
                <StatTile label="Средний ответ" value={formatMs(data.avg_response_ms)} />
                <StatTile label="p95 ответа" value={formatMs(data.p95_response_ms)} />
                <StatTile
                  label="Инциденты"
                  value={String(data.incidents_count)}
                  tone={data.incidents_count ? 'error' : undefined}
                  hint={`Проверок: ${data.checks_total}, неудачных: ${data.checks_failed}`}
                />
              </>
            ) : (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-18 rounded-(--radius-field) bg-skeleton motion-safe:animate-pulse" />
              ))
            )}
          </dl>

          <div className="mt-5 h-56 sm:h-72">
            {data ? (
              data.checks_total ? (
                <ErrorBoundary fallback={() => chartFailed}>
                  <Suspense fallback={chartSkeleton}>
                    <ResponseTimeChart points={data.series} withDate={period !== '24h'} />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <div className="flex h-full items-center justify-center rounded-(--radius-field) bg-surface-sunken text-caption text-muted-foreground">
                  За этот период проверок ещё не было
                </div>
              )
            ) : (
              chartSkeleton
            )}
          </div>

          {data?.checks_total ? (
            <div className="mt-4 flex flex-col gap-1.5">
              <p className="text-micro text-muted-foreground">Доступность по интервалам</p>
              <UptimeStrip points={data.series} />
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}
