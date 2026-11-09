import { useNavigate } from '@tanstack/react-router'

import { InlineAlert } from '@/shared/ui'

import { useCreateMonitor, useMonitors } from '../api/hooks'
import { MAX_MONITORS_PER_USER } from '../model/constants'
import { DEFAULT_MONITOR_FORM } from '../model/form'
import { MonitorForm } from '../ui/MonitorForm'
import { MonitorFormLayout } from '../ui/MonitorFormLayout'

export function NewMonitorPage() {
  const navigate = useNavigate()
  const monitors = useMonitors()
  const createMonitor = useCreateMonitor()
  const atLimit = (monitors.data?.length ?? 0) >= MAX_MONITORS_PER_USER
  const backToDashboard = () => void navigate({ to: '/' })

  return (
    <MonitorFormLayout title="Новый монитор">
      {atLimit ? (
        <InlineAlert tone="warning">
          Достигнут лимит: {MAX_MONITORS_PER_USER} мониторов. Удалите ненужный, чтобы добавить новый.
        </InlineAlert>
      ) : (
        <MonitorForm
          initialValues={DEFAULT_MONITOR_FORM}
          submitLabel="Создать монитор"
          onSubmit={createMonitor.mutateAsync}
          onSuccess={backToDashboard}
          onCancel={backToDashboard}
        />
      )}
    </MonitorFormLayout>
  )
}
