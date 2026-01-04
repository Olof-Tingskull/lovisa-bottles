import jwt from 'jsonwebtoken'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { BottleContent } from '@/lib/types'
import { withAuth } from '@/lib/middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET - List all bottles (admin only)
export async function GET(request: NextRequest) {
  return await withAuth(request, async (request, user) => {
    if (!user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Get all bottles
    const bottles = await prisma.bottle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        opens: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ bottles })
  })
}

// POST - Create a new bottle (admin only)
export async function POST(request: NextRequest) {
  return await withAuth(request, async (request, user) => {
    if (!user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    try {
      const body = await request.json()
      const { name, content, assignedViewerId } = body as { name: string; content: BottleContent; assignedViewerId: number }

      if (!name || !content || !content.blocks || content.blocks.length === 0) {
        return NextResponse.json(
          { error: 'Name and content with at least one block are required' },
          { status: 400 },
        )
      }

      if (!assignedViewerId) {
        return NextResponse.json({ error: 'Assigned viewer is required' }, { status: 400 })
      }

      // Verify the assigned viewer exists
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedViewerId },
      })

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned viewer not found' }, { status: 404 })
      }

      // Validate content structure
      for (const block of content.blocks) {
        if (!block.type) {
          return NextResponse.json({ error: 'Each block must have a type' }, { status: 400 })
        }

        if (block.type === 'text' && !block.content) {
          return NextResponse.json({ error: 'Text blocks must have content' }, { status: 400 })
        }

        if (
          (block.type === 'image' || block.type === 'video' || block.type === 'voice') &&
          !block.url
        ) {
          return NextResponse.json({ error: `${block.type} blocks must have a url` }, { status: 400 })
        }
      }

      const bottle = await prisma.bottle.create({
        data: {
          name,
          content: content as any,
          assignedViewerId,
        },
      })

      return NextResponse.json({ bottle }, { status: 201 })
    } catch (error) {
      console.error('Error creating bottle:', error)
      return NextResponse.json({ error: 'Failed to create bottle' }, { status: 500 })
    }
  })
}
