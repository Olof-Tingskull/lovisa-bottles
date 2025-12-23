/**
 * Client-side encryption utilities using Web Crypto API (AES-GCM)
 * Journal entries are encrypted before being sent to the server
 * Only the user with the password can decrypt them
 */

function ensureCryptoAvailable() {
  if (typeof window === 'undefined') {
    throw new Error('Encryption is only available in the browser')
  }
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available. Please use HTTPS or localhost.')
  }
}

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  ensureCryptoAvailable()
  const encoder = new TextEncoder()
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(text: string, password: string): Promise<string> {
  ensureCryptoAvailable()
  const encoder = new TextEncoder()
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(password, salt)
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(text)
  )

  // Combine salt + iv + encrypted content
  const encryptedBytes = new Uint8Array(encryptedContent)
  const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(encryptedBytes, salt.length + iv.length)

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined))
}

export async function decryptText(encryptedData: string, password: string): Promise<string> {
  ensureCryptoAvailable()
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // Extract salt, iv, and encrypted content
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encryptedContent = combined.slice(28)

    const key = await deriveKey(password, salt)
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
  } catch (error) {
    throw new Error('Decryption failed - wrong password or corrupted data')
  }
}
