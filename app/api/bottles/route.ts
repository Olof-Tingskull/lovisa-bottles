export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import type { BottleContent } from '@/lib/types'

// Get bottles (admin: all bottles with opens, user: unopened bottles only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      if (user.isAdmin) {
        // Admins can see all bottles with open status
        const bottles = await prisma.bottle.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            opens: {
              select: {
                userId: true,
                openedAt: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        })

        return NextResponse.json({
          totalCount: bottles.length,
          openedCount: bottles.filter((b) => b.opens.length > 0).length,
          bottles,
        })
      } else {
        // Regular users only see their unopened bottles
        const openedBottleIds = await prisma.bottleOpen.findMany({
          where: {
            userId: user.id,
          },
          select: {
            bottleId: true,
          },
        })

        const openedIds = openedBottleIds.map((b) => b.bottleId)

        const unopenedBottles = await prisma.bottle.findMany({
          where: {
            id: {
              notIn: openedIds,
            },
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        return NextResponse.json({
          unopenedCount: unopenedBottles.length,
          bottles: unopenedBottles,
        })
      }
    } catch (error) {
      console.error('Bottles fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch bottles' }, { status: 500 })
    }
  })
}

// Create a new bottle (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    try {
      const { name, ...content }: { name: string } & BottleContent = await request.json()

      // Basic validation
      if (!name) {
        return NextResponse.json({ error: 'Bottle name is required' }, { status: 400 })
      }

      if (!content.blocks || content.blocks.length === 0) {
        return NextResponse.json({ error: 'Invalid bottle content' }, { status: 400 })
      }

      const bottle = await prisma.bottle.create({
        data: {
          name,
          content: content as any,
        },
      })

      return NextResponse.json({
        id: bottle.id,
        name: bottle.name,
        createdAt: bottle.createdAt,
      })
    } catch (error) {
      console.error('Bottle creation error:', error)
      return NextResponse.json({ error: 'Failed to create bottle' }, { status: 500 })
    }
  })
}
