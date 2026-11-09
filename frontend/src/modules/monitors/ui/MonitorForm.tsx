import { useForm } from '@tanstack/react-form'
import type { ChangeEvent, ReactNode } from 'react'

import { submitWithServerErrors } from '@/shared/lib/form'
import { Button, FormField, InlineAlert, Input, SegmentedControl, Select, Switch } from '@/shared/ui'

import {
  HTTP_METHODS,
  intervalOptions,
  LIMITS,
  MONITOR_FIELD_ALIASES,
  MONITOR_FORM_FIELDS,
  type MonitorFormValues,
  type MonitorPayload,
  monitorFormSchema,
  toPayload,
} from '../model/form'
import type { HttpMethod } from '../model/types'

interface MonitorFormProps {
  initialValues: MonitorFormValues
  submitLabel: string
  onSubmit: (payload: MonitorPayload) => Promise<unknown>
  onSuccess: () => void
  onCancel: () => void
}

/** `<input type="number">` <-> number; an empty field is NaN so the schema says "Введите число". */
function numberInputProps(value: number, onChange: (value: number) => void, onBlur: () => void) {
  return {
    type: 'number' as const,
    inputMode: 'numeric' as const,
    value: Number.isNaN(value) ? '' : value,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      onChange(event.target.value === '' ? Number.NaN : Number(event.target.value)),
    onBlur,
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-h3 font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

export function MonitorForm({ initialValues, submitLabel, onSubmit, onSuccess, onCancel }: MonitorFormProps) {
  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: monitorFormSchema,
      onSubmitAsync: submitWithServerErrors(
        (values: MonitorFormValues) => onSubmit(toPayload(values)),
        MONITOR_FORM_FIELDS,
        MONITOR_FIELD_ALIASES,
      ),
    },
    onSubmit: onSuccess,
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) =>
          typeof error === 'string' && error ? <InlineAlert tone="error">{error}</InlineAlert> : null
        }
      </form.Subscribe>

      <Section title="Что проверять">
        <form.Field name="name">
          {(field) => (
            <FormField label="Название" errors={field.state.meta.errors}>
              <Input
                name={field.name}
                maxLength={LIMITS.nameMax}
                placeholder="Например, Основной сайт"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="url">
          {(field) => (
            <FormField
              label="URL"
              hint="http или https; внутренние адреса (localhost, 10.x, 192.168.x…) недоступны"
              errors={field.state.meta.errors}
            >
              <Input
                name={field.name}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                maxLength={LIMITS.urlMax}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="method">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption font-medium text-foreground" aria-hidden>
                HTTP-метод
              </span>
              <SegmentedControl<HttpMethod>
                label="HTTP-метод"
                value={field.state.value}
                options={HTTP_METHODS}
                onChange={field.handleChange}
                className="sm:max-w-72"
              />
            </div>
          )}
        </form.Field>
      </Section>

      <Section title="Как проверять">
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="interval_sec">
            {(field) => (
              <FormField label="Интервал проверки" errors={field.state.meta.errors}>
                <Select
                  name={field.name}
                  value={String(field.state.value)}
                  options={intervalOptions(field.state.value)}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(Number(event.target.value))}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="timeout_sec">
            {(field) => (
              <FormField
                label="Таймаут, секунд"
                hint={`От ${LIMITS.timeoutMinSec} до ${LIMITS.timeoutMaxSec}, меньше интервала`}
                errors={field.state.meta.errors}
              >
                <Input
                  name={field.name}
                  min={LIMITS.timeoutMinSec}
                  max={LIMITS.timeoutMaxSec}
                  step="any"
                  {...numberInputProps(field.state.value, field.handleChange, field.handleBlur)}
                  inputMode="decimal"
                />
              </FormField>
            )}
          </form.Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-foreground">Ожидаемый код ответа</span>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="expected_status_from">
              {(field) => (
                <FormField label="от" errors={field.state.meta.errors}>
                  <Input
                    name={field.name}
                    min={LIMITS.statusMin}
                    max={LIMITS.statusMax}
                    {...numberInputProps(field.state.value, field.handleChange, field.handleBlur)}
                  />
                </FormField>
              )}
            </form.Field>
            <form.Field name="expected_status_to">
              {(field) => (
                <FormField label="до" errors={field.state.meta.errors}>
                  <Input
                    name={field.name}
                    min={LIMITS.statusMin}
                    max={LIMITS.statusMax}
                    {...numberInputProps(field.state.value, field.handleChange, field.handleBlur)}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
          <p className="text-micro text-muted-foreground">
            Проверка успешна, если код ответа попадает в диапазон. По умолчанию 200–299.
          </p>
        </div>
      </Section>

      <Section title="Настройки">
        <div className="flex flex-col divide-y divide-border [&>*]:py-2">
          <form.Field name="is_active">
            {(field) => (
              <Switch
                label="Проверять"
                description="Выключите, чтобы поставить монитор на паузу"
                checked={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="is_public">
            {(field) => (
              <Switch
                label="Публичный"
                description="Монитор можно показать на публичной статус-странице"
                checked={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>
      </Section>

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
