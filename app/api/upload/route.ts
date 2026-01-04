import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { uploadToR2, generateStorageKey } from '@/lib/r2'
import { grantImageAccess } from '@/lib/image-access'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  return withAuth(req, async (_request, user) => {
    try {
      // Only admins can upload images
      if (!user.isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      // Get the file from the request
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10MB' },
          { status: 400 }
        )
      }

      // Generate unique storage key
      const storageKey = generateStorageKey(file.name)

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to R2
      await uploadToR2(storageKey, buffer, file.type)

      // Store metadata in database
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          storageKey,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
      })

      // Grant access to the uploader
      await grantImageAccess(image.id, user.id)

      // Return image ID (not the R2 URL - keeps images private)
      return NextResponse.json({
        id: image.id,
        filename: file.name,
        size: file.size,
        contentType: file.type,
      })
    } catch (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
  })
}
