import { type NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware'
import { hashPassword, generateToken } from '@/lib/auth'
import { deriveEncryptionKey } from '@/lib/encryption-server'
import { prisma } from '@/lib/prisma'
import { setupSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  return withValidation(request, setupSchema, async (_req, data) => {
    try {
      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }

      // Create the user with hashed password
      const passwordHash = await hashPassword(data.password)
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          isAdmin: false, // You'll manually set this to true in database for your account
        },
      })

      // Generate JWT token and encryption key
      const token = generateToken(user.id, user.email, user.isAdmin)
      const encryptionKey = deriveEncryptionKey(data.password)

      const response = NextResponse.json({
        success: true,
        isAdmin: user.isAdmin,
        email: user.email,
      })

      // Set auth token cookie (HTTP-only for security)
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      // Set encryption key cookie (HTTP-only for security)
      response.cookies.set('encryptionKey', encryptionKey, {
        httpOnly: true, // Server-side decryption only
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      return response
    } catch (error) {
      console.error('Setup error:', error)
      return NextResponse.json({ error: 'Failed to set up account' }, { status: 500 })
    }
  })
}

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({ isSetup: userCount > 0 })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json({ isSetup: false })
  }
}
