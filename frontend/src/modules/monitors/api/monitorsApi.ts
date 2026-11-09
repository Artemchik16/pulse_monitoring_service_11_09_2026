import { apiClient, type Paginated } from '@/shared/api'

import { MAX_MONITORS_PER_USER } from '../model/constants'
import type { MonitorPayload } from '../model/form'
import type { CheckResult, Monitor, MonitorSummary } from '../model/types'

export const CHECKS_PAGE_SIZE = 20

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

  async setActive(id: number, isActive: boolean): Promise<Monitor> {
    const { data } = await apiClient.patch<Monitor>(`/api/v1/monitors/${id}`, { is_active: isActive })
    return data
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/monitors/${id}`)
  },

  async checks(id: number, page: number): Promise<Paginated<CheckResult>> {
    const { data } = await apiClient.get<Paginated<CheckResult>>(`/api/v1/monitors/${id}/checks`, {
      params: { page, page_size: CHECKS_PAGE_SIZE },
    })
    return data
  },

  async summary(): Promise<MonitorSummary[]> {
    const { data } = await apiClient.get<{ results: MonitorSummary[] }>('/api/v1/monitors/summary')
    return data.results
  },
}
