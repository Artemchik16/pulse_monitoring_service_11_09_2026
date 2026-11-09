import { WifiOff } from 'lucide-react'

import { useOnline } from '@/shared/lib/useOnline'

/**
 * Offline, TanStack Query pauses requests instead of failing them: without this banner a screen
 * would just keep loading. Everything resumes by itself when the connection is back.
 */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-(--z-toast) mx-auto flex max-w-md items-center gap-3 rounded-(--radius-card) border border-card-border bg-popover px-4 py-3 text-caption text-foreground shadow-soft"
    >
      <WifiOff className="size-5 shrink-0 text-warning-ink" aria-hidden />
      <span>Нет подключения к интернету. Данные обновятся, когда связь вернётся.</span>
    </div>
  )
}
