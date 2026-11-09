import { cloneElement, type ReactElement, useId } from 'react'

import { cn } from '@/shared/lib/cn'

interface FormFieldProps {
  label: string
  /** First error is shown; the control gets aria-invalid and aria-describedby. */
  errors?: readonly unknown[]
  hint?: string
  className?: string
  children: ReactElement<Record<string, unknown>>
}

function errorText(error: unknown): string | null {
  if (!error) return null
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error) return String(error.message)
  return null
}

/** Label + control + hint/error, wired for screen readers. */
export function FormField({ label, errors = [], hint, className, children }: FormFieldProps) {
  const id = useId()
  const message = errors.map(errorText).find(Boolean) ?? null
  const describedBy = message ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-caption font-medium text-foreground">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': message ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {message ? (
        <p id={`${id}-error`} className="text-caption text-error-ink" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-micro text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
