import { type KeyboardEvent, useRef } from 'react'

import { cn } from '@/shared/lib/cn'

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  id?: string
  className?: string
}

/** iOS-style segmented control: a radio group with arrow-key navigation. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  id,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-0.5 rounded-(--radius-button) bg-segmented-track p-0.5', className)}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'min-h-10 rounded-[10px] px-3 text-caption font-semibold whitespace-nowrap transition-colors md:min-h-9',
              active ? 'bg-segmented-thumb text-foreground shadow-segmented' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
