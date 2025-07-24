/**
 * Browser-compatible base64url encoding/decoding utilities
 */

export function base64urlEncode(data: string | Uint8Array | ArrayLike<number>): string {
  let base64: string;
  
  if (typeof data === 'string') {
    // Convert string to base64
    base64 = btoa(data);
  } else {
    // Convert Uint8Array or ArrayLike to base64
    base64 = btoa(String.fromCharCode(...Array.from(data)));
  }
  
  // Convert base64 to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + (4 - str.length % 4) % 4, '=');
  
  // Decode base64 to binary string
  const binaryString = atob(base64);
  
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

export function base64urlDecodeToString(str: string): string {
  const bytes = base64urlDecode(str);
  return new TextDecoder().decode(bytes);
}

export function stringToBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64urlEncode(bytes);
}