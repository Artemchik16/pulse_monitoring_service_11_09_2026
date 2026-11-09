import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { useLogout, useMe } from '@/modules/auth'
import { cn } from '@/shared/lib/cn'
import { Button, Logo, ThemeToggle } from '@/shared/ui'

const NAV = [
  { to: '/', label: 'Мониторы', match: (path: string) => path === '/' || path.startsWith('/monitors') },
  { to: '/status-pages', label: 'Статус-страницы', match: (path: string) => path.startsWith('/status-pages') },
  { to: '/playground', label: 'Полигон', match: (path: string) => path.startsWith('/playground') },
] as const

function Nav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <nav aria-label="Разделы" className={cn('flex gap-1', className)}>
      {NAV.map((item) => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-(--radius-button) px-3 text-caption font-semibold transition-colors md:min-h-10',
              active ? 'bg-chip-active text-chip-active-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Authenticated layout: sticky header + page content. */
export function AppShell() {
  const { data: user } = useMe()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-(--z-nav) border-b border-border bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="Pulse — на главную" className="rounded-(--radius-control-sm)">
              <Logo />
            </Link>
            <Nav className="hidden md:flex" />
          </div>
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
        {/* Phones: sections in a second row instead of squeezing the header */}
        <Nav className="mx-auto max-w-6xl overflow-x-auto px-3 pb-2 md:hidden" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
