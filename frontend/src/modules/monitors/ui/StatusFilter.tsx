import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { STATUS_META } from '../model/status'
import { MONITOR_STATUSES, type MonitorStatus } from '../model/types'

interface StatusFilterProps {
  value: MonitorStatus | undefined
  counts: Record<MonitorStatus, number>
  total: number
  onChange: (status: MonitorStatus | undefined) => void
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--radius-pill) px-3.5 text-caption font-semibold transition-colors md:min-h-9',
        'motion-safe:active:scale-[0.97]',
        active ? 'bg-chip-active text-chip-active-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function StatusFilter({ value, counts, total, onChange }: StatusFilterProps) {
  return (
    <div
      role="group"
      aria-label="Фильтр по статусу"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
    >
      <Chip active={!value} onClick={() => onChange(undefined)}>
        Все <span className="tabular-nums opacity-70">{total}</span>
      </Chip>
      {MONITOR_STATUSES.map((status) => (
        <Chip key={status} active={value === status} onClick={() => onChange(status)}>
          <span className={cn('size-2 rounded-full', STATUS_META[status].dotClassName)} aria-hidden />
          {STATUS_META[status].label}
          <span className="tabular-nums opacity-70">{counts[status]}</span>
        </Chip>
      ))}
    </div>
  )
}
