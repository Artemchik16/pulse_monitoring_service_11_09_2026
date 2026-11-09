import { CloudOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { Button } from './Button'
import { Spinner } from './Spinner'

/** Loading placeholder that keeps the page from going blank. */
export function LoadingState({ label = 'Загрузка…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground', className)}>
      <Spinner className="size-6" />
      <p className="text-caption">{label}</p>
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  requestId?: string | null
  onRetry?: () => void
  className?: string
}

/** Plain-words error with a retry and the request id for support. */
export function ErrorState({
  title = 'Не удалось загрузить данные',
  message,
  requestId,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center', className)} role="alert">
      <CloudOff className="size-8 text-error-ink" aria-hidden />
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-h3 font-semibold text-foreground">{title}</p>
        <p className="text-caption text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Повторить
        </Button>
      ) : null}
      {requestId ? <p className="text-micro text-label-tertiary">Код запроса: {requestId}</p> : null}
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-h3 font-semibold text-foreground">{title}</p>
        {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
