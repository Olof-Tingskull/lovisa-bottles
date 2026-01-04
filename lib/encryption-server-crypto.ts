import crypto from 'crypto'

/**
 * Server-side encryption/decryption utilities using Node.js crypto
 * Used to encrypt journal entries before storing in database
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const SALT = process.env.ENCRYPTION_SALT || 'lovisa-bottles-encryption-salt-change-this'
const ITERATIONS = 100000
const KEY_LENGTH = 32

/**
 * Derives an encryption key from a password using PBKDF2
 */
export function deriveEncryptionKey(password: string): string {
  const key = crypto.pbkdf2Sync(password, SALT, ITERATIONS, KEY_LENGTH, 'sha256')
  return key.toString('base64')
}

/**
 * Encrypts text using the provided base64 encryption key
 * Used on the server to encrypt journal entries before database storage
 *
 * @param text - The plaintext to encrypt
 * @param base64Key - The base64-encoded encryption key
 * @returns Base64-encoded encrypted data (includes IV and auth tag)
 */
export function encryptTextServer(text: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64')
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // Combine: iv + authTag + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted])

  return combined.toString('base64')
}

/**
 * Decrypts text using the provided base64 encryption key
 * Used on the server for emergency decryption if needed
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @param base64Key - The base64-encoded encryption key
 * @returns The decrypted plaintext
 */
export function decryptTextServer(encryptedData: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64')
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract: iv + authTag + encrypted
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}
