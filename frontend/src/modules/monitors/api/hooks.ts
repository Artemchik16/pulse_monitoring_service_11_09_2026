import { queryOptions, useQuery } from '@tanstack/react-query'

import { monitorKeys } from '../model/queryKeys'
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
