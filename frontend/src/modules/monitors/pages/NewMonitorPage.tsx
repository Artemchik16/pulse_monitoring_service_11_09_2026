import { useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'

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
  // The form reports success without the mutation result: keep the new id for the redirect
  const createdId = useRef<number | null>(null)

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
          onSubmit={async (payload) => {
            createdId.current = (await createMonitor.mutateAsync(payload)).id
          }}
          onSuccess={() =>
            void navigate({ to: '/monitors/$monitorId', params: { monitorId: createdId.current! } })
          }
          onCancel={backToDashboard}
        />
      )}
    </MonitorFormLayout>
  )
}
