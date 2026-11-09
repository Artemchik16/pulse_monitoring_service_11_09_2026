import { useNavigate } from '@tanstack/react-router'

import { useCreateStatusPage } from '../api/hooks'
import { StatusPageForm } from '../ui/StatusPageForm'
import { StatusPageFormLayout } from '../ui/StatusPageFormLayout'

export function NewStatusPagePage() {
  const navigate = useNavigate()
  const createPage = useCreateStatusPage()
  const back = () => void navigate({ to: '/status-pages' })

  return (
    <StatusPageFormLayout title="Новая статус-страница">
      <StatusPageForm
        initialValues={{ title: '', slug: '', monitor_ids: [] }}
        suggestSlug
        submitLabel="Создать страницу"
        onSubmit={createPage.mutateAsync}
        onSuccess={back}
        onCancel={back}
      />
    </StatusPageFormLayout>
  )
}
