import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { sessionStore } from '@/shared/api'

import { server } from './server'

// jsdom has no scrolling; the router's scroll restoration calls it
window.scrollTo = () => {}

// recharts' ResponsiveContainer measures its parent
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom may lack the modal dialog API
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
  }
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  window.localStorage.clear()
  sessionStore.setState(() => ({ tokens: null, endedBy: null }))
})

afterAll(() => server.close())
