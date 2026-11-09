import { cn } from '@/shared/lib/cn'
import { formatDateTime, formatDuration, formatShortDateTime } from '@/shared/lib/format'

import { incidentDurationSec } from '../model/duration'
import type { Incident } from '../model/types'

export function IncidentItem({ incident }: { incident: Incident }) {
  const duration = formatDuration(incidentDurationSec(incident))
  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2 py-0.5 text-micro font-semibold',
            incident.is_open ? 'bg-error-surface text-error-ink' : 'bg-success-surface text-success-ink',
          )}
        >
          <span className={cn('size-1.5 rounded-full', incident.is_open ? 'bg-destructive' : 'bg-success')} aria-hidden />
          {incident.is_open ? 'Идёт сейчас' : 'Решён'}
        </span>
        <span className="text-caption font-semibold tabular-nums">
          {incident.is_open ? `уже ${duration}` : `простой ${duration}`}
        </span>
      </div>
      <p
        className="text-caption text-muted-foreground tabular-nums"
        title={`${formatDateTime(incident.started_at)}${incident.resolved_at ? ` — ${formatDateTime(incident.resolved_at)}` : ''}`}
      >
        {formatShortDateTime(incident.started_at)}
        {incident.resolved_at ? ` — ${formatShortDateTime(incident.resolved_at)}` : ''}
      </p>
      {incident.cause ? <p className="text-caption text-foreground">Причина: {incident.cause}</p> : null}
    </li>
  )
}
