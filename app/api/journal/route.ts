import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { date, entry } = await req.json()

      if (!date || !entry) {
        return NextResponse.json({ error: 'Date, and entry are required' }, { status: 400 })
      }

      const journalEntry = await prisma.journalEntry.create({
        data: {
          userId: user.id,
          date: new Date(date),
          entry, // Already encrypted on client side
        },
      })

      return NextResponse.json({
        id: journalEntry.id,
        date: journalEntry.date,
      })
    } catch (error) {
      console.error('Journal creation error:', error)
      return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
    }
  })
}

// Get all journal entries with bottle info
export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      const entries = await prisma.journalEntry.findMany({
        where: {
          userId: user.id,
        },
        include: {
          bottleOpen: {
            include: {
              bottle: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      })

      return NextResponse.json({ entries })
    } catch (error) {
      console.error('Journal fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 })
    }
  })
}

// Delete a journal entry
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const journalId = searchParams.get('id')

      if (!journalId) {
        return NextResponse.json({ error: 'Journal ID is required' }, { status: 400 })
      }

      // First, check if the journal entry belongs to the user
      const journalEntry = await prisma.journalEntry.findUnique({
        where: { id: parseInt(journalId, 10) },
      })

      if (!journalEntry) {
        return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
      }

      if (journalEntry.userId !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only delete your own journal entries' },
          { status: 403 },
        )
      }

      // Delete the journal entry (cascade will handle bottleOpen)
      await prisma.journalEntry.delete({
        where: { id: parseInt(journalId, 10) },
      })

      return NextResponse.json({ message: 'Journal entry deleted successfully' })
    } catch (error) {
      console.error('Journal delete error:', error)
      return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 })
    }
  })
}
