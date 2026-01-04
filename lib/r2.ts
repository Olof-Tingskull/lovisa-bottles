import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

// Validate required environment variables
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET_NAME = process.env.R2_BUCKET_NAME

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  throw new Error('Missing required R2 environment variables')
}

// Initialize R2 client (Cloudflare R2 is S3-compatible)
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
})

export const R2_BUCKET = BUCKET_NAME

/**
 * Upload a file to R2
 * @param key - Unique identifier for the file (e.g., "images/uuid.jpg")
 * @param body - File buffer or stream
 * @param contentType - MIME type of the file
 * @returns Promise<void>
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string
): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })

    await r2Client.send(command)
  } catch (error) {
    console.error('R2 upload error:', error)
    throw new Error('Failed to upload file to R2')
  }
}

/**
 * Download a file from R2
 * @param key - The R2 object key
 * @returns Promise with the file stream and metadata
 */
export async function downloadFromR2(key: string): Promise<{
  stream: ReadableStream | Readable | Blob
  contentType: string | undefined
  contentLength: number | undefined
}> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })

    const response = await r2Client.send(command)

    if (!response.Body) {
      throw new Error('No file body returned from R2')
    }

    return {
      stream: response.Body as any,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    }
  } catch (error) {
    console.error('R2 download error:', error)
    throw new Error('Failed to download file from R2')
  }
}

/**
 * Delete a file from R2
 * @param key - The R2 object key
 * @returns Promise<void>
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })

    await r2Client.send(command)
  } catch (error) {
    console.error('R2 delete error:', error)
    throw new Error('Failed to delete file from R2')
  }
}

/**
 * Generate a unique storage key for an image
 * @param filename - Original filename
 * @returns Unique key for R2 storage
 */
export function generateStorageKey(filename: string): string {
  const extension = filename.split('.').pop() || 'jpg'
  const uuid = crypto.randomUUID()
  return `images/${uuid}.${extension}`
}
