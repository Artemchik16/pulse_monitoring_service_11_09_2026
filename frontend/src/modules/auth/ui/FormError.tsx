import { InlineAlert } from '@/shared/ui'

/** Form-level error returned by the server (wrong credentials, network, rate limit). */
export function FormError({ error }: { error: unknown }) {
  if (typeof error !== 'string' || !error) return null
  return <InlineAlert tone="error">{error}</InlineAlert>
}
