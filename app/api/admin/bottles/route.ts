import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { BottleContent } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    return decoded.userId
  } catch {
    return null
  }
}

// GET - List all bottles (admin only)
export async function GET(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

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
}

// POST - Create a new bottle (admin only)
export async function POST(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, content } = body as { name: string; content: BottleContent }

    if (!name || !content || !content.blocks || content.blocks.length === 0) {
      return NextResponse.json(
        { error: 'Name and content with at least one block are required' },
        { status: 400 }
      )
    }

    // Validate content structure
    for (const block of content.blocks) {
      if (!block.type) {
        return NextResponse.json({ error: 'Each block must have a type' }, { status: 400 })
      }

      if (block.type === 'text' && !block.content) {
        return NextResponse.json({ error: 'Text blocks must have content' }, { status: 400 })
      }

      if ((block.type === 'image' || block.type === 'video' || block.type === 'voice') && !block.url) {
        return NextResponse.json({ error: `${block.type} blocks must have a url` }, { status: 400 })
      }
    }

    const bottle = await prisma.bottle.create({
      data: {
        name,
        content: content as any,
      },
    })

    return NextResponse.json({ bottle }, { status: 201 })
  } catch (error) {
    console.error('Error creating bottle:', error)
    return NextResponse.json({ error: 'Failed to create bottle' }, { status: 500 })
  }
}
