/**
 * Self-contained UUID v4 implementation for Phantom Wallet SDK
 * No external dependencies to avoid ES module compatibility issues
 */

/**
 * Generate a random UUID v4 string
 * RFC 4122 compliant UUID version 4
 * @returns A UUID v4 string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function randomUUID(): string {
  // Use crypto.randomUUID() if available (Node.js 14.17+ and modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation using Math.random()
  // This generates a RFC 4122 compliant UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random string of specified length using alphanumeric characters
 * @param length - The length of the string to generate
 * @returns A random alphanumeric string
 */
export function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
