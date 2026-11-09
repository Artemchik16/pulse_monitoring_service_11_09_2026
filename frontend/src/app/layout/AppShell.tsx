import { Link, Outlet } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { useLogout, useMe } from '@/modules/auth'
import { Button, Logo, ThemeToggle } from '@/shared/ui'

/** Authenticated layout: sticky header + page content. */
export function AppShell() {
  const { data: user } = useMe()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-(--z-nav) border-b border-border bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" aria-label="Pulse — на главную" className="rounded-(--radius-control-sm)">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <span className="hidden max-w-56 truncate text-caption text-muted-foreground sm:inline">
                {user.email}
              </span>
            ) : null}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut />}
              loading={logout.isPending}
              onClick={() => logout.mutate()}
              aria-label="Выйти"
            >
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
