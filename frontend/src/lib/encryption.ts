// Secret key for encryption (should be same on both client and server)
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

/**
 * Simple base64 encoding/decoding with XOR encryption
 * UTF-8 safe version
 */

function utf8ToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      const code2 = str.charCodeAt(i);
      const codePoint = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return bytes;
}

function bytesToUtf8(bytes: number[]): string {
  let str = '';
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    if (byte1 < 0x80) {
      str += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc0 && byte1 < 0xe0) {
      const byte2 = bytes[i++];
      str += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 >= 0xe0 && byte1 < 0xf0) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      str += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      const byte4 = bytes[i++];
      const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
      const adjusted = codePoint - 0x10000;
      str += String.fromCharCode(0xd800 | (adjusted >> 10), 0xdc00 | (adjusted & 0x3ff));
    }
  }
  return str;
}

function xorEncrypt(bytes: number[], key: string): number[] {
  const keyBytes = utf8ToBytes(key);
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    result.push(bytes[i] ^ keyBytes[i % keyBytes.length]);
  }
  return result;
}

function base64EncodeBytes(bytes: number[]): string {
  const binary = String.fromCharCode(...bytes);
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

function base64DecodeBytes(str: string): number[] {
  let binary: string;
  if (typeof atob !== 'undefined') {
    binary = atob(str);
  } else {
    binary = Buffer.from(str, 'base64').toString('binary');
  }
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  return bytes;
}

/**
 * Encrypt data using XOR + Base64 (UTF-8 safe)
 */
export function encryptData(data: any): string {
  const jsonString = JSON.stringify(data);
  const bytes = utf8ToBytes(jsonString);
  const encrypted = xorEncrypt(bytes, SECRET_KEY);
  return base64EncodeBytes(encrypted);
}

/**
 * Decrypt data using XOR + Base64 (UTF-8 safe)
 */
export function decryptData(encryptedData: string): any {
  try {
    const encrypted = base64DecodeBytes(encryptedData);
    const bytes = xorEncrypt(encrypted, SECRET_KEY);
    const jsonString = bytesToUtf8(bytes);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate obfuscated endpoint ID using simple hash
 */
export function generateEndpointId(endpoint: string): string {
  const str = endpoint + SECRET_KEY;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Verify endpoint ID
 */
export function verifyEndpointId(endpoint: string, id: string): boolean {
  return generateEndpointId(endpoint) === id;
}
