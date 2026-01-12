import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 64
const KEY_LENGTH = 32

/**
 * Get encryption key from environment variable
 * IMPORTANT: Set ENCRYPTION_KEY in your .env.local (32+ character random string)
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set')
    }
    // Derive a consistent 32-byte key using scrypt
    return crypto.scryptSync(key, 'chronosnap-salt', KEY_LENGTH)
}

/**
 * Encrypt sensitive data
 * Returns base64 encoded string: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return ''

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine IV + AuthTag + Encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt sensitive data
 * Expects base64 encoded string: iv:authTag:encryptedData
 */
export function decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) return ''

    try {
        const key = getEncryptionKey()
        const [ivBase64, authTagBase64, encryptedData] = ciphertext.split(':')

        if (!ivBase64 || !authTagBase64 || !encryptedData) {
            console.error('Invalid encrypted data format')
            return ''
        }

        const iv = Buffer.from(ivBase64, 'base64')
        const authTag = Buffer.from(authTagBase64, 'base64')

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    } catch (error) {
        console.error('Decryption failed:', error)
        return ''
    }
}

/**
 * Mask bank account number for display
 * Shows only last 4 digits: ****1234
 */
export function maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return '****'
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
}

/**
 * Encrypt bank information object
 */
export function encryptBankInfo(bankInfo: {
    bank_name?: string
    bank_account_number?: string
    bank_account_holder?: string
}): {
    bank_name: string
    bank_account_number_encrypted: string
    bank_account_holder_encrypted: string
    bank_account_last4: string
} {
    return {
        bank_name: bankInfo.bank_name || '',
        bank_account_number_encrypted: bankInfo.bank_account_number ? encrypt(bankInfo.bank_account_number) : '',
        bank_account_holder_encrypted: bankInfo.bank_account_holder ? encrypt(bankInfo.bank_account_holder) : '',
        bank_account_last4: bankInfo.bank_account_number ? bankInfo.bank_account_number.slice(-4) : '',
    }
}

/**
 * Decrypt bank information object
 */
export function decryptBankInfo(encryptedInfo: {
    bank_name?: string
    bank_account_number_encrypted?: string
    bank_account_holder_encrypted?: string
}): {
    bank_name: string
    bank_account_number: string
    bank_account_holder: string
} {
    return {
        bank_name: encryptedInfo.bank_name || '',
        bank_account_number: encryptedInfo.bank_account_number_encrypted
            ? decrypt(encryptedInfo.bank_account_number_encrypted)
            : '',
        bank_account_holder: encryptedInfo.bank_account_holder_encrypted
            ? decrypt(encryptedInfo.bank_account_holder_encrypted)
            : '',
    }
}
