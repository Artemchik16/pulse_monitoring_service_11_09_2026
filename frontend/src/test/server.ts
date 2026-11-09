import { setupServer } from 'msw/node'

/** API mock shared by all tests; each test registers its own handlers with server.use(). */
export const server = setupServer()
