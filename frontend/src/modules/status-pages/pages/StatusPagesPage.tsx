import { Link } from '@tanstack/react-router'
import { ExternalLink, Globe, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { toApiError } from '@/shared/api'
import { Button, buttonVariants, Card, ConfirmDialog, EmptyState, ErrorState } from '@/shared/ui'

import { useDeleteStatusPage, useStatusPages } from '../api/hooks'
import { MAX_STATUS_PAGES, publicStatusUrl } from '../model/form'
import type { StatusPage } from '../model/types'

function AddButton({ disabled }: { disabled: boolean }) {
  if (disabled) {
    return (
      <Button disabled icon={<Plus />}>
        Лимит {MAX_STATUS_PAGES} страниц
      </Button>
    )
  }
  return (
    <Link to="/status-pages/new" className={buttonVariants()}>
      <Plus />
      Создать страницу
    </Link>
  )
}

export function StatusPagesPage() {
  const pages = useStatusPages()
  const deletePage = useDeleteStatusPage()
  const [deleting, setDeleting] = useState<StatusPage | null>(null)

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold">Статус-страницы</h1>
        <p className="text-caption text-muted-foreground">Публичные страницы о состоянии ваших сервисов — без входа в аккаунт.</p>
      </div>
      {pages.data?.length ? <AddButton disabled={pages.data.length >= MAX_STATUS_PAGES} /> : null}
    </div>
  )

  let body
  if (pages.isPending) {
    body = (
      <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Загрузка">
        {[0, 1].map((index) => (
          <div key={index} className="h-32 rounded-(--radius-card) bg-skeleton motion-safe:animate-pulse" />
        ))}
      </div>
    )
  } else if (pages.isError) {
    const error = toApiError(pages.error)
    body = <ErrorState message={error.message} requestId={error.requestId} onRetry={() => void pages.refetch()} />
  } else if (!pages.data.length) {
    body = (
      <EmptyState
        icon={Globe}
        title="Статус-страниц пока нет"
        description="Создайте страницу и выберите мониторы — по ссылке её увидит кто угодно, без регистрации."
        action={<AddButton disabled={false} />}
      />
    )
  } else {
    body = (
      <ul className="grid gap-4 md:grid-cols-2">
        {pages.data.map((page) => (
          <li key={page.id}>
            <Card className="flex h-full flex-col gap-4 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="truncate text-body font-semibold">{page.title}</h2>
                <a
                  href={`/status/${page.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex w-fit max-w-full items-center gap-1 truncate text-caption text-primary-ink hover:underline"
                >
                  {publicStatusUrl(page.slug)}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </a>
                <p className="text-micro text-muted-foreground">Мониторов: {page.monitor_ids.length}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <Link
                  to="/status-pages/$pageId/edit"
                  params={{ pageId: page.id }}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Pencil />
                  Изменить
                </Link>
                <Button variant="ghost" size="sm" icon={<Trash2 />} className="text-error-ink" onClick={() => setDeleting(page)}>
                  Удалить
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {body}
      <ConfirmDialog
        open={deleting !== null}
        title="Удалить статус-страницу?"
        description={<>Страница «{deleting?.title}» перестанет открываться по ссылке. Мониторы не удаляются.</>}
        confirmLabel="Удалить"
        loading={deletePage.isPending}
        error={deletePage.isError ? toApiError(deletePage.error).message : null}
        onClose={() => {
          setDeleting(null)
          deletePage.reset()
        }}
        onConfirm={() => deleting && deletePage.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
