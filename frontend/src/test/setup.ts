import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { sessionStore } from '@/shared/api'

import { server } from './server'

// jsdom has no scrolling; the router's scroll restoration calls it
window.scrollTo = () => {}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  window.localStorage.clear()
  sessionStore.setState(() => ({ tokens: null, endedBy: null }))
})

afterAll(() => server.close())
