import { cva } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

const alertVariants = cva('flex items-start gap-2.5 rounded-(--radius-field) px-3 py-2.5 text-caption', {
  variants: {
    tone: {
      error: 'bg-error-surface text-error-ink',
      warning: 'bg-warning-surface text-warning-ink',
      info: 'bg-info-surface text-info-ink',
      success: 'bg-success-surface text-success-ink',
    },
  },
})

const icons = { error: CircleAlert, warning: TriangleAlert, info: Info, success: CircleCheck }

interface InlineAlertProps {
  tone: 'error' | 'warning' | 'info' | 'success'
  children: ReactNode
  className?: string
}

export function InlineAlert({ tone, children, className }: InlineAlertProps) {
  const Icon = icons[tone]
  return (
    <div className={cn(alertVariants({ tone }), className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
