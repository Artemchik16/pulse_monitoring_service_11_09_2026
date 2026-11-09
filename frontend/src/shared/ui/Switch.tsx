import { cn } from '@/shared/lib/cn'

interface SwitchProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/** On/off setting with a visible label; the whole row toggles it. */
export function Switch({ id, checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center justify-between gap-4',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-caption font-medium text-foreground">{label}</span>
        {description ? <span className="text-micro text-muted-foreground">{description}</span> : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-8 w-13 shrink-0 items-center rounded-(--radius-pill) p-0.5 transition-colors',
          checked ? 'bg-primary' : 'bg-switch-off',
        )}
      >
        <span
          className={cn(
            'size-7 rounded-full bg-control-thumb shadow-thumb transition-[translate]',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
          aria-hidden
        />
      </button>
    </label>
  )
}
