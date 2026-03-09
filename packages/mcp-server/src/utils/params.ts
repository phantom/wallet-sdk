/**
 * Generic parameter parsing helpers for MCP tools.
 */

/**
 * Parse an optional non-negative integer from unknown input.
 *
 * Accepts numbers directly and numeric strings such as "0".
 * Returns undefined for null/undefined.
 */
export function parseOptionalNonNegativeInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  let parsed: number;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`${fieldName} must be a non-negative integer`);
    }
    parsed = Number(trimmed);
  } else {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsed;
}
