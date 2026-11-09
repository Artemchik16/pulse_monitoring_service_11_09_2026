/**
 * Live screens poll at this interval (TZ D3). Checks run at most once a minute, so 15 s keeps
 * every open tab within a minute of reality; hidden tabs do not poll (TanStack Query pauses
 * refetchInterval in the background and refetches on focus).
 */
export const LIVE_REFRESH_MS = 15_000
