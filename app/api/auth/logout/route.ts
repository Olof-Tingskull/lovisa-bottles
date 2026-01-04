import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear the token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })

  // Clear the encryption key cookie
  response.cookies.set('encryptionKey', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })

  return response
}
