/**
 * Client-side encryption utilities using Web Crypto API (AES-GCM)
 * Journal entries are encrypted before being sent to the server
 * Uses a derived key stored in cookies (derived from password on server)
 */

function ensureCryptoAvailable() {
  if (typeof window === 'undefined') {
    throw new Error('Encryption is only available in the browser')
  }
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or localhost.')
  }
}

/**
 * Gets the encryption key from cookies
 * The key is derived from the user's password on the server and stored in a cookie
 */
function getEncryptionKeyFromCookie(): string {
  if (typeof document === 'undefined') {
    throw new Error('Cannot access cookies outside of browser')
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'encryptionKey') {
      return decodeURIComponent(value)
    }
  }

  throw new Error('Encryption key not found. Please log in again.')
}

/**
 * Imports the base64-encoded encryption key as a CryptoKey for use with Web Crypto API
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  ensureCryptoAvailable()

  // Convert base64 to raw bytes
  const keyData = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0))

  return window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts text using the encryption key from cookies
 * @param text - The plaintext to encrypt
 * @returns Base64-encoded encrypted data (includes IV)
 */
export async function encryptText(text: string): Promise<string> {
  ensureCryptoAvailable()

  const base64Key = getEncryptionKeyFromCookie()
  const key = await importKey(base64Key)

  const encoder = new TextEncoder()
  const iv = window.crypto.getRandomValues(new Uint8Array(12)) // 12 bytes for AES-GCM

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(text)
  )

  // Combine iv + encrypted content
  const encryptedBytes = new Uint8Array(encryptedContent)
  const combined = new Uint8Array(iv.length + encryptedBytes.length)
  combined.set(iv, 0)
  combined.set(encryptedBytes, iv.length)

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts text using the encryption key from cookies
 * @param encryptedData - Base64-encoded encrypted data
 * @returns The decrypted plaintext
 */
export async function decryptText(encryptedData: string): Promise<string> {
  ensureCryptoAvailable()

  try {
    const base64Key = getEncryptionKeyFromCookie()
    const key = await importKey(base64Key)

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // Extract iv and encrypted content
    const iv = combined.slice(0, 12)
    const encryptedContent = combined.slice(12)

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedContent
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedContent)
  } catch (_error) {
    throw new Error('Decryption failed - corrupted data or invalid key')
  }
}
