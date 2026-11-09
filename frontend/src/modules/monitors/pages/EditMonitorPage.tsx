import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'

import { monitorQueryOptions, useUpdateMonitor } from '../api/hooks'
import { toFormValues } from '../model/form'
import { MonitorForm } from '../ui/MonitorForm'
import { MonitorFormLayout } from '../ui/MonitorFormLayout'

const route = getRouteApi('/app/monitors/$monitorId/edit')

export function EditMonitorPage() {
  const { monitorId } = route.useParams()
  const navigate = useNavigate()
  // Loaded by the route loader: no empty form flashes before the data arrives
  const { data: monitor } = useSuspenseQuery(monitorQueryOptions(monitorId))
  const updateMonitor = useUpdateMonitor(monitorId)
  const backToMonitor = () => void navigate({ to: '/monitors/$monitorId', params: { monitorId } })

  return (
    <MonitorFormLayout title="Изменить монитор">
      <MonitorForm
        // Remount with fresh values if another tab saved the monitor meanwhile
        key={monitor.updated_at}
        initialValues={toFormValues(monitor)}
        submitLabel="Сохранить"
        onSubmit={updateMonitor.mutateAsync}
        onSuccess={backToMonitor}
        onCancel={backToMonitor}
      />
    </MonitorFormLayout>
  )
}
