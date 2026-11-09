import { useForm } from '@tanstack/react-form'

import { submitWithServerErrors } from '@/shared/lib/form'
import { Button, FormField, InlineAlert, Input } from '@/shared/ui'

import {
  STATUS_PAGE_FORM_FIELDS,
  type StatusPageFormValues,
  type StatusPagePayload,
  slugify,
  statusPageFormSchema,
} from '../model/form'
import { MonitorPicker } from './MonitorPicker'

interface StatusPageFormProps {
  initialValues: StatusPageFormValues
  /** Suggest the address from the title until the user edits it (new pages only). */
  suggestSlug: boolean
  submitLabel: string
  onSubmit: (payload: StatusPagePayload) => Promise<unknown>
  onSuccess: () => void
  onCancel: () => void
}

export function StatusPageForm({ initialValues, suggestSlug, submitLabel, onSubmit, onSuccess, onCancel }: StatusPageFormProps) {
  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: statusPageFormSchema,
      onSubmitAsync: submitWithServerErrors(
        (values: StatusPageFormValues) => onSubmit(statusPageFormSchema.parse(values)),
        STATUS_PAGE_FORM_FIELDS,
      ),
    },
    onSubmit: onSuccess,
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => (typeof error === 'string' && error ? <InlineAlert tone="error">{error}</InlineAlert> : null)}
      </form.Subscribe>

      <form.Field
        name="title"
        listeners={{
          onChange: ({ value }) => {
            // Keep suggesting until the user takes over the address field
            if (suggestSlug && !form.getFieldMeta('slug')?.isDirty) {
              form.setFieldValue('slug', slugify(value), { dontUpdateMeta: true })
            }
          },
        }}
      >
        {(field) => (
          <FormField label="Название" errors={field.state.meta.errors}>
            <Input
              name={field.name}
              placeholder="Например, Статус Acme"
              maxLength={100}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="slug">
        {(field) => (
          <FormField
            label="Адрес страницы"
            hint={`${window.location.origin}/status/${field.state.value || '…'}`}
            errors={field.state.meta.errors}
          >
            <Input
              name={field.name}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={50}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value.toLowerCase())}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="monitor_ids">
        {(field) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-caption font-medium text-foreground">Мониторы на странице</legend>
            <p className="text-micro text-muted-foreground">
              Посетители увидят только название, статус и uptime. URL мониторов и подробности ошибок не показываются.
            </p>
            {field.state.meta.errors.length ? (
              <p className="text-caption text-error-ink" role="alert">
                {String(field.state.meta.errors[0])}
              </p>
            ) : null}
            <MonitorPicker value={field.state.value} onChange={field.handleChange} />
          </fieldset>
        )}
      </form.Field>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
