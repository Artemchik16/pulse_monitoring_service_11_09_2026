import type { ReactNode } from 'react'

import { Card, Logo, ThemeToggle } from '@/shared/ui'

interface AuthShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Auth page frame: top-aligned on phones (the keyboard never moves the card), centred from sm. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:justify-center">
      <div className="flex w-full max-w-100 flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-bold text-foreground">{title}</h1>
            {subtitle ? <p className="text-caption text-muted-foreground">{subtitle}</p> : null}
          </div>
          {children}
        </Card>
        {footer ? <div className="flex justify-center">{footer}</div> : null}
      </div>
    </main>
  )
}
