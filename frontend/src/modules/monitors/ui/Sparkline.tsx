import type { SeriesPoint } from '../model/types'

const WIDTH = 100
const HEIGHT = 32
const PADDING_Y = 4

interface SparklineProps {
  points: SeriesPoint[]
  label: string
}

/**
 * 24h mini chart: response time line (gaps where there were no checks) over a time axis where
 * hours with failed checks are red. Inline SVG: a chart library would cost more than the dashboard.
 */
export function Sparkline({ points, label }: SparklineProps) {
  const values = points.map((point) => point.avg_response_ms)
  const known = values.filter((value): value is number => value != null)
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0

  if (!known.length) {
    return (
      <div className="flex h-8 items-center text-micro text-label-tertiary" role="img" aria-label={label}>
        Нет данных за 24 часа
      </div>
    )
  }

  const min = Math.min(...known)
  const max = Math.max(...known)
  const range = max - min || 1
  const y = (value: number) => HEIGHT - PADDING_Y - ((value - min) / range) * (HEIGHT - 2 * PADDING_Y)

  // Split the line at gaps so missing hours are not bridged by a fake segment
  const segments: Array<Array<[number, number]>> = [[]]
  values.forEach((value, index) => {
    if (value == null) {
      if (segments.at(-1)!.length) segments.push([])
      return
    }
    segments.at(-1)!.push([index * step, y(value)])
  })

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-8 w-full overflow-visible"
      role="img"
      aria-label={label}
    >
      {segments.map((segment) => {
        if (!segment.length) return null
        const [firstX, firstY] = segment[0]
        if (segment.length === 1) {
          // A single point between gaps: a dot, so it is not lost
          return <circle key={firstX} cx={firstX} cy={firstY} r={1.2} className="fill-chart-1" />
        }
        const d = segment.map(([x, py], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${py.toFixed(2)}`).join('')
        return (
          <path
            key={firstX}
            d={d}
            className="fill-none stroke-chart-1"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {/* Time axis: grey track, failed hours painted red */}
      <rect x={0} y={HEIGHT - 1.5} width={WIDTH} height={1.5} className="fill-border-strong" />
      {points.map((point, index) =>
        point.uptime_pct != null && point.uptime_pct < 100 ? (
          <rect
            key={point.ts}
            x={Math.max(index * step - step / 2, 0)}
            y={HEIGHT - 2}
            width={Math.max(step, 1.5)}
            height={2}
            className="fill-destructive"
          />
        ) : null,
      )}
    </svg>
  )
}
