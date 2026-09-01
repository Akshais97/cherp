import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || 'cherp-erp-ad-platform-secret-key-2026')
  .digest()

export function encryptSecret(text: string): string {
  if (!text) return text
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) return cipherText
  try {
    const parts = cipherText.split(':')
    if (parts.length !== 3) return cipherText
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    return cipherText
  }
}
