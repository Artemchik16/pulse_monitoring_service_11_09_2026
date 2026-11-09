import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

/** Paged check history; the previous page stays visible while the next one loads. */
export function useMonitorChecks(id: number, page: number) {
  return useQuery({
    queryKey: monitorKeys.checks(id, page),
    queryFn: () => monitorsApi.checks(id, page),
    placeholderData: keepPreviousData,
  })
}

export function useSetMonitorActive(id: number) {
  const sync = useSyncSavedMonitor()
  return useMutation({ mutationFn: (isActive: boolean) => monitorsApi.setActive(id, isActive), onSuccess: sync })
}

/**
 * `leave` navigates away first: dropping the cached monitor while its page is still mounted would
 * make the page refetch it, get 404 and flash an error before the navigation.
 */
export function useDeleteMonitor(id: number, leave: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => monitorsApi.remove(id),
    onSuccess: async () => {
      await leave()
      queryClient.removeQueries({ queryKey: monitorKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: monitorKeys.list() })
      void queryClient.invalidateQueries({ queryKey: monitorKeys.summary() })
    },
  })
}
