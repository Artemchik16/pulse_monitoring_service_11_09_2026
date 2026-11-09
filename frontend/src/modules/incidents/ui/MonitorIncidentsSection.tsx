import { ShieldCheck } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button, Card, EmptyState, ErrorState } from '@/shared/ui'

import { useMonitorIncidents } from '../api/hooks'
import { IncidentItem } from './IncidentItem'

export function MonitorIncidentsSection({ monitorId }: { monitorId: number }) {
  const incidents = useMonitorIncidents(monitorId)
  const items = incidents.data?.pages.flatMap((page) => page.results) ?? []
  const total = incidents.data?.pages[0]?.count ?? 0

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <h2 className="text-h3 font-semibold">
        Инциденты{total ? <span className="ml-2 text-caption font-normal text-muted-foreground">{total}</span> : null}
      </h2>

      {incidents.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Загрузка инцидентов" role="status">
          {[0, 1].map((index) => (
            <div key={index} className="h-16 rounded-(--radius-field) bg-skeleton motion-safe:animate-pulse" />
          ))}
        </div>
      ) : incidents.isError ? (
        <ErrorState
          title="Не удалось загрузить инциденты"
          message={toApiError(incidents.error).message}
          onRetry={() => void incidents.refetch()}
          className="min-h-32"
        />
      ) : items.length ? (
        <>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((incident) => (
              <IncidentItem key={incident.id} incident={incident} />
            ))}
          </ul>
          {incidents.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              loading={incidents.isFetchingNextPage}
              onClick={() => void incidents.fetchNextPage()}
            >
              Показать ещё
            </Button>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Инцидентов не было"
          description="Инцидент открывается после двух неудачных проверок подряд."
          className="min-h-32"
        />
      )}
    </Card>
  )
}
