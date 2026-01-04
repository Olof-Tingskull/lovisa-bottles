import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { grantImageAccess, type GrantAccessOptions } from '@/lib/image-access'
import { z } from 'zod'

const grantAccessSchema = z.object({
  userId: z.number(),
  maxViews: z.number().optional(),
  expiresAt: z.string().datetime().optional(),
})

/**
 * Grant a user access to an image
 * POST /api/images/[id]/grant-access
 *
 * Body: {
 *   userId: number,
 *   maxViews?: number,
 *   expiresAt?: string (ISO date)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_request, user) => {
    try {
      // Only admins can grant access
      if (!user.isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      const { id: imageId } = await params
      const body = await req.json()

      // Validate request body
      const validatedData = grantAccessSchema.parse(body)

      const options: GrantAccessOptions = {}

      if (validatedData.maxViews !== undefined) {
        options.maxViews = validatedData.maxViews
      }

      if (validatedData.expiresAt) {
        options.expiresAt = new Date(validatedData.expiresAt)
      }

      // Grant access
      const access = await grantImageAccess(imageId, validatedData.userId, options)

      return NextResponse.json({
        success: true,
        access: {
          imageId: access.imageId,
          userId: access.userId,
          maxViews: access.maxViews,
          expiresAt: access.expiresAt,
          accessCount: access.accessCount,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Grant access error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to grant access' },
        { status: 500 }
      )
    }
  })
}
