import { type NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware'
import { generateToken, verifyPassword } from '@/lib/auth'
import { deriveEncryptionKey } from '@/lib/encryption-server'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  return withValidation(request, loginSchema, async (_req, data) => {
    try {
      // Get the user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      // Verify password
      const isValid = await verifyPassword(data.password, user.passwordHash)

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      // Generate JWT token and encryption key
      const token = generateToken(user.id, user.email, user.isAdmin)
      const encryptionKey = deriveEncryptionKey(data.password)

      const response = NextResponse.json({
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
      console.error('Login error:', error)
      return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
  })
}
