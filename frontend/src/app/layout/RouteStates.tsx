import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui'

/** Any render/loader error ends here instead of a white screen. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const apiError = toApiError(error)
  return (
    <ErrorState
      className="min-h-[60dvh]"
      title="Что-то пошло не так"
      message={apiError.message}
      requestId={apiError.requestId}
      onRetry={() => {
        reset()
        void router.invalidate()
      }}
    />
  )
}

export function RoutePending() {
  return <LoadingState className="min-h-[60dvh]" />
}

export function RouteNotFound() {
  return (
    <EmptyState
      className="min-h-[60dvh]"
      icon={SearchX}
      title="Страница не найдена"
      description="Возможно, ссылка устарела или в ней опечатка."
      action={
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-primary-ink hover:underline">
          На главную
        </Link>
      }
    />
  )
}
