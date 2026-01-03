import { type NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware'
import { generateToken, verifyPassword } from '@/lib/auth'
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

      // Generate JWT token with user info
      const token = generateToken(user.id, user.email, user.isAdmin)

      const response = NextResponse.json({
        isAdmin: user.isAdmin,
        email: user.email,
      })

      // Set HTTP-only cookie
      response.cookies.set('token', token, {
        httpOnly: true,
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
