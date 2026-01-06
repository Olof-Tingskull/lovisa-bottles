import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { verifyToken } from '@/lib/auth'

export interface AuthenticatedUser {
  id: number
  email: string
  isAdmin: boolean
}

export interface Context {
  user: AuthenticatedUser | null
}

/**
 * Creates context for tRPC procedures
 * Extracts user from HTTP-only cookie token
 */
export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const { req } = opts

  // Extract token from HTTP-only cookie
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) {
    return { user: null }
  }

  // Parse cookie header to find token
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((cookie) => {
      const [key, ...valueParts] = cookie.split('=')
      return [key, valueParts.join('=')]
    })
  )

  const token = cookies.token
  if (!token) {
    return { user: null }
  }

  // Verify JWT token
  const payload = verifyToken(token)
  if (!payload) {
    return { user: null }
  }

  return {
    user: {
      id: payload.userId,
      email: payload.email,
      isAdmin: payload.isAdmin,
    },
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createContext>>
