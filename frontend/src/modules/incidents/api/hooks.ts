import { useInfiniteQuery } from '@tanstack/react-query'

import { incidentKeys } from '../model/queryKeys'
import { incidentsApi } from './incidentsApi'

/** Newest incidents first; "Показать ещё" loads the next page. */
export function useMonitorIncidents(monitorId: number) {
  return useInfiniteQuery({
    queryKey: incidentKeys.byMonitor(monitorId),
    queryFn: ({ pageParam }) => incidentsApi.byMonitor(monitorId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => (lastPage.next ? lastPageParam + 1 : undefined),
  })
}
