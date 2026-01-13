import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../init'
import { loginSchema, setupSchema } from '@/lib/schemas'
import { generateToken, verifyPassword, hashPassword } from '@/lib/auth'
import { deriveEncryptionKey } from '@/lib/encryption-server'
import { prisma } from '@/lib/prisma'

/**
 * Auth router
 * Handles authentication and user setup
 */
export const authRouter = router({
  /**
   * Login endpoint
   * Returns user info and sets HTTP-only cookies for token and encryption key
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    // Get the user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash)

    if (!isValid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
    }

    // Generate JWT token and encryption key
    const token = generateToken(user.id, user.email, user.isAdmin)
    const encryptionKey = deriveEncryptionKey(input.password)

    // ✅ Set HTTP-only cookies using response headers
    ctx.resHeaders.append(
      'Set-Cookie',
      `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}` // 7 days
    )
    ctx.resHeaders.append(
      'Set-Cookie',
      `encryptionKey=${encryptionKey}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    )

    return {
      success: true,
      email: user.email,
      isAdmin: user.isAdmin,
    }
  }),

  /**
   * Setup/register new user
   * Creates account and returns user info with cookies
   */
  setup: publicProcedure.input(setupSchema).mutation(async ({ input, ctx }) => {
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email already registered' })
    }

    // Create the user with hashed password
    const passwordHash = await hashPassword(input.password)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        isAdmin: false,
      },
    })

    // Generate JWT token and encryption key
    const token = generateToken(user.id, user.email, user.isAdmin)
    const encryptionKey = deriveEncryptionKey(input.password)

    // ✅ Set HTTP-only cookies using response headers
    ctx.resHeaders.append(
      'Set-Cookie',
      `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}` // 7 days
    )
    ctx.resHeaders.append(
      'Set-Cookie',
      `encryptionKey=${encryptionKey}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    )

    return {
      success: true,
      email: user.email,
      isAdmin: user.isAdmin,
    }
  }),

  /**
   * Check if setup is complete
   * Returns true if at least one user exists
   */
  checkSetup: publicProcedure.query(async () => {
    const userCount = await prisma.user.count()
    return { isSetup: userCount > 0 }
  }),
})
