import { apiClient } from '@/shared/api'

import type { PlaygroundMode, PlaygroundTarget } from '../model/types'

export const playgroundApi = {
  async targets(): Promise<PlaygroundTarget[]> {
    const { data } = await apiClient.get<PlaygroundTarget[]>('/api/v1/playground/targets')
    return data
  },
  async setMode(slug: string, mode: PlaygroundMode): Promise<PlaygroundTarget> {
    const { data } = await apiClient.patch<PlaygroundTarget>(`/api/v1/playground/targets/${slug}`, { mode })
    return data
  },
}
