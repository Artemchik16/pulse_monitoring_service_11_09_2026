import { ListChecks } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib/cn'
import { formatDateTime, formatMs } from '@/shared/lib/format'
import { Card, EmptyState, ErrorState, Pagination } from '@/shared/ui'

import { useMonitorChecks } from '../api/hooks'
import { CHECKS_PAGE_SIZE } from '../api/monitorsApi'
import { failureLabel } from '../model/checkErrors'
import type { CheckResult } from '../model/types'

const ROW = 'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[11rem_1fr_4.5rem_5.5rem]'

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li className={cn(ROW, 'py-2.5')}>
      <span className="text-caption text-muted-foreground tabular-nums">{formatDateTime(check.checked_at)}</span>
      <span className="flex min-w-0 items-center gap-2 justify-self-end md:justify-self-start">
        <span className={cn('size-2 shrink-0 rounded-full', check.ok ? 'bg-success' : 'bg-destructive')} aria-hidden />
        <span className={cn('truncate text-caption font-medium', check.ok ? 'text-foreground' : 'text-error-ink')} title={check.error || undefined}>
          {check.ok ? 'Успешно' : failureLabel(check)}
        </span>
      </span>
      <span className="text-caption text-muted-foreground tabular-nums md:text-right">
        <span className="md:hidden">Код </span>
        {check.status_code ?? '—'}
      </span>
      <span className="justify-self-end text-caption font-semibold tabular-nums">{formatMs(check.response_time_ms)}</span>
      {!check.ok && check.error ? (
        <span className="col-span-full text-micro text-muted-foreground">{check.error}</span>
      ) : null}
    </li>
  )
}

interface CheckHistoryProps {
  monitorId: number
  page: number
  onPageChange: (page: number) => void
}

export function CheckHistory({ monitorId, page, onPageChange }: CheckHistoryProps) {
  const checks = useMonitorChecks(monitorId, page)
  const pageCount = checks.data ? Math.max(1, Math.ceil(checks.data.count / CHECKS_PAGE_SIZE)) : 1

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <h2 className="text-h3 font-semibold">Последние проверки</h2>

      {checks.isPending ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Загрузка проверок">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-9 rounded-md bg-skeleton motion-safe:animate-pulse" />
          ))}
        </div>
      ) : checks.isError ? (
        <ErrorState
          title="Не удалось загрузить проверки"
          message={toApiError(checks.error).message}
          onRetry={() => void checks.refetch()}
          className="min-h-32"
        />
      ) : checks.data.results.length ? (
        <>
          <div className={cn(ROW, 'hidden border-b border-border pb-2 text-micro font-medium text-muted-foreground md:grid')} aria-hidden>
            <span>Время</span>
            <span>Результат</span>
            <span className="text-right">Код</span>
            <span className="text-right">Ответ</span>
          </div>
          <ul className={cn('flex flex-col divide-y divide-border transition-opacity', checks.isPlaceholderData && 'opacity-60')}>
            {checks.data.results.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
          <Pagination page={page} pageCount={pageCount} onChange={onPageChange} disabled={checks.isPlaceholderData} />
        </>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Проверок ещё не было"
          description="Первая проверка пройдёт в течение интервала монитора."
          className="min-h-32"
        />
      )}
    </Card>
  )
}
