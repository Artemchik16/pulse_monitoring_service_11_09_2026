import { apiClient, type Paginated } from '@/shared/api'

import type { Incident } from '../model/types'

export const INCIDENTS_PAGE_SIZE = 10

export const incidentsApi = {
  async byMonitor(monitorId: number, page: number): Promise<Paginated<Incident>> {
    const { data } = await apiClient.get<Paginated<Incident>>('/api/v1/incidents', {
      params: { monitor: monitorId, page, page_size: INCIDENTS_PAGE_SIZE },
    })
    return data
  },
}
