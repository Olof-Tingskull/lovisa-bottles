import crypto from 'crypto'

/**
 * Server-side encryption key derivation
 * Derives a consistent encryption key from a user's password that will be sent to the client
 */

// Use a unique salt from environment or default
// IMPORTANT: This should be set in .env and kept secret
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || 'lovisa-bottles-encryption-salt-change-this'
const ITERATIONS = 100000
const KEY_LENGTH = 32 // 256 bits for AES-256

/**
 * Derives an encryption key from a password using PBKDF2
 * This key will be sent to the client in a secure cookie for client-side encryption
 *
 * @param password - The user's password
 * @returns Base64-encoded encryption key (safe for cookie storage)
 */
export function deriveEncryptionKey(password: string): string {
  const key = crypto.pbkdf2Sync(
    password,
    ENCRYPTION_SALT,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  )

  // Return as base64 for easy cookie storage
  return key.toString('base64')
}
