import { adminProcedure, router } from '../init'
import { prisma } from '@/lib/prisma'

/**
 * Users router
 * Handles user management operations
 */
export const usersRouter = router({
  /**
   * List all users (admin only)
   */
  list: adminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
      },
      orderBy: {
        email: 'asc',
      },
    })

    return { users }
  }),
})
