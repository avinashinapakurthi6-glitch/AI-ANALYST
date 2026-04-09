import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Detect PII in data
 */
export function detectPII(data: Record<string, any>): string[] {
  const piiPatterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    phone: /(\d{3}[-.\s]??\d{3}[-.\s]??\d{4}|\(\d{3}\)\s*\d{3}[-.\s]??\d{4}|\d{10})/,
    ssn: /\d{3}-\d{2}-\d{4}/,
    creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/,
  };

  const piiKeywords = ['name', 'email', 'phone', 'address', 'ssn', 'card', 'salary', 'birth', 'password', 'token', 'secret'];
  const detectedColumns: string[] = [];

  for (const [column, value] of Object.entries(data)) {
    const columnLower = column.toLowerCase();
    
    // Check column name
    if (piiKeywords.some(keyword => columnLower.includes(keyword))) {
      detectedColumns.push(column);
      continue;
    }

    // Check content
    if (value && typeof value === 'string') {
      for (const pattern of Object.values(piiPatterns)) {
        if (pattern.test(value)) {
          detectedColumns.push(column);
          break;
        }
      }
    }
  }

  return Array.from(new Set(detectedColumns));
}

/**
 * Anonymize sensitive data
 */
export function anonymizeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  return crypto.createHash('sha256').update(String(value)).digest('hex').substring(0, 16);
}
