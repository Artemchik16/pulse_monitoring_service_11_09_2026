import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatAxisTick, formatDateTime, formatMs, formatPercent } from '@/shared/lib/format'

import type { StatsPoint } from '../model/types'

interface ResponseTimeChartProps {
  points: StatsPoint[]
  withDate: boolean
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: StatsPoint }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-(--radius-field) border border-card-border bg-popover px-3 py-2 text-micro shadow-soft">
      <p className="font-semibold text-foreground">{formatDateTime(point.ts)}</p>
      {point.checks ? (
        <>
          <p className="text-muted-foreground">
            Среднее время ответа: <span className="text-foreground tabular-nums">{formatMs(point.avg_response_ms)}</span>
          </p>
          <p className="text-muted-foreground">
            Uptime: <span className="text-foreground tabular-nums">{formatPercent(point.uptime_pct)}</span>
          </p>
          <p className="text-muted-foreground">Проверок: {point.checks}</p>
        </>
      ) : (
        <p className="text-muted-foreground">Проверок не было</p>
      )}
    </div>
  )
}

/** Average response time per bucket; gaps where there were no checks (no fake line). */
export default function ResponseTimeChart({ points, withDate }: ResponseTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="response-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="ts"
          tickFormatter={(value: string) => formatAxisTick(value, withDate)}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(value: number) => formatMs(value)}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Area
          type="monotone"
          dataKey="avg_response_ms"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#response-fill)"
          connectNulls={false}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--card)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
