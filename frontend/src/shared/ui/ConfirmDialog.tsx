import { type ReactNode, useEffect, useRef } from 'react'

import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
  error?: string | null
}

/**
 * Destructive confirmation on the native <dialog>: modal, focus trap, Esc and inert background
 * come from the platform.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
  error,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!loading) onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-(--radius-card) border border-card-border bg-popover p-6 text-foreground shadow-soft backdrop:bg-overlay/55"
    >
      <div className="flex flex-col gap-2">
        <h2 id="confirm-dialog-title" className="text-h3 font-semibold">
          {title}
        </h2>
        <div className="text-caption text-muted-foreground">{description}</div>
        {error ? (
          <p className="text-caption text-error-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={loading} autoFocus>
          Отмена
        </Button>
        <Button variant="destructive" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
