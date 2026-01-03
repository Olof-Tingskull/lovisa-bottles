import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from './auth'

export interface AuthenticatedUser {
  id: number
  email: string
  isAdmin: boolean
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  // Read token from HTTP-only cookie
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 })
  }

  const payload = verifyToken(token)

  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Use the payload data directly from JWT (no DB query needed)
  const user: AuthenticatedUser = {
    id: payload.userId,
    email: payload.email,
    isAdmin: payload.isAdmin,
  }

  return handler(request, user)
}

/**
 * Enhanced middleware that combines authentication with request body validation
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withValidatedAuth(request, createBottleSchema, async (_req, user, data) => {
 *     // data is fully typed and validated
 *     const bottle = await prisma.bottle.create({ data })
 *     return NextResponse.json(bottle)
 *   })
 * }
 */
export async function withValidatedAuth<TInput>(
  request: NextRequest,
  schema: z.ZodSchema<TInput>,
  handler: (request: NextRequest, user: AuthenticatedUser, data: TInput) => Promise<NextResponse>,
): Promise<NextResponse> {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const validatedData = schema.parse(body)

      return handler(req, user, validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }
  })
}

/**
 * Middleware for validating request body without authentication
 * Useful for public endpoints like login/signup
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withValidation(request, loginSchema, async (_req, data) => {
 *     // data is fully typed and validated
 *     const user = await authenticateUser(data.email, data.password)
 *     return NextResponse.json(user)
 *   })
 * }
 */
export async function withValidation<TInput>(
  request: NextRequest,
  schema: z.ZodSchema<TInput>,
  handler: (request: NextRequest, data: TInput) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)

    return handler(request, validatedData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    throw error
  }
}

/**
 * Validates URL query parameters
 *
 * @example
 * const { searchParams } = new URL(req.url)
 * const validated = validateQuery(searchParams, journalIdQuerySchema)
 * if (!validated.success) {
 *   return NextResponse.json({ error: validated.error }, { status: 400 })
 * }
 * const { id } = validated.data
 */
export function validateQuery<TInput>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<TInput>,
): { success: true; data: TInput } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries())
    const validatedData = schema.parse(params)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      }
    }
    return { success: false, error: 'Invalid query parameters' }
  }
}
