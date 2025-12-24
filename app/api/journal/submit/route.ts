import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { generateMoodQuery, generateTextEmbedding, pickBestBottle } from '@/lib/openai'
import { Prisma } from '@prisma/client'

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

      const moodQuery = await generateMoodQuery(entry)

      const queryEmbedding = await generateTextEmbedding(moodQuery)
      const embeddingString = `[${queryEmbedding.join(',')}]`

      const openedBottleIds = await prisma.bottleOpen.findMany({
        where: { userId: user.id },
        select: { bottleId: true },
      })

      const openedIds = openedBottleIds.map((b) => b.bottleId)

      let topBottles: Array<{ id: number; name: string; mood: string | null }>

      if (openedIds.length > 0) {
        topBottles = await prisma.$queryRaw<Array<{ id: number; name: string; mood: string | null }>>`
          SELECT id, name, mood
          FROM bottles
          WHERE id NOT IN (${Prisma.join(openedIds)})
            AND mood_embedding IS NOT NULL
            AND mood IS NOT NULL
          ORDER BY mood_embedding <=> ${embeddingString}::vector
          LIMIT 5
        `
      } else {
        topBottles = await prisma.$queryRaw<Array<{ id: number; name: string; mood: string | null }>>`
          SELECT id, name, mood
          FROM bottles
          WHERE mood_embedding IS NOT NULL
            AND mood IS NOT NULL
          ORDER BY mood_embedding <=> ${embeddingString}::vector
          LIMIT 5
        `
      }

      if (topBottles.length === 0) {
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

      // Step 4: AI picks the best bottle from the top 5
      const bottlesForAI = topBottles.map((b) => ({
        id: b.id,
        name: b.name,
        mood: b.mood || 'No mood description',
      }))

      const selectedBottleId = await pickBestBottle(entry, bottlesForAI)
      console.log('AI selected bottle ID:', selectedBottleId)

      // Find the selected bottle in our list
      let finalBottle = topBottles.find((b) => b.id === selectedBottleId)
      if (!finalBottle) {
        // Fallback to first bottle if AI picked something invalid
        console.error('AI picked invalid bottle, using first match')
        finalBottle = topBottles[0]
      }

      // Create journal and open bottle in transaction
      const result = await prisma.$transaction(async (tx) => {
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
            bottleId: finalBottle.id,
            userId: user.id,
            journalEntryId: journalEntry.id,
          },
        })

        return { bottleOpen, journalEntry }
      })

      return NextResponse.json({
        journalId: result.journalEntry.id,
        bottleId: finalBottle.id,
        message: 'Journal created and bottle opened!',
      })
    } catch (error) {
      console.error('Journal submit error:', error)
      return NextResponse.json({ error: 'Failed to submit journal' }, { status: 500 })
    }
  })
}
