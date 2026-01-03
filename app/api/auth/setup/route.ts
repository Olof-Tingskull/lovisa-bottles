import { type NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'
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
      await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          isAdmin: false, // You'll manually set this to true in database for your account
        },
      })

      return NextResponse.json({ success: true })
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
