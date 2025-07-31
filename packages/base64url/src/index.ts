/**
 * Isomorphic base64url encoding/decoding utilities
 * Works in both browser and Node.js environments
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined" && typeof window.btoa !== "undefined";

/**
 * Encode data to base64url format
 * @param data - String, Uint8Array, or ArrayLike data to encode
 * @returns base64url encoded string
 */
export function base64urlEncode(data: string | Uint8Array | ArrayLike<number>): string {
  let base64: string;

  if (isBrowser) {
    // Browser environment using btoa
    if (typeof data === "string") {
      base64 = btoa(data);
    } else {
      // Convert Uint8Array or ArrayLike to string
      base64 = btoa(String.fromCharCode(...Array.from(data)));
    }
  } else {
    // Node.js environment using Buffer
    if (typeof data === "string") {
      base64 = Buffer.from(data, "utf8").toString("base64");
    } else {
      base64 = Buffer.from(data).toString("base64");
    }
  }

  // Convert base64 to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode base64url string to Uint8Array
 * @param str - base64url encoded string
 * @returns decoded Uint8Array
 */
export function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");

  if (isBrowser) {
    // Browser environment using atob
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } else {
    // Node.js environment using Buffer
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
}

/**
 * Decode base64url string to UTF-8 string
 * @param str - base64url encoded string
 * @returns decoded UTF-8 string
 */
export function base64urlDecodeToString(str: string): string {
  const bytes = base64urlDecode(str);

  if (isBrowser && typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  } else if (!isBrowser) {
    // Node.js environment
    return Buffer.from(bytes).toString("utf8");
  } else {
    // Fallback for older browsers without TextDecoder
    return String.fromCharCode(...bytes);
  }
}

/**
 * Encode UTF-8 string to base64url format
 * @param str - UTF-8 string to encode
 * @returns base64url encoded string
 */
export function stringToBase64url(str: string): string {
  if (isBrowser && typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(str);
    return base64urlEncode(bytes);
  } else if (!isBrowser) {
    // Node.js environment
    return base64urlEncode(str);
  } else {
    // Fallback for older browsers without TextEncoder
    return base64urlEncode(str);
  }
}
