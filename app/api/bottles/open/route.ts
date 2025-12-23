import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { bottleId, entry } = await req.json()

      if (!bottleId) {
        return NextResponse.json(
          { error: 'Bottle ID is required' },
          { status: 400 }
        )
      }

      if (!entry) {
        return NextResponse.json(
          { error: 'Journal entry is required when opening a bottle' },
          { status: 400 }
        )
      }

      // Check if bottle exists
      const bottle = await prisma.bottle.findUnique({
        where: { id: bottleId },
      })

      if (!bottle) {
        return NextResponse.json(
          { error: 'Bottle not found' },
          { status: 404 }
        )
      }

      // Only enforce restrictions for non-admin users
      if (!user.isAdmin) {
        // Check if already opened
        const existingOpen = await prisma.bottleOpen.findUnique({
          where: {
            bottleId_userId: {
              bottleId,
              userId: user.id,
            },
          },
        })

        if (existingOpen) {
          return NextResponse.json(
            { error: 'Bottle already opened' },
            { status: 400 }
          )
        }

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
            { status: 400 }
          )
        }
      }

      // Use a transaction to create both journal entry and bottle open together
      const result = await prisma.$transaction(async (tx) => {
        // Create journal entry first
        const journalEntry = await tx.journalEntry.create({
          data: {
            userId: user.id,
            date: new Date(),
            entry,
          },
        })

        // Mark bottle as opened and link to journal
        // For admins, if they already opened this bottle, update the existing record
        // For regular users, create a new record (guaranteed to not exist due to checks above)
        let bottleOpen
        if (user.isAdmin) {
          // Try to upsert for admins
          bottleOpen = await tx.bottleOpen.upsert({
            where: {
              bottleId_userId: {
                bottleId,
                userId: user.id,
              },
            },
            update: {
              journalEntryId: journalEntry.id,
              openedAt: new Date(),
            },
            create: {
              bottleId,
              userId: user.id,
              journalEntryId: journalEntry.id,
            },
          })
        } else {
          bottleOpen = await tx.bottleOpen.create({
            data: {
              bottleId,
              userId: user.id,
              journalEntryId: journalEntry.id,
            },
          })
        }

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
      return NextResponse.json(
        { error: 'Failed to open bottle' },
        { status: 500 }
      )
    }
  })
}
