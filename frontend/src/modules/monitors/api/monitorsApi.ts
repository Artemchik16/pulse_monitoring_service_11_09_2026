import { apiClient, type Paginated } from '@/shared/api'

import { MAX_MONITORS_PER_USER } from '../model/constants'
import type { MonitorPayload } from '../model/form'
import type { Monitor, MonitorSummary } from '../model/types'

export const monitorsApi = {
  async list(): Promise<Monitor[]> {
    const { data } = await apiClient.get<Paginated<Monitor>>('/api/v1/monitors', {
      params: { page_size: MAX_MONITORS_PER_USER },
    })
    return data.results
  },

  async get(id: number): Promise<Monitor> {
    const { data } = await apiClient.get<Monitor>(`/api/v1/monitors/${id}`)
    return data
  },

  async create(payload: MonitorPayload): Promise<Monitor> {
    const { data } = await apiClient.post<Monitor>('/api/v1/monitors', payload)
    return data
  },

  async update(id: number, payload: MonitorPayload): Promise<Monitor> {
    const { data } = await apiClient.put<Monitor>(`/api/v1/monitors/${id}`, payload)
    return data
  },

  async summary(): Promise<MonitorSummary[]> {
    const { data } = await apiClient.get<{ results: MonitorSummary[] }>('/api/v1/monitors/summary')
    return data.results
  },
}
