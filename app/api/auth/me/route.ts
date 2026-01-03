import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    return NextResponse.json({
      email: user.email,
      isAdmin: user.isAdmin,
    })
  })
}
