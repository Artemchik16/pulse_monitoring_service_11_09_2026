import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'

import { statusPageQueryOptions, useUpdateStatusPage } from '../api/hooks'
import { StatusPageForm } from '../ui/StatusPageForm'
import { StatusPageFormLayout } from '../ui/StatusPageFormLayout'

const route = getRouteApi('/app/status-pages/$pageId/edit')

export function EditStatusPagePage() {
  const { pageId } = route.useParams()
  const navigate = useNavigate()
  const { data: page } = useSuspenseQuery(statusPageQueryOptions(pageId))
  const updatePage = useUpdateStatusPage(pageId)
  const back = () => void navigate({ to: '/status-pages' })

  return (
    <StatusPageFormLayout title="Изменить статус-страницу">
      <StatusPageForm
        key={page.updated_at}
        initialValues={{ title: page.title, slug: page.slug, monitor_ids: page.monitor_ids }}
        suggestSlug={false}
        submitLabel="Сохранить"
        onSubmit={updatePage.mutateAsync}
        onSuccess={back}
        onCancel={back}
      />
    </StatusPageFormLayout>
  )
}
