import { getRouteApi } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { useEffect } from 'react'

import { MonitorStatusBadge } from '@/modules/monitors'
import { toApiError } from '@/shared/api'
import { formatDateTime, formatPercent, formatRelative } from '@/shared/lib/format'
import { Card, EmptyState, ErrorState, LoadingState, Logo, ThemeToggle } from '@/shared/ui'

import { usePublicStatusPage } from '../api/hooks'
import type { PublicStatusPage as PublicStatusPageData } from '../model/types'
import { OverallBanner } from '../ui/OverallBanner'

const route = getRouteApi('/status/$slug')

function Content({ page }: { page: PublicStatusPageData }) {
  useEffect(() => {
    document.title = `${page.title} — статус`
  }, [page.title])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold break-words">{page.title}</h1>
      <OverallBanner status={page.status} />

      {page.monitors.length ? (
        <Card className="p-2 sm:p-3">
          <div className="hidden grid-cols-[1fr_auto_5.5rem_5.5rem] gap-4 px-3 pb-2 text-micro font-medium text-muted-foreground sm:grid" aria-hidden>
            <span>Сервис</span>
            <span>Статус</span>
            <span className="text-right">24 часа</span>
            <span className="text-right">30 дней</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {page.monitors.map((monitor) => (
              <li
                key={monitor.name}
                // Phones: name on its own line, a wrapping row of status + uptime under it.
                // From sm the inner row is display:contents, so its items become table cells.
                className="flex flex-col gap-1.5 px-3 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_5.5rem_5.5rem] sm:items-center sm:gap-x-4"
              >
                <span className="min-w-0 text-body font-semibold [overflow-wrap:anywhere]">{monitor.name}</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:contents">
                  <MonitorStatusBadge status={monitor.status} className="mr-auto sm:mr-0 sm:justify-self-start" />
                  <span className="text-caption whitespace-nowrap text-muted-foreground tabular-nums sm:text-right">
                    <span className="sm:hidden">24 ч: </span>
                    <span className="font-semibold text-foreground">{formatPercent(monitor.uptime_24h)}</span>
                  </span>
                  <span className="text-caption whitespace-nowrap text-muted-foreground tabular-nums sm:text-right">
                    <span className="sm:hidden">30 дн: </span>
                    <span className="font-semibold text-foreground">{formatPercent(monitor.uptime_30d)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-6 text-center text-caption text-muted-foreground">На этой странице пока нет сервисов.</Card>
      )}

      <p className="text-micro text-label-tertiary" title={formatDateTime(page.generated_at)}>
        Обновлено {formatRelative(page.generated_at)} · обновляется автоматически
      </p>
    </div>
  )
}

/** /status/{slug}: open to anyone, no login, no internal data. */
export function PublicStatusPage() {
  const { slug } = route.useParams()
  const page = usePublicStatusPage(slug)
  const error = page.isError ? toApiError(page.error) : null

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6">
        <Logo className="text-body" />
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-10">
        {page.isPending ? (
          <LoadingState />
        ) : error?.status === 404 ? (
          <EmptyState
            icon={SearchX}
            title="Статус-страница не найдена"
            description="Проверьте адрес: возможно, страницу переименовали или удалили."
          />
        ) : page.data ? (
          <Content page={page.data} />
        ) : (
          <ErrorState
            message={error?.message ?? 'Не удалось загрузить страницу'}
            requestId={error?.requestId}
            onRetry={() => void page.refetch()}
          />
        )}
      </main>
      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-micro text-label-tertiary">
        Мониторинг — Pulse
      </footer>
    </div>
  )
}
