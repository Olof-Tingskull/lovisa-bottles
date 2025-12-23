import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (_req, user) => {
    try {
      const { id } = await params
      const bottleId = parseInt(id)

      if (isNaN(bottleId)) {
        return NextResponse.json(
          { error: 'Invalid bottle ID' },
          { status: 400 }
        )
      }

      // Get the bottle
      const bottle = await prisma.bottle.findUnique({
        where: { id: bottleId },
      })

      if (!bottle) {
        return NextResponse.json(
          { error: 'Bottle not found' },
          { status: 404 }
        )
      }

      // Check if user is admin OR has opened this bottle
      if (!user.isAdmin) {
        const bottleOpen = await prisma.bottleOpen.findUnique({
          where: {
            bottleId_userId: {
              bottleId,
              userId: user.id,
            },
          },
        })

        if (!bottleOpen) {
          return NextResponse.json(
            { error: 'You have not opened this bottle yet' },
            { status: 403 }
          )
        }
      }

      // Return bottle details
      return NextResponse.json({
        id: bottle.id,
        name: bottle.name,
        content: bottle.content,
        createdAt: bottle.createdAt,
      })
    } catch (error) {
      console.error('Bottle detail error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bottle' },
        { status: 500 }
      )
    }
  })
}
