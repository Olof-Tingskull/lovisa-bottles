import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../init'
import { prisma } from '@/lib/prisma'
import { createBottleSchema, openBottleSchema } from '@/lib/schemas'
import { generateMoodAndEmbedding } from '@/lib/openai'


export const bottlesRouter = router({
  listAll: adminProcedure.query(async () => {
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

    return {
      totalCount: bottles.length,
      openedCount: bottles.filter((b) => b.opens.length > 0).length,
      bottles,
    }
  }),

  /**
   * List my unopened bottles (regular users)
   * Shows only assigned bottles that haven't been opened yet
   */
  listMyUnopened: protectedProcedure.query(async ({ ctx }) => {
    const openedBottleIds = await prisma.bottleOpen.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        bottleId: true,
      },
    })

    const openedIds = openedBottleIds.map((b) => b.bottleId)

    const unopenedBottles = await prisma.bottle.findMany({
      where: {
        assignedViewerId: ctx.user.id,
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

    return {
      unopenedCount: unopenedBottles.length,
      bottles: unopenedBottles,
    }
  }),

  /**
   * Get bottle by ID
   * Requires authentication to view
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const bottle = await prisma.bottle.findUnique({
        where: { id: input.id },
        include: {
          assignedViewer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      if (!bottle) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bottle not found' })
      }

      return bottle
    }),

  /**
   * Create a new bottle (admin only)
   * Validates content structure and generates mood/embedding
   */
  create: adminProcedure.input(createBottleSchema).mutation(async ({ input }) => {
    // Verify the assigned viewer exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: input.assignedViewerId },
    })

    if (!assignedUser) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Assigned viewer not found' })
    }

    // Generate mood and embedding using OpenAI
    const { mood, embedding } = await generateMoodAndEmbedding(input.content, input.description)

    // Create the bottle without embedding
    const bottle = await prisma.bottle.create({
      data: {
        name: input.name,
        content: input.content as any,
        description: input.description,
        mood,
        assignedViewerId: input.assignedViewerId,
      },
    })

    // Update with the embedding using raw SQL
    const embeddingString = `[${embedding.join(',')}]`
    await prisma.$executeRaw`
      UPDATE bottles
      SET mood_embedding = ${embeddingString}::vector
      WHERE id = ${bottle.id}
    `

    return {
      id: bottle.id,
      name: bottle.name,
      mood: bottle.mood,
      createdAt: bottle.createdAt,
    }
  }),

  /**
   * Open a bottle
   * Creates journal entry and records bottle open
   * Enforces daily limit for non-admins
   */
  open: protectedProcedure.input(openBottleSchema).mutation(async ({ ctx, input }) => {
    // Check if bottle exists
    const bottle = await prisma.bottle.findUnique({
      where: { id: input.bottleId },
    })

    if (!bottle) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Bottle not found' })
    }

    // Check if user is assigned viewer (non-admins only)
    if (!ctx.user.isAdmin && bottle.assignedViewerId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not authorized to open this bottle',
      })
    }

    // Check if already opened this specific bottle
    const existingOpen = await prisma.bottleOpen.findUnique({
      where: {
        bottleId_userId: {
          bottleId: input.bottleId,
          userId: ctx.user.id,
        },
      },
    })

    if (existingOpen) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bottle already opened' })
    }

    // Only enforce daily limit for non-admin users
    if (!ctx.user.isAdmin) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const openedToday = await prisma.bottleOpen.findFirst({
        where: {
          userId: ctx.user.id,
          openedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      if (openedToday) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only open one bottle per day',
        })
      }
    }

    // Create journal entry and bottle open in transaction
    const result = await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          userId: ctx.user.id,
          date: new Date(),
          entry: input.entry,
        },
      })

      const bottleOpen = await tx.bottleOpen.create({
        data: {
          bottleId: input.bottleId,
          userId: ctx.user.id,
          journalEntryId: journalEntry.id,
        },
      })

      return { bottleOpen, journalEntry }
    })

    return {
      id: bottle.id,
      content: bottle.content,
      openedAt: result.bottleOpen.openedAt,
      journalId: result.journalEntry.id,
    }
  }),
})
