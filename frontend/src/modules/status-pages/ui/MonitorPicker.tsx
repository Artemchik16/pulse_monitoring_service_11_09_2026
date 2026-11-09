import { Link } from '@tanstack/react-router'

import { MonitorStatusBadge, useMonitors } from '@/modules/monitors'
import { toApiError } from '@/shared/api'
import { Checkbox, InlineAlert } from '@/shared/ui'

interface MonitorPickerProps {
  value: number[]
  onChange: (ids: number[]) => void
}

/** Choose monitors for the page; only monitors flagged "Публичный" can be shown publicly. */
export function MonitorPicker({ value, onChange }: MonitorPickerProps) {
  const monitors = useMonitors()

  if (monitors.isPending) {
    return <div className="h-24 rounded-(--radius-field) bg-skeleton motion-safe:animate-pulse" role="status" aria-label="Загрузка мониторов" />
  }
  if (monitors.isError) {
    return <InlineAlert tone="error">{toApiError(monitors.error).message}</InlineAlert>
  }
  if (!monitors.data.length) {
    return (
      <p className="text-caption text-muted-foreground">
        Мониторов пока нет.{' '}
        <Link to="/monitors/new" className="font-semibold text-primary-ink hover:underline">
          Добавьте первый
        </Link>
        , чтобы показать его на странице.
      </p>
    )
  }

  const selected = new Set(value)
  const toggle = (id: number, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((item) => item !== id))

  return (
    <ul className="flex flex-col divide-y divide-border">
      {[...monitors.data]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((monitor) => (
          <li key={monitor.id} className="flex items-center justify-between gap-3">
            <Checkbox
              className="min-w-0 flex-1"
              checked={selected.has(monitor.id)}
              // A non-public monitor that is already selected can still be unchecked
              disabled={!monitor.is_public && !selected.has(monitor.id)}
              onChange={(event) => toggle(monitor.id, event.target.checked)}
              label={monitor.name}
              description={
                monitor.is_public ? undefined : (
                  <>
                    Не публичный — не будет показан.{' '}
                    <Link
                      to="/monitors/$monitorId/edit"
                      params={{ monitorId: monitor.id }}
                      className="font-semibold text-primary-ink hover:underline"
                    >
                      Включить «Публичный»
                    </Link>
                  </>
                )
              }
            />
            <MonitorStatusBadge status={monitor.status} className="shrink-0" />
          </li>
        ))}
    </ul>
  )
}
