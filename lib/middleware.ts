import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export interface AuthenticatedUser {
  id: number
  email: string
  isAdmin: boolean
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Use the payload data directly from JWT (no DB query needed)
  const user: AuthenticatedUser = {
    id: payload.userId,
    email: payload.email,
    isAdmin: payload.isAdmin,
  }

  return handler(request, user)
}
