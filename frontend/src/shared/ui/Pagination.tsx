import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from './Button'

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({ page, pageCount, onChange, disabled }: PaginationProps) {
  if (pageCount <= 1) return null
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Страницы">
      <Button
        variant="outline"
        size="sm"
        icon={<ChevronLeft />}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Назад
      </Button>
      <span className="text-caption text-muted-foreground tabular-nums" aria-live="polite">
        <span className="sr-only sm:not-sr-only">Страница </span>
        {page} из {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Вперёд
        <ChevronRight />
      </Button>
    </nav>
  )
}
