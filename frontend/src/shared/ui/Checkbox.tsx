import { Check } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label: ReactNode
  description?: ReactNode
}

/** Native checkbox (keyboard, forms, a11y for free) in the field-well chrome, 44px row. */
export function Checkbox({ label, description, className, disabled, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 items-start gap-3 py-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          disabled={disabled}
          className="peer size-5 appearance-none rounded-[6px] border border-input bg-field transition-colors checked:border-primary checked:bg-primary disabled:opacity-50"
          {...props}
        />
        <Check
          className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <span className={cn('flex min-w-0 flex-col', disabled && 'opacity-60')}>
        <span className="text-caption font-medium text-foreground">{label}</span>
        {description ? <span className="text-micro text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  )
}
