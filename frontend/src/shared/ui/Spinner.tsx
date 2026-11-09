import { LoaderCircle } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

/** Turns at 1.5s even with reduced motion: a frozen spinner reads as a hang. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn('size-5 animate-spin [animation-duration:1.5s]', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'status' : undefined}
    />
  )
}
