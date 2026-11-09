import { createStore } from '@tanstack/react-store'

import { safeStorage } from './storage'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pulse:theme'

function initialTheme(): Theme {
  const saved = safeStorage.get(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Current colour theme; index.html applies the same choice before the first paint. */
export const themeStore = createStore<Theme>(initialTheme())

themeStore.subscribe((theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
})

export function toggleTheme(): void {
  themeStore.setState((theme) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    safeStorage.set(STORAGE_KEY, next)
    return next
  })
}
