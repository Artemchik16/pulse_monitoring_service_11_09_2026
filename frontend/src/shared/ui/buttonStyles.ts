import { cva } from 'class-variance-authority'

/** Button look, also used to style router links as buttons. */
export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold',
    'rounded-(--radius-button) transition-[color,background-color,filter,scale]',
    'motion-safe:active:scale-[0.97] motion-safe:active:duration-(--motion-duration-press)',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // The one CTA of a view (DESIGN.md: one CTA per view or section)
        default:
          'cta-edge bg-(image:--cta-fill) text-primary-foreground shadow-cta hover:brightness-110 active:brightness-95',
        outline: 'border border-border-strong bg-card text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-destructive-fill text-primary-foreground hover:brightness-110',
        link: 'h-auto px-0 text-primary-ink underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-11 px-3 text-caption md:h-(--control-height-md)',
        default: 'h-11 px-4 text-body md:h-(--control-height-md)',
        lg: 'h-12 px-6 text-body',
        icon: 'size-11 md:size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
