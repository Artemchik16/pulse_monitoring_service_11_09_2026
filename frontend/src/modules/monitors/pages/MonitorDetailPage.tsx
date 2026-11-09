import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'

import { MonitorIncidentsSection } from '@/modules/incidents'
import { MonitorStatsSection, type StatsPeriod } from '@/modules/stats'
import { toApiError } from '@/shared/api'
import { ConfirmDialog } from '@/shared/ui'

import { monitorQueryOptions, useDeleteMonitor } from '../api/hooks'
import { CheckHistory } from '../ui/CheckHistory'
import { MonitorHeader } from '../ui/MonitorHeader'

const route = getRouteApi('/app/monitors/$monitorId')

export function MonitorDetailPage() {
  const { monitorId } = route.useParams()
  const { period, page = 1 } = route.useSearch()
  const navigate = route.useNavigate()
  // Loaded by the route loader
  const { data: monitor, dataUpdatedAt, isFetching } = useSuspenseQuery(monitorQueryOptions(monitorId))
  const deleteMonitor = useDeleteMonitor(monitorId, () => navigate({ to: '/', search: {}, replace: true }))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const setPeriod = (next: StatsPeriod) =>
    void navigate({ search: (prev) => ({ ...prev, period: next }), replace: true })
  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next > 1 ? next : undefined }), replace: true })

  return (
    <div className="flex flex-col gap-6">
      <MonitorHeader
        monitor={monitor}
        updatedAt={dataUpdatedAt}
        fetching={isFetching}
        onDelete={() => setConfirmingDelete(true)}
      />

      <MonitorStatsSection monitorId={monitorId} period={period} onPeriodChange={setPeriod} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <MonitorIncidentsSection monitorId={monitorId} />
        <CheckHistory monitorId={monitorId} page={page} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Удалить монитор?"
        description={
          <>
            «{monitor.name}» будет удалён вместе с историей проверок и инцидентами. Это нельзя отменить.
          </>
        }
        confirmLabel="Удалить"
        loading={deleteMonitor.isPending}
        error={deleteMonitor.isError ? toApiError(deleteMonitor.error).message : null}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteMonitor.mutate()}
      />
    </div>
  )
}
