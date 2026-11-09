import { apiClient, type Paginated } from '@/shared/api'

import type { StatusPagePayload } from '../model/form'
import type { PublicStatusPage, StatusPage } from '../model/types'

export const statusPagesApi = {
  async list(): Promise<StatusPage[]> {
    const { data } = await apiClient.get<Paginated<StatusPage>>('/api/v1/status-pages', { params: { page_size: 100 } })
    return data.results
  },
  async get(id: number): Promise<StatusPage> {
    const { data } = await apiClient.get<StatusPage>(`/api/v1/status-pages/${id}`)
    return data
  },
  async create(payload: StatusPagePayload): Promise<StatusPage> {
    const { data } = await apiClient.post<StatusPage>('/api/v1/status-pages', payload)
    return data
  },
  async update(id: number, payload: StatusPagePayload): Promise<StatusPage> {
    const { data } = await apiClient.put<StatusPage>(`/api/v1/status-pages/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/status-pages/${id}`)
  },
  async public(slug: string): Promise<PublicStatusPage> {
    const { data } = await apiClient.get<PublicStatusPage>(`/api/v1/public/status-pages/${encodeURIComponent(slug)}`)
    return data
  },
}
