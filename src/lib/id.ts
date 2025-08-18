import { randomBytes } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateUUID(): string {
  const bytes = randomBytes(16);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = bytes.toString('hex');
  
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}