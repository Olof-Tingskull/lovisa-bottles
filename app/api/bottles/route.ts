import { type NextRequest, NextResponse } from 'next/server'
import { withAuth, withValidatedAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createBottleSchema } from '@/lib/schemas'
import { generateMoodAndEmbedding } from '@/lib/openai'

// Get bottles (admin: all bottles with opens, user: assigned unopened bottles only)
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
        // Regular users only see their assigned unopened bottles
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
            assignedViewerId: user.id,
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
  return withValidatedAuth(request, createBottleSchema, async (_req, user, data) => {
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    try {
      // Verify the assigned viewer exists
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedViewerId },
      })

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned viewer not found' }, { status: 404 })
      }

      // Generate mood and embedding using OpenAI
      const { mood, embedding } = await generateMoodAndEmbedding(data.content)

      // First create the bottle without embedding
      const bottle = await prisma.bottle.create({
        data: {
          name: data.name,
          content: data.content as any,
          mood,
          assignedViewerId: data.assignedViewerId,
        },
      })

      // Then update with the embedding using raw SQL
      const embeddingString = `[${embedding.join(',')}]`
      await prisma.$executeRaw`
        UPDATE bottles
        SET mood_embedding = ${embeddingString}::vector
        WHERE id = ${bottle.id}
      `

      return NextResponse.json({
        id: bottle.id,
        name: bottle.name,
        mood: bottle.mood,
        createdAt: bottle.createdAt,
      })
    } catch (error) {
      console.error('Bottle creation error:', error)
      return NextResponse.json({ error: 'Failed to create bottle' }, { status: 500 })
    }
  })
}
