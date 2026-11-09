import { z } from 'zod'

import { STATS_PERIODS } from '@/modules/stats'

/** /monitors/$id?period=7d&page=2 — the chosen period and checks page survive reloads and links. */
export const monitorDetailSearchSchema = z.object({
  period: z.enum(STATS_PERIODS).default('24h').catch('24h'),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type MonitorDetailSearch = z.infer<typeof monitorDetailSearchSchema>
