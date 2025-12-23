import { type Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// Submit journal and try to open a bottle
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      const { entry } = await request.json()

      if (!entry) {
        return NextResponse.json({ error: 'Journal entry is required' }, { status: 400 })
      }

      // Check if user has already opened a bottle today (skip check for admins)
      if (!user.isAdmin) {
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
          const journalEntry = await prisma.journalEntry.create({
            data: {
              userId: user.id,
              date: new Date(),
              entry,
            },
          })

          return NextResponse.json({
            journalId: journalEntry.id,
            message: 'Journal created. You already opened a bottle today.',
          })
        }
      }

      // Get unopened bottles
      const openedBottleIds = await prisma.bottleOpen.findMany({
        where: { userId: user.id },
        select: { bottleId: true },
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
        },
      })

      if (unopenedBottles.length === 0) {
        // No bottles left to open, just create journal
        const journalEntry = await prisma.journalEntry.create({
          data: {
            userId: user.id,
            date: new Date(),
            entry,
          },
        })

        return NextResponse.json({
          journalId: journalEntry.id,
          message: 'Journal created. No bottles left to open.',
        })
      }

      // Pick a random unopened bottle
      const randomBottle = unopenedBottles[Math.floor(Math.random() * unopenedBottles.length)]

      // Create journal and open bottle in transaction
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create journal entry first
        const journalEntry = await tx.journalEntry.create({
          data: {
            userId: user.id,
            date: new Date(),
            entry,
          },
        })

        // Open bottle and link to journal
        const bottleOpen = await tx.bottleOpen.create({
          data: {
            bottleId: randomBottle.id,
            userId: user.id,
            journalEntryId: journalEntry.id,
          },
        })

        return { bottleOpen, journalEntry }
      })

      return NextResponse.json({
        journalId: result.journalEntry.id,
        bottleId: randomBottle.id,
        message: 'Journal created and bottle opened!',
      })
    } catch (error) {
      console.error('Journal submit error:', error)
      return NextResponse.json({ error: 'Failed to submit journal' }, { status: 500 })
    }
  })
}
