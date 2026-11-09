import { Check, Copy, FlaskConical } from 'lucide-react'
import { useState } from 'react'

import { toApiError } from '@/shared/api'
import { API_URL } from '@/shared/config/env'
import { cn } from '@/shared/lib/cn'
import { Card, EmptyState, ErrorState, InlineAlert } from '@/shared/ui'

import { usePlaygroundTargets, useSetPlaygroundMode } from '../api/hooks'
import { MODE_META, PLAYGROUND_MODES, type PlaygroundTarget } from '../model/types'

function endpointUrl(path: string): string {
  return `${API_URL || window.location.origin}${path}`
}

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-1.5 text-left text-micro text-muted-foreground hover:text-foreground md:min-h-0"
      aria-label={`Скопировать адрес ${url}`}
    >
      <span className="truncate font-mono">{url}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-success-ink" /> : <Copy className="size-3.5 shrink-0" />}
    </button>
  )
}

function TargetCard({ target }: { target: PlaygroundTarget }) {
  const setMode = useSetPlaygroundMode()
  const meta = MODE_META[target.mode]
  const pending = setMode.isPending ? setMode.variables?.mode : undefined

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-body font-semibold">
          Эндпоинт <span className="font-mono">{target.slug}</span>
        </h2>
        <CopyUrl url={endpointUrl(target.path)} />
      </div>

      <div className="rounded-(--radius-field) bg-surface-sunken px-3 py-2 text-caption">
        <p>
          <span className="font-semibold">Сейчас: {meta.label}</span> — {meta.does}
        </p>
        <p className="text-muted-foreground">Ожидаемо: {meta.expect}</p>
      </div>

      <div role="group" aria-label={`Режим эндпоинта ${target.slug}`} className="flex flex-wrap gap-1.5">
        {PLAYGROUND_MODES.map((mode) => {
          const active = mode === target.mode
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={active}
              disabled={setMode.isPending}
              onClick={() => !active && setMode.mutate({ slug: target.slug, mode })}
              className={cn(
                'inline-flex min-h-9 items-center rounded-(--radius-pill) px-3 font-mono text-micro font-semibold transition-colors disabled:cursor-wait',
                active ? 'bg-chip-active text-chip-active-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                pending === mode && 'motion-safe:animate-pulse',
              )}
            >
              {mode}
            </button>
          )
        })}
      </div>
      {setMode.isError ? <InlineAlert tone="error">{toApiError(setMode.error).message}</InlineAlert> : null}
    </Card>
  )
}

export function PlaygroundPage() {
  const targets = usePlaygroundTargets()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold">Полигон</h1>
        <p className="max-w-3xl text-caption text-muted-foreground">
          Тестовые эндпоинты на этом же сервере. Переключите режим — мониторы «Полигон · …» в
          демо-аккаунте проверят его в течение минуты, результат появится на дашборде. Режим общий для
          всех пользователей.
        </p>
      </div>

      {targets.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" role="status" aria-label="Загрузка полигона">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-44 rounded-(--radius-card) bg-skeleton motion-safe:animate-pulse" />
          ))}
        </div>
      ) : targets.isError ? (
        <ErrorState
          message={toApiError(targets.error).message}
          requestId={toApiError(targets.error).requestId}
          onRetry={() => void targets.refetch()}
        />
      ) : targets.data.length ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {targets.data.map((target) => (
            <li key={target.slug}>
              <TargetCard target={target} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={FlaskConical} title="Эндпоинтов полигона нет" description="Примените миграции backend." />
      )}
    </div>
  )
}
