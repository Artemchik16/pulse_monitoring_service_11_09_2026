import { apiClient } from '@/shared/api'

import type { MonitorStats, StatsPeriod } from '../model/types'

export const statsApi = {
  async monitor(monitorId: number, period: StatsPeriod): Promise<MonitorStats> {
    const { data } = await apiClient.get<MonitorStats>(`/api/v1/monitors/${monitorId}/stats`, {
      params: { period },
    })
    return data
  },
}
