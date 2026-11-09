import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/shared/ui'

/** Page frame of the create/edit form: back link, title, one card. */
export function MonitorFormLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        to="/"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-(--radius-control-sm) px-2 text-caption font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Мониторы
      </Link>
      <h1 className="text-title font-bold">{title}</h1>
      <Card className="p-5 sm:p-6">{children}</Card>
    </div>
  )
}
