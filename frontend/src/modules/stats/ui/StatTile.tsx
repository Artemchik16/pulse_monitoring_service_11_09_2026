import { cn } from '@/shared/lib/cn'

interface StatTileProps {
  label: string
  value: string
  hint?: string
  tone?: 'success' | 'warning' | 'error'
}

const toneClass = { success: 'text-success-ink', warning: 'text-warning-ink', error: 'text-error-ink' }

export function StatTile({ label, value, hint, tone }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-(--radius-field) bg-surface-sunken px-3 py-2.5">
      <dt className="text-micro text-muted-foreground">{label}</dt>
      <dd className={cn('text-h3 font-bold tabular-nums', tone ? toneClass[tone] : 'text-foreground')}>{value}</dd>
      {hint ? <dd className="text-micro text-label-tertiary">{hint}</dd> : null}
    </div>
  )
}
