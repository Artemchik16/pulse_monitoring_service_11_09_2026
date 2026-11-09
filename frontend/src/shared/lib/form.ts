import { ApiError, toApiError } from '@/shared/api'

/** Errors in the shape TanStack Form accepts from a form-level validator. */
export interface FormServerErrors {
  form?: string
  fields: Record<string, string>
}

/**
 * Map an API error onto form errors: field messages next to their inputs (TZ B3),
 * everything else as one form-level message. Unknown fields fall back to the form message.
 */
export function toFormErrors(error: unknown, knownFields: readonly string[]): FormServerErrors {
  const apiError = error instanceof ApiError ? error : toApiError(error)
  const fields: Record<string, string> = {}
  const orphanMessages: string[] = []

  for (const [name, messages] of Object.entries(apiError.fields)) {
    if (knownFields.includes(name)) fields[name] = messages[0] ?? ''
    else orphanMessages.push(...messages)
  }

  const hasFieldErrors = Object.keys(fields).length > 0
  const form = orphanMessages.length
    ? orphanMessages.join(' ')
    : hasFieldErrors
      ? undefined
      : apiError.message
  return { form, fields }
}

/**
 * Build `validators.onSubmitAsync` for TanStack Form: run the mutation, return server errors.
 * TanStack Form clears a field's server error as soon as the user edits that field.
 */
export function submitWithServerErrors<TValues>(
  submit: (values: TValues) => Promise<unknown>,
  knownFields: readonly (keyof TValues & string)[],
) {
  return async ({ value }: { value: TValues }) => {
    try {
      await submit(value)
      return undefined
    } catch (error) {
      return toFormErrors(error, knownFields)
    }
  }
}
