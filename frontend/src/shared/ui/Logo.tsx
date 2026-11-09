import { Activity } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-h3 font-bold text-foreground', className)}>
      <span className="flex size-8 items-center justify-center rounded-(--radius-control-sm) bg-(image:--cta-fill) text-primary-foreground">
        <Activity className="size-5" aria-hidden />
      </span>
      Pulse
    </span>
  )
}
