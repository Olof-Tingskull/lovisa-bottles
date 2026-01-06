import { router } from './init'
import { authRouter } from './routers/auth'
import { bottlesRouter } from './routers/bottles'
import { usersRouter } from './routers/users'

/**
 * Main tRPC application router
 * Combines all feature routers
 */
export const appRouter = router({
  auth: authRouter,
  bottles: bottlesRouter,
  users: usersRouter,
})

/**
 * Export type for use in client
 * This enables end-to-end type safety
 */
export type AppRouter = typeof appRouter
