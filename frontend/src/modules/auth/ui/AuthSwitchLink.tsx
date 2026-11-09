import { Link } from '@tanstack/react-router'

interface AuthSwitchLinkProps {
  question: string
  action: string
  to: '/login' | '/register'
}

/** Secondary auth action: a 44px row in the brand ink. */
export function AuthSwitchLink({ question, action, to }: AuthSwitchLinkProps) {
  return (
    <p className="text-caption text-muted-foreground">
      {question}{' '}
      <Link
        to={to}
        className="inline-flex min-h-11 items-center font-semibold text-primary-ink hover:underline"
      >
        {action}
      </Link>
    </p>
  )
}
