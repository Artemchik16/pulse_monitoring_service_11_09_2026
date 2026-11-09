import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MonitorPayload } from '../model/form'
import { monitorKeys } from '../model/queryKeys'
import type { Monitor } from '../model/types'
import { monitorsApi } from './monitorsApi'

export const monitorsQueryOptions = () =>
  queryOptions({ queryKey: monitorKeys.list(), queryFn: monitorsApi.list })

export const monitorsSummaryQueryOptions = () =>
  queryOptions({ queryKey: monitorKeys.summary(), queryFn: monitorsApi.summary })

export function useMonitors() {
  return useQuery(monitorsQueryOptions())
}

export function useMonitorsSummary() {
  return useQuery(monitorsSummaryQueryOptions())
}

export const monitorQueryOptions = (id: number) =>
  queryOptions({ queryKey: monitorKeys.detail(id), queryFn: () => monitorsApi.get(id) })

export function useMonitor(id: number) {
  return useQuery(monitorQueryOptions(id))
}

/** After a write: the saved monitor is fresh, list and summary must be refetched. */
function useSyncSavedMonitor() {
  const queryClient = useQueryClient()
  return (monitor: Monitor) => {
    queryClient.setQueryData(monitorKeys.detail(monitor.id), monitor)
    void queryClient.invalidateQueries({ queryKey: monitorKeys.list() })
    void queryClient.invalidateQueries({ queryKey: monitorKeys.summary() })
  }
}

export function useCreateMonitor() {
  const sync = useSyncSavedMonitor()
  return useMutation({ mutationFn: (payload: MonitorPayload) => monitorsApi.create(payload), onSuccess: sync })
}

export function useUpdateMonitor(id: number) {
  const sync = useSyncSavedMonitor()
  return useMutation({ mutationFn: (payload: MonitorPayload) => monitorsApi.update(id, payload), onSuccess: sync })
}
