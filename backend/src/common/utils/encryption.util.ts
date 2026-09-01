import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'cherp_master_encryption_secret_key_32bytes'
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts sensitive string using AES-256-GCM
 */
export function encryptText(text: string): string {
  if (!text) return text
  if (text.startsWith('enc:')) return text // Already encrypted

  const iv = crypto.randomBytes(12)
  const key = getSecretKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag().toString('hex')
  return `enc:${iv.toString('hex')}:${encrypted}:${tag}`
}

/**
 * Decrypts string encrypted with AES-256-GCM.
 * If text is not prefixed with `enc:`, returns text as is (graceful fallback).
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText || !encryptedText.startsWith('enc:')) {
    return encryptedText
  }

  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 4) return encryptedText

    const iv = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const tag = Buffer.from(parts[3], 'hex')
    const key = getSecretKey()

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (err) {
    // If decryption fails, return original value
    return encryptedText
  }
}
