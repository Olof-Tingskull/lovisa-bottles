import { prisma } from './prisma'

export interface GrantAccessOptions {
  maxViews?: number // e.g., 3 = can only view 3 times
  expiresAt?: Date // e.g., expires in 24 hours
}

/**
 * Grant a user access to an image with optional restrictions
 * @param imageId - The image ID
 * @param userId - The user ID to grant access to
 * @param options - Optional access restrictions (maxViews, expiresAt)
 * @returns The created ImageAccess record
 */
export async function grantImageAccess(
  imageId: string,
  userId: number,
  options?: GrantAccessOptions
) {
  try {
    // Check if image exists
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      throw new Error('Image not found')
    }

    // Create or update access record
    const access = await prisma.imageAccess.upsert({
      where: {
        imageId_userId: {
          imageId,
          userId,
        },
      },
      create: {
        imageId,
        userId,
        maxViews: options?.maxViews,
        expiresAt: options?.expiresAt,
      },
      update: {
        maxViews: options?.maxViews,
        expiresAt: options?.expiresAt,
      },
    })

    return access
  } catch (error) {
    console.error('Grant access error:', error)
    throw error
  }
}

/**
 * Check if a user has access to an image
 * @param imageId - The image ID
 * @param userId - The user ID
 * @returns Object with hasAccess boolean and reason if denied
 */
export async function checkImageAccess(
  imageId: string,
  userId: number
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const access = await prisma.imageAccess.findUnique({
      where: {
        imageId_userId: {
          imageId,
          userId,
        },
      },
    })

    if (!access) {
      return { hasAccess: false, reason: 'No access granted' }
    }

    // Check if access has expired
    if (access.expiresAt && access.expiresAt < new Date()) {
      return { hasAccess: false, reason: 'Access expired' }
    }

    // Check if max views exceeded
    if (access.maxViews !== null && access.accessCount >= access.maxViews) {
      return { hasAccess: false, reason: 'Maximum views exceeded' }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Check access error:', error)
    return { hasAccess: false, reason: 'Error checking access' }
  }
}

/**
 * Increment the access count for a user's image access
 * @param imageId - The image ID
 * @param userId - The user ID
 * @returns Updated access record
 */
export async function incrementAccessCount(imageId: string, userId: number) {
  try {
    return await prisma.imageAccess.update({
      where: {
        imageId_userId: {
          imageId,
          userId,
        },
      },
      data: {
        accessCount: {
          increment: 1,
        },
      },
    })
  } catch (error) {
    console.error('Increment access count error:', error)
    throw error
  }
}

/**
 * Revoke a user's access to an image
 * @param imageId - The image ID
 * @param userId - The user ID
 */
export async function revokeImageAccess(imageId: string, userId: number) {
  try {
    await prisma.imageAccess.delete({
      where: {
        imageId_userId: {
          imageId,
          userId,
        },
      },
    })
  } catch (error) {
    console.error('Revoke access error:', error)
    throw error
  }
}

/**
 * Get all users who have access to an image
 * @param imageId - The image ID
 * @returns Array of access records with user info
 */
export async function getImageAccessList(imageId: string) {
  try {
    return await prisma.imageAccess.findMany({
      where: { imageId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Get access list error:', error)
    throw error
  }
}
