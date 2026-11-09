import { Activity } from 'lucide-react'

import { EmptyState } from '@/shared/ui'

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold">Мониторы</h1>
      <EmptyState
        icon={Activity}
        title="Здесь появятся ваши мониторы"
        description="Статусы, время ответа и uptime по каждому сайту и API."
      />
    </div>
  )
}
