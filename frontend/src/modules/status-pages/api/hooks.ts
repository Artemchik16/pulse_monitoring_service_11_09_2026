import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { statusPageKeys } from '../model/queryKeys'
import type { StatusPagePayload } from '../model/form'
import type { StatusPage } from '../model/types'
import { statusPagesApi } from './statusPagesApi'

export const statusPagesQueryOptions = () =>
  queryOptions({ queryKey: statusPageKeys.list(), queryFn: statusPagesApi.list })

export const statusPageQueryOptions = (id: number) =>
  queryOptions({ queryKey: statusPageKeys.detail(id), queryFn: () => statusPagesApi.get(id) })

export const publicStatusPageQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: statusPageKeys.public(slug),
    queryFn: () => statusPagesApi.public(slug),
    // Visitors keep the tab open during an outage: refresh without a reload
    refetchInterval: 60_000,
  })

export function useStatusPages() {
  return useQuery(statusPagesQueryOptions())
}

export function usePublicStatusPage(slug: string) {
  return useQuery(publicStatusPageQueryOptions(slug))
}

function useSyncSaved() {
  const queryClient = useQueryClient()
  return (page: StatusPage) => {
    queryClient.setQueryData(statusPageKeys.detail(page.id), page)
    void queryClient.invalidateQueries({ queryKey: statusPageKeys.list() })
  }
}

export function useCreateStatusPage() {
  const sync = useSyncSaved()
  return useMutation({ mutationFn: (payload: StatusPagePayload) => statusPagesApi.create(payload), onSuccess: sync })
}

export function useUpdateStatusPage(id: number) {
  const sync = useSyncSaved()
  return useMutation({ mutationFn: (payload: StatusPagePayload) => statusPagesApi.update(id, payload), onSuccess: sync })
}

export function useDeleteStatusPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => statusPagesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: statusPageKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: statusPageKeys.list() })
    },
  })
}
