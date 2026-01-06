import { initTRPC, TRPCError } from '@trpc/server'
import type { TRPCContext } from './context'

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<TRPCContext>().create()

/**
 * Base exports
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Middleware to enforce authentication
 * Use this for protected endpoints
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Narrow type to non-null
    },
  })
})

/**
 * Middleware to enforce admin access
 * Use this for admin-only endpoints
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  if (!ctx.user.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(isAuthed)

/**
 * Admin procedure - requires admin access
 */
export const adminProcedure = t.procedure.use(isAdmin)
