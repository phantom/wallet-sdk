/**
 * Amount parsing utility functions
 */

/**
 * Parses an amount string in base units (atomic units)
 * @param amount - The amount string to parse (must be a non-negative integer)
 * @returns The amount as a bigint
 * @throws Error if the amount is not a valid non-negative integer string
 */
export function parseBaseUnitAmount(amount: string): bigint {
  if (!/^\d+$/.test(amount)) {
    throw new Error("amount must be a non-negative integer string when amountUnit is 'base'");
  }

  return BigInt(amount);
}

/**
 * Parses an amount string in UI units (human-readable units) and converts to base units
 * @param amount - The amount string to parse (e.g., "0.5" or "1000")
 * @param decimals - The number of decimal places for the token
 * @returns The amount in base units as a bigint
 * @throws Error if the amount format is invalid or has too many decimal places
 */
export function parseUiAmount(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("amount must be a non-negative decimal string");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("decimals must be a non-negative integer");
  }

  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error(`amount has too many decimal places for token decimals (${decimals})`);
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "") || "0";

  return BigInt(combined);
}

/**
 * Validates that an amount is positive (greater than zero)
 * @param amount - The amount to validate
 * @throws Error if the amount is not greater than zero
 */
export function requirePositiveAmount(amount: bigint): void {
  if (amount <= 0n) {
    throw new Error("amount must be greater than 0");
  }
}
