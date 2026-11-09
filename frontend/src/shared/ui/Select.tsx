import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

import { inputClassName } from './inputStyles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[]
}

/** Native select in the field well: the platform picker is the best one on phones. */
export function Select({ options, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(inputClassName, 'appearance-none pr-10', className)} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
