import { type NextRequest, NextResponse } from 'next/server'
import { withValidatedAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { openBottleSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  return withValidatedAuth(request, openBottleSchema, async (_req, user, data) => {
    try {
      // Check if bottle exists
      const bottle = await prisma.bottle.findUnique({
        where: { id: data.bottleId },
      })

      if (!bottle) {
        return NextResponse.json({ error: 'Bottle not found' }, { status: 404 })
      }

      // Check if user is assigned viewer (non-admins only)
      if (!user.isAdmin && bottle.assignedViewerId !== user.id) {
        return NextResponse.json(
          { error: 'You are not authorized to open this bottle' },
          { status: 403 },
        )
      }

      // Check if already opened this specific bottle (applies to everyone, including admins)
      const existingOpen = await prisma.bottleOpen.findUnique({
        where: {
          bottleId_userId: {
            bottleId: data.bottleId,
            userId: user.id,
          },
        },
      })

      if (existingOpen) {
        return NextResponse.json({ error: 'Bottle already opened' }, { status: 400 })
      }

      // Only enforce daily limit for non-admin users
      if (!user.isAdmin) {
        // Check if user has already opened a bottle today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const openedToday = await prisma.bottleOpen.findFirst({
          where: {
            userId: user.id,
            openedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        })

        if (openedToday) {
          return NextResponse.json(
            { error: 'You can only open one bottle per day' },
            { status: 400 },
          )
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const journalEntry = await tx.journalEntry.create({
          data: {
            userId: user.id,
            date: new Date(),
            entry: data.entry,
          },
        })

        // Create bottle open record
        const bottleOpen = await tx.bottleOpen.create({
          data: {
            bottleId: data.bottleId,
            userId: user.id,
            journalEntryId: journalEntry.id,
          },
        })

        return { bottleOpen, journalEntry }
      })

      // Return bottle content
      return NextResponse.json({
        id: bottle.id,
        content: bottle.content,
        openedAt: result.bottleOpen.openedAt,
        journalId: result.journalEntry.id,
      })
    } catch (error) {
      console.error('Bottle open error:', error)
      return NextResponse.json({ error: 'Failed to open bottle' }, { status: 500 })
    }
  })
}
