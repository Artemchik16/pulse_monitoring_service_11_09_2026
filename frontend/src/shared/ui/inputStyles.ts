import { cn } from '@/shared/lib/cn'

/** The field well (DESIGN.md: Fields). Shared by Input and PasswordInput. */
export const inputClassName = cn(
  'h-11 w-full min-w-0 rounded-(--radius-field) border border-input bg-field px-3 text-body text-foreground',
  'placeholder:text-label-tertiary md:h-(--control-height-md)',
  'transition-[border-color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:shadow-[0_0_0_1px_var(--ring)]',
  'aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_1px_var(--destructive)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
)
