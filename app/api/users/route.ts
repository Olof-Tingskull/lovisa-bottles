import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// Get all users (admin only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    try {
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

      return NextResponse.json({ users })
    } catch (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
  })
}
