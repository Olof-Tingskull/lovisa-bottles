import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { checkImageAccess, incrementAccessCount } from '@/lib/image-access'
import { downloadFromR2 } from '@/lib/r2'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_request, user) => {
    try {
      const { id: imageId } = await params

      // Get image metadata from database
      const image = await prisma.image.findUnique({
        where: { id: imageId },
      })

      if (!image) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      // Check if user has access
      const accessCheck = await checkImageAccess(imageId, user.id)

      if (!accessCheck.hasAccess) {
        return NextResponse.json(
          { error: accessCheck.reason || 'Access denied' },
          { status: 403 }
        )
      }

      // Increment access count
      await incrementAccessCount(imageId, user.id)

      // Download image from R2
      const { stream, contentType } = await downloadFromR2(image.storageKey)

      // Convert AWS SDK stream to buffer
      // The stream is a Node.js Readable, not a Web ReadableStream
      const chunks: Buffer[] = []

      // Check if it's a Readable stream (Node.js)
      if (stream && typeof (stream as any).on === 'function') {
        await new Promise<void>((resolve, reject) => {
          const readable = stream as any
          readable.on('data', (chunk: Buffer) => chunks.push(chunk))
          readable.on('end', () => resolve())
          readable.on('error', (err: Error) => reject(err))
        })
      } else {
        // If it's already a buffer/blob, use it directly
        const arrayBuffer = await (stream as Blob).arrayBuffer()
        chunks.push(Buffer.from(arrayBuffer))
      }

      const buffer = Buffer.concat(chunks)

      // Return image with proper headers
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType || image.contentType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
          'Content-Disposition': `inline; filename="${image.filename}"`,
        },
      })
    } catch (error) {
      console.error('Image access error:', error)
      return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 })
    }
  })
}
